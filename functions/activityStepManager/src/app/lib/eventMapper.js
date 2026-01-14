let moment = require("moment-business-days-it");
moment = require("moment-timezone");
const {
  getNotification,
  TABLES,
  getTimelineElements,
  getLatestReworkedTimelineElement,
} = require("./repository");
const { parseKinesisObjToJsonObj, initTtlSlaTimes } = require("./utils");

const allowedTimelineCategories = [
  "REQUEST_ACCEPTED",
  "REQUEST_REFUSED",
  "REFINEMENT",
  "NOTIFICATION_VIEWED",
  "NOTIFICATION_CANCELLED",
  "SEND_DIGITAL_DOMICILE", // the category is SEND_DIGITAL_DOMICILE: in the timelineElementId is SEND_DIGITAL + changed SENTATTEMPTMADE to ATTEMPT + added REPEAT_false / REPEAT_true
  "SEND_DIGITAL_FEEDBACK", // changed SENTATTEMPTMADE to ATTEMPT
  "SEND_ANALOG_DOMICILE", // changed SENTATTEMPTMADE to ATTEMPT
  "SEND_ANALOG_FEEDBACK", // changed SENTATTEMPTMADE to ATTEMPT
  "DIGITAL_FAILURE_WORKFLOW",
  "SEND_SIMPLE_REGISTERED_LETTER",
  "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS",
  "ANALOG_WORKFLOW_RECIPIENT_DECEASED",
  "NOTIFICATION_TIMELINE_REWORKED",
];

const ttlSlaTimes = initTtlSlaTimes();

function calculateNextDate(startTS, days) {
  if (days < 1) {
    const minutes = 24 * 60 * days;
    const date = moment(startTS).add(minutes, "minutes");
    if (date.isBusinessDay()) return date.toISOString();
    return date.nextBusinessDay().toISOString();
  } else {
    const date = moment(startTS).businessAdd(days);
    return date.toISOString();
  }
}

function extractRecIdsFromTimelineId(timelineElementId) {
  const match = timelineElementId.match(/RECINDEX_(\d+)(?:\.|$)/);
  return match ? match[1] : null;
  // Handles both RECINDEX_0 and RECINDEX_0.REWORK
}

function extractRecIdsFromTimelineIdOnRework(timelineElementId) {
  const match = timelineElementId.match(/RECINDEX_(\d+)/);
  return match ? match[1] : null;
}

function makeDeleteOp(id, type, event) {
  const op = {
    type: type,
    id: id,
    relatedEntityId: event.dynamodb.NewImage.iun.S,
    opType: "DELETE",
    kinesisSeqNumber: event.kinesisSeqNumber,
  };

  return op;
}

function makeInsertOp(
  id,
  type,
  event,
  timestampFieldName,
  alarmDays,
  alarmExpiration
) {
  if (!event.dynamodb.NewImage[timestampFieldName]) {
    console.log("Missing timestamp " + timestampFieldName, {
      event: JSON.stringify(event),
    });
    return null;
  }

  const alarmTTL = calculateNextDate(
    event.dynamodb.NewImage[timestampFieldName].S,
    alarmDays
  );
  const slaExpiration = calculateNextDate(
    event.dynamodb.NewImage[timestampFieldName].S,
    alarmExpiration
  );
  const step_alarmTTL = new Date(alarmTTL).getTime();
  const op = {
    type: type,
    id: id,
    relatedEntityId: event.dynamodb.NewImage.iun.S,
    startTimestamp: event.dynamodb.NewImage[timestampFieldName].S,
    slaExpiration: slaExpiration,
    step_alarmTTL: Math.floor(step_alarmTTL / 1000),
    alarmTTL: alarmTTL,
    opType: "INSERT",
    kinesisSeqNumber: event.kinesisSeqNumber,
  };

  return op;
}

function makeBulkInsertOp(event, payload, opType = "BULK_INSERT_INVOICES") {
  if (!payload || payload.length === 0) {
    console.log("Missing payload", {
      event: JSON.stringify(event),
    });
    return null;
  }
  const op = {
    payload,
    opType,
  };
  return op;
}

function processInvoicedElement(timelineObj, passedInvoicingTimestamp) {
  // timestamp format 2023-02-16T09:16:07.712247798Z
  //
  // if invoicingTimestamp is defined use it, otherwise take it from timelineObj
  const timestamp = passedInvoicingTimestamp ?? timelineObj.timestamp;
  const invoincingTimestampMs = moment(timestamp).valueOf(); // milliseconds
  const invoincingTimestamp = moment(invoincingTimestampMs).toISOString(); // ISO string 8601
  const invoicingDay = moment(invoincingTimestamp)
    .tz("Europe/Rome")
    .format("YYYY-MM-DD");
  const paId = timelineObj.paId;
  // ttl = invoicingTimestamp + 1 year default (in seconds)
  const days = ttlSlaTimes.INVOICING_TTL_DAYS; // default 365
  const ttl = Math.floor(
    moment(invoincingTimestamp).add(days, "days").valueOf() / 1000
  );
  return {
    paId_invoicingDay: `${paId}_${invoicingDay}`,
    invoincingTimestamp_timelineElementId: `${invoincingTimestamp}_${timelineObj.timelineElementId}`, // typo but left (it's also sort key for the primary key)
    ttl,
    paId,
    invoicingDay,
    invoincingTimestamp, // typo, but left
    ...timelineObj,
  };
}

// recIdxs is an array of recipient indexes
async function processInvoice(event, recIdxs) {
  console.log("Processing data for invoice...");
  const invoicedElements = [];
  const timelineObj = parseKinesisObjToJsonObj(event.dynamodb.NewImage);
  // get notificationCost from event
  // if notificationCost is defined go to the next step
  const notificationCost = timelineObj.details
    ? timelineObj.details.notificationCost
    : null;
  if (notificationCost !== undefined && notificationCost !== null) {
    const invoicedElement = processInvoicedElement(timelineObj);
    if (invoicedElement) {
      invoicedElements.push(invoicedElement);

      // REQUEST_REFUSED has recIdxs null
      // REFINEMENT/NOTIFICATION_VIEWED have an array with one recIdxs
      // NOTIFICATION_CANCELLED has an array with recIdxs
      if (recIdxs !== null) {
        for (let recIdx of recIdxs) {
          const iun = timelineObj.iun;
          const reworkedTimelineElement = await getLatestReworkedTimelineElement(event.dynamodb.NewImage.iun.S, "NOTIFICATION_TIMELINE_REWORKED.IUN_" + event.dynamodb.NewImage.iun.S + ".RECINDEX_" + recIdx);
          if(reworkedTimelineElement){
            console.log("Found reworked timeline element for iun " + iun + " and recIdx " + recIdx);
            await evaluateNotificationReworkAndAdjustInvoicing(iun, recIdx, invoicedElements, reworkedTimelineElement, invoicedElement.invoincingTimestamp);
          }else{
            // get SEND_ANALOG_DOMICILE and SEND_SIMPLE_REGISTERED_LETTER for the same iun and recipientIndex
            const timelineElements = await getTimelineElements(iun, [
            `SEND_ANALOG_DOMICILE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_0`,
            `SEND_ANALOG_DOMICILE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_1`,
            `SEND_SIMPLE_REGISTERED_LETTER.IUN_${iun}.RECINDEX_${recIdx}`,
            ]);
            if (timelineElements && timelineElements.length > 0) {
              for (const timelineElem of timelineElements) {
                invoicedElements.push(
                  processInvoicedElement(
                    timelineElem,
                    // we don't want the timestamp of the timelineElem, but the one of the timelineObj (the one the perfectionated the notification and started the invoice process)
                    invoicedElement.invoincingTimestamp // typo, but left
                  )
                );
              }
            }
          }
        }
      }
    } // if invoicedElement
  return invoicedElements;
}
}

async function evaluateNotificationReworkAndAdjustInvoicing(iun, recIdx, invoicedElements, reworkedTimelineElement, invoicingTimestamp) {
    const reworkElementDetails = reworkedTimelineElement.details;
    if(reworkElementDetails.sentAttemptMade == 0 && !checkIfSendAnalogDomicileIsInvalidated(reworkElementDetails.invalidatedTimelineAndStatusHistory)) {
        const timelineElements = await getTimelineElements(iun, [
            `SEND_ANALOG_DOMICILE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_1`,
        ]);
        if (timelineElements && timelineElements.length > 0) {
              const newElements = timelineElements.map(elem => ({
                        ...processInvoicedElement(elem, invoicingTimestamp),
                        invoicingType: 'NEW'
                      }));
              invoicedElements.push(...newElements);
        }
    }
     const length = invoicedElements.length;
     const elementsToAdd = [];
     for (let i = 0; i < length; i++) {
            const element = invoicedElements[i];
            const sk = element.invoincingTimestamp_timelineElementId;
            if (sk.includes('REFINEMENT') || sk.includes('ANALOG_WORKFLOW_RECIPIENT_DECEASED') || sk.includes('NOTIFICATION_VIEWED')) {
              element.invoicingType = 'NEW';
            } else if (sk.includes('NOTIFICATION_CANCELLED')) {
              const duplicatedElement = { ...element, invoicingType: 'NEW' };
              elementsToAdd.push(duplicatedElement);
            }
        }
     invoicedElements.push(...elementsToAdd);
    return invoicedElements;
}

function checkIfSendAnalogDomicileIsInvalidated(invalidatedTimelineAndStatusHistory){
    let relatedTimelineElementIds = [];
    if (invalidatedTimelineAndStatusHistory && invalidatedTimelineAndStatusHistory.length > 0) {
        for (const invalidatedElement of invalidatedTimelineAndStatusHistory) {
            relatedTimelineElementIds.push(...invalidatedElement.relatedTimelineElements);
        }
    }
    return relatedTimelineElementIds.some(id => id.startsWith("SEND_ANALOG_DOMICILE"));
}

async function processInvalidatedInvoice(iun, timelineElementIds, reworkedTimestamp) {
  console.log("Processing data for invalidated invoice...");

  // Recupera tutti gli elementi timeline
  const timelineElements = await getTimelineElements(iun, timelineElementIds);
  if (!timelineElements?.length) {
    return [];
  }

  // Processa gli elementi filtrando per categoria
  return timelineElements
    .filter(elem => shouldProcessElement(elem))
    .map(elem => ({
          ...processInvoicedElement(elem, reworkedTimestamp),
          invoicingType: 'INVALIDATED'
        }));
}

function shouldProcessElement(timelineElem) {
  const { category, details } = timelineElem;

  // Categorie speciali richiedono notificationCost definito
  const requiresCost = category === "REFINEMENT" ||   category === "ANALOG_WORKFLOW_RECIPIENT_DECEASED";

  if (requiresCost) {
    return details?.notificationCost != null;
  }
  return true;
}

async function mapPayload(event) {
  const dynamoDbOps = [];
  /* istanbul ignore else */
  if (event.tableName == TABLES.NOTIFICATIONS) {
    const op = makeInsertOp(
      "00_VALID##" + event.dynamodb.NewImage.iun.S,
      "VALIDATION",
      event,
      "sentAt",
      ttlSlaTimes.ALARM_TTL_VALIDATION, // default 0.5
      ttlSlaTimes.SLA_EXPIRATION_VALIDATION // default 1
    );
    if (op) dynamoDbOps.push(op);
  } else if (event.tableName == TABLES.TIMELINES) {
    let op, recIdx;
    const category = event.dynamodb.NewImage.category.S;
    switch (category) {
      case "REQUEST_ACCEPTED": {
        op = makeDeleteOp(
          "00_VALID##" + event.dynamodb.NewImage.iun.S,
          "VALIDATION",
          event
        );
        dynamoDbOps.push(op);

        // read from dynamodb pn-Notifications by IUN -> recipientsCount

        // recipient
        const notification = await getNotification(
          event.dynamodb.NewImage.iun.S
        );
        if (notification?.recipients) {
          const recipientsCount = notification.recipients.length;

          for (let i = 0; i < recipientsCount; i++) {
            const op1 = makeInsertOp(
              "01_REFIN##" + event.dynamodb.NewImage.iun.S + "##" + i, // 01_REFIN##UYPE-JQKY-QXWL-202307-D-1##0
              "REFINEMENT",
              event,
              "notificationSentAt",
              ttlSlaTimes.ALARM_TTL_REFINEMENT, // default 110
              ttlSlaTimes.SLA_EXPIRATION_REFINEMENT // default 120
            );
            dynamoDbOps.push(op1);
          }
        }

        break;
      }
      case "REQUEST_REFUSED": {
        op = makeDeleteOp(
          "00_VALID##" + event.dynamodb.NewImage.iun.S, // 00_VALID##NYQU-XMEH-JRMH-202311-T-1
          "VALIDATION",
          event
        );
        dynamoDbOps.push(op);
        // PN-4564 - process invoice data
        const invoicedElementsRefused = await processInvoice(event, null);
        const bulkOpRefused = makeBulkInsertOp(event, invoicedElementsRefused);
        if (bulkOpRefused) {
          dynamoDbOps.push(bulkOpRefused);
        }
        break;
      }
      case "REFINEMENT":
      case "ANALOG_WORKFLOW_RECIPIENT_DECEASED":
      case "NOTIFICATION_VIEWED": {
        recIdx = extractRecIdsFromTimelineId(
          event.dynamodb.NewImage.timelineElementId.S
        );
        op = makeDeleteOp(
          "01_REFIN##" + event.dynamodb.NewImage.iun.S + "##" + recIdx,
          "REFINEMENT", // used for creating the key later, in repository.js, so it will always be REFINEMENT, not category
          event
        );
        dynamoDbOps.push(op);

        // PN-4564 - process invoice data
        const invoicedElements = await processInvoice(event, [recIdx]);
        if(invoicedElements && invoicedElements.length > 0){
          const newInvoices = invoicedElements.filter(elem => elem.invoicingType && elem.invoicingType === 'NEW');
          const standardInvoices = invoicedElements.filter(elem => !elem.invoicingType || elem.invoicingType !== 'NEW');
          if (standardInvoices.length > 0) {
            const bulkOp = makeBulkInsertOp(event, standardInvoices);
            dynamoDbOps.push(bulkOp);
          }
          if(newInvoices.length > 0){
            const bulkReworkedOp = makeBulkInsertOp(event,newInvoices,"BULK_INSERT_REWORKED_INVOICES");
            dynamoDbOps.push(bulkReworkedOp);
          }
        }

        // PN-8703 - close all possible SEND_PEC steps for the specific recipient
        //
        // the deletion attempts where the key is not found end gracefully
        if (category === "NOTIFICATION_VIEWED") {
          // 02_PEC__##SEND_DIGITAL.IUN_JGZP-HLEV-ZGAE-202306-U-1.RECINDEX_0.SOURCE_PLATFORM.REPEAT_false.ATTEMPT_0
          // SOURCE_GENERAL
          // SOURCE_SPECIAL
          //
          // ATTEMPT_0-1
          const sources = [
            "SOURCE_GENERAL",
            "SOURCE_SPECIAL",
            "SOURCE_PLATFORM",
          ];
          const repeat = ["REPEAT_false", "REPEAT_true"];
          const attempts = ["ATTEMPT_0", "ATTEMPT_1"];

          // 12 combinations
          for (const source of sources) {
            for (const rep of repeat) {
              for (const attempt of attempts) {
                const op = makeDeleteOp(
                  `02_PEC__##SEND_DIGITAL.IUN_${event.dynamodb.NewImage.iun.S}.RECINDEX_${recIdx}.${source}.${rep}.${attempt}`,
                  "SEND_PEC",
                  event
                );
                dynamoDbOps.push(op); // SOURCE_SPECIAL should actually only have REPEAT_false, but we generalized the code
              }
            }
          }
        }

        break;
      }
      case "NOTIFICATION_CANCELLED": {
        // PN-7522 - close validation and all refinements
        // close validation (if still open)
        op = makeDeleteOp(
          "00_VALID##" + event.dynamodb.NewImage.iun.S,
          "VALIDATION",
          event
        );
        dynamoDbOps.push(op);
        // close all refinements
        let recIdxs =
          event.dynamodb.NewImage.details?.M?.notRefinedRecipientIndexes?.L ??
          null; // List of indexes (numbers expressed as strings) of non perfectionated recipients
        let cleanRecIdxs = [];
        if (recIdxs) {
          for (const recIdx of recIdxs) {
            cleanRecIdxs.push(recIdx.N);
            op = makeDeleteOp(
              "01_REFIN##" + event.dynamodb.NewImage.iun.S + "##" + recIdx.N,
              "REFINEMENT",
              event
            );
            dynamoDbOps.push(op);
          }
        }
        // PN-7521 - process invoice data
        const invoicedElementsCancelled = await processInvoice(
          event,
          cleanRecIdxs
        );
        if(invoicedElementsCancelled && invoicedElementsCancelled.length > 0){
          const newInvoices = invoicedElementsCancelled.filter(elem => elem.invoicingType && elem.invoicingType === 'NEW');
          const standardInvoices = invoicedElementsCancelled.filter(elem => !elem.invoicingType || elem.invoicingType !== 'NEW');
          const bulkOpCancelled = makeBulkInsertOp(event, standardInvoices);
          const bulkReworkedOp = makeBulkInsertOp(event,newInvoices,"BULK_INSERT_REWORKED_INVOICES");
          if (bulkOpCancelled) {
            dynamoDbOps.push(bulkOpCancelled);
          }
          if(bulkReworkedOp){
            dynamoDbOps.push(bulkReworkedOp);
          }
        }
        break;
      }
      case "SEND_DIGITAL_DOMICILE":
        op = makeInsertOp(
          "02_PEC__##" + event.dynamodb.NewImage.timelineElementId.S, // 02_PEC__##SEND_DIGITAL.IUN_JGZP-HLEV-ZGAE-202306-U-1.RECINDEX_0.SOURCE_PLATFORM.REPEAT_false.ATTEMPT_0
          "SEND_PEC",
          event,
          "timestamp",
          ttlSlaTimes.ALARM_TTL_SEND_PEC, // default 2
          ttlSlaTimes.SLA_EXPIRATION_SEND_PEC // default 2
        );
        dynamoDbOps.push(op);
        break;
      case "SEND_DIGITAL_FEEDBACK":
        const sendDigitalDomicileTimelineElementId = event.dynamodb.NewImage.timelineElementId.S.replace("SEND_DIGITAL_FEEDBACK", "SEND_DIGITAL_DOMICILE");
        op = makeDeleteOp(
          "02_PEC__##" + sendDigitalDomicileTimelineElementId,
          "SEND_PEC",
          event
        );
        dynamoDbOps.push(op);
        break;
      case "SEND_ANALOG_DOMICILE":
        op = makeInsertOp(
          "03_PAPER##" + event.dynamodb.NewImage.timelineElementId.S, // 03_PAPER##SEND_ANALOG_DOMICILE.IUN_VDML-NVZG-ZEXR-202307-T-1.RECINDEX_0.ATTEMPT_0
          "SEND_PAPER_AR_890",
          event,
          "timestamp",
          ttlSlaTimes.ALARM_TTL_SEND_PAPER_AR_890, // default 100
          ttlSlaTimes.SLA_EXPIRATION_SEND_PAPER_AR_890 // default 100
        );
        dynamoDbOps.push(op);
        break;
      case "SEND_ANALOG_FEEDBACK":
        const sendAnalogDomicileTimelineElementId = event.dynamodb.NewImage.timelineElementId.S.replace("SEND_ANALOG_FEEDBACK", "SEND_ANALOG_DOMICILE");
        op = makeDeleteOp(
          "03_PAPER##" + sendAnalogDomicileTimelineElementId,
          "SEND_PAPER_AR_890",
          event
        );
        dynamoDbOps.push(op);
        break;
      //case "DIGITAL_FAILURE_WORKFLOW": // DIGITAL_FAILURE_WORKFLOW is immediately followed by SEND_SIMPLE_REGISTERED_LETTER, so we ignore the first one as beginning of event
      case "SEND_SIMPLE_REGISTERED_LETTER":
        recIdx = event.dynamodb.NewImage.details.M.recIndex.N; // "04_AMR##MYQH-TDYJ-KMNG-202310-H-1##0"
        op = makeInsertOp(
          "04_AMR##" + event.dynamodb.NewImage.iun.S + "##" + recIdx,
          "SEND_AMR",
          event,
          "timestamp",
          ttlSlaTimes.ALARM_TTL_SEND_AMR, // default 2
          ttlSlaTimes.SLA_EXPIRATION_SEND_AMR // default 2
        );

        dynamoDbOps.push(op);
        break;
      case "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS":
        if (
          event.dynamodb.NewImage.details &&
          event.dynamodb.NewImage.details.M &&
          event.dynamodb.NewImage.details.M.registeredLetterCode &&
          event.dynamodb.NewImage.details.M.registeredLetterCode.S // we no longer require that event.dynamodb.NewImage.details.M.deliveryDetailCode.S === "CON080"
        ) {
          recIdx = event.dynamodb.NewImage.details.M.recIndex.N;
          op = makeDeleteOp(
            "04_AMR##" + event.dynamodb.NewImage.iun.S + "##" + recIdx,
            "SEND_AMR",
            event
          );
          dynamoDbOps.push(op);
        }
        break;
      case "NOTIFICATION_TIMELINE_REWORKED":
        const { iun, timelineElementId, timestamp: reworkedTimestamp, details } = extractDynamoDBFields(event.dynamodb.NewImage);
        recIdx = extractRecIdsFromTimelineIdOnRework(timelineElementId);
        const op1 = makeInsertOp(
          "01_REFIN##" + event.dynamodb.NewImage.iun.S + "##" + recIdx,
          "REFINEMENT",
          event,
          "timestamp",
          ttlSlaTimes.ALARM_TTL_REFINEMENT, // default 110
          ttlSlaTimes.SLA_EXPIRATION_REFINEMENT // default 120
        );
        dynamoDbOps.push(op1);
        // Estrai e filtra i timeline IDs invalidati
        const invalidatedTimelineIds = getInvalidatedInvoicingTimelineIds(details.invalidatedTimelineAndStatusHistory,iun,recIdx);
        if (invalidatedTimelineIds.length === 0) {
          break;
        }
        const invalidatedInvoicedElements = await processInvalidatedInvoice(iun,invalidatedTimelineIds,reworkedTimestamp);
        const bulkReworkedOp = makeBulkInsertOp(event,invalidatedInvoicedElements,"BULK_INSERT_REWORKED_INVOICES");
        if (bulkReworkedOp) {
          dynamoDbOps.push(bulkReworkedOp);
        }
        break;
      default:
    }
  }

  return dynamoDbOps;
}

function extractDynamoDBFields(newImage) {
  return {
    iun: newImage.iun.S,
    timelineElementId: newImage.timelineElementId.S,
    timestamp: newImage.timestamp.S,
    details: newImage.details.M
  };
}

function getInvalidatedInvoicingTimelineIds(invalidatedElements, iun, recIdx) {
  const invoicingPatterns = [
      `SEND_ANALOG_DOMICILE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_1`,
      `REFINEMENT.IUN_${iun}.RECINDEX_${recIdx}`,
      `ANALOG_WORKFLOW_RECIPIENT_DECEASED.IUN_${iun}.RECINDEX_${recIdx}`
    ];

    return invalidatedElements.L
      .flatMap(elem => {
        const relatedElements = elem.M?.relatedTimelineElements?.L || [];
        return relatedElements.map(item => item.S);
      })
      .filter(id => invoicingPatterns.includes(id));
 }

exports.mapEvents = async (events) => {
  const filteredEvents = events.filter((e) => {
    return (
      e.eventName == "INSERT" &&
      (e.tableName == TABLES.NOTIFICATIONS ||
        (e.tableName == TABLES.TIMELINES &&
          e.dynamodb.NewImage.category &&
          allowedTimelineCategories.indexOf(e.dynamodb.NewImage.category.S) >=
            0))
    );
  });

  let ops = [];
      for (let i = 0; i < filteredEvents.length; i++) {
    const dynamoDbOps = await mapPayload(filteredEvents[i]);
    ops = ops.concat(dynamoDbOps);
  }
  return ops;
};
