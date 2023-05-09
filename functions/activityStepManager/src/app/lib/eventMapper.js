let moment = require("moment-business-days-it");
moment = require("moment-timezone");
const {
  getNotification,
  TABLES,
  getTimelineElements,
} = require("./repository");
const { parseKinesisObjToJsonObj, initTtlSlaTimes } = require("./utils");

const allowedTimelineCategories = [
  "REQUEST_ACCEPTED",
  "REQUEST_REFUSED",
  "REFINEMENT",
  "NOTIFICATION_VIEWED",
  "SEND_DIGITAL", // previously: SEND_DIGITAL_DOMICILE + changed SENTATTEMPTMADE to ATTEMPT + added REPEAT_false / REPEAT_true
  "SEND_DIGITAL_FEEDBACK", // changed SENTATTEMPTMADE to ATTEMPT
  "SEND_ANALOG_DOMICILE", // changed SENTATTEMPTMADE to ATTEMPT
  "SEND_ANALOG_FEEDBACK", // changed SENTATTEMPTMADE to ATTEMPT
  "DIGITAL_FAILURE_WORKFLOW",
  "SEND_SIMPLE_REGISTERED_LETTER",
  "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS",
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
  return timelineElementId.split("RECINDEX_")[1];
  // used for REFINEMENT (refinement.IUN_123456789.RECINDEX_1)
  // or for NOTIFICATION_VIEWED (notification.viewed-IUN_123456789.RECINDEX_1)
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

function makeBulkInsertOp(event, payload) {
  if (!payload || payload.length === 0) {
    console.log("Missing payload", {
      event: JSON.stringify(event),
    });
    return null;
  }
  const op = {
    payload,
    opType: "BULK_INSERT_INVOICES",
  };
  return op;
}

function processInvoicedElement(timelineObj) {
  // timestamp format 2023-02-16T09:16:07.712247798Z
  const timestamp = timelineObj.timestamp;
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
    invoincingTimestamp_timelineElementId: `${invoincingTimestamp}_${timelineObj.timelineElementId}`,
    ttl,
    paId,
    invoicingDay,
    invoincingTimestamp,
    ...timelineObj,
  };
}

async function processInvoice(event, recIdx) {
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

      if (recIdx !== null) {
        // get SEND_ANALOG_DOMICILE and SEND_SIMPLE_REGISTERED_LETTER for the same iun and recipeintIndex
        const iun = timelineObj.iun;
        const timelineElements = await getTimelineElements(iun, [
          `SEND_ANALOG_DOMICILE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_0`,
          `SEND_ANALOG_DOMICILE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_1`,
          `SEND_SIMPLE_REGISTERED_LETTER.IUN_${iun}.RECINDEX_${recIdx}`,
        ]);
        if (timelineElements && timelineElements.length > 0) {
          for (const timelineElem of timelineElements) {
            invoicedElements.push(processInvoicedElement(timelineElem));
          }
        }
      }
    }
  }
  return invoicedElements;
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
      case "REQUEST_ACCEPTED":
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
        const recipientsCount = notification.recipients.length;
        if (notification) {
          for (let i = 0; i < recipientsCount; i++) {
            const op1 = makeInsertOp(
              "01_REFIN##" + event.dynamodb.NewImage.iun.S + "##" + i,
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
      case "REQUEST_REFUSED":
        op = makeDeleteOp(
          "00_VALID##" + event.dynamodb.NewImage.iun.S,
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
      case "REFINEMENT":
      case "NOTIFICATION_VIEWED":
        recIdx = extractRecIdsFromTimelineId(
          event.dynamodb.NewImage.timelineElementId.S
        );
        op = makeDeleteOp(
          "01_REFIN##" + event.dynamodb.NewImage.iun.S + "##" + recIdx,
          "REFINEMENT",
          event
        );
        dynamoDbOps.push(op);
        // PN-4564 - process invoice data
        const invoicedElements = await processInvoice(event, recIdx);
        const bulkOp = makeBulkInsertOp(event, invoicedElements);
        if (bulkOp) {
          dynamoDbOps.push(bulkOp);
        }
        break;
      case "SEND_DIGITAL":
        op = makeInsertOp(
          "02_PEC__##" + event.dynamodb.NewImage.timelineElementId.S,
          "SEND_PEC",
          event,
          "timestamp",
          ttlSlaTimes.ALARM_TTL_SEND_PEC, // default 2
          ttlSlaTimes.SLA_EXPIRATION_SEND_PEC // default 2
        );
        dynamoDbOps.push(op);
        break;
      case "SEND_DIGITAL_FEEDBACK":
        op = makeDeleteOp(
          "02_PEC__##" + event.dynamodb.NewImage.timelineElementId.S,
          "SEND_PEC",
          event
        );
        dynamoDbOps.push(op);
        break;
      case "SEND_ANALOG_DOMICILE":
        op = makeInsertOp(
          "03_PAPER##" + event.dynamodb.NewImage.timelineElementId.S,
          "SEND_PAPER_AR_890",
          event,
          "timestamp",
          ttlSlaTimes.ALARM_TTL_SEND_PAPER_AR_890, // default 100
          ttlSlaTimes.SLA_EXPIRATION_SEND_PAPER_AR_890 // default 100
        );
        dynamoDbOps.push(op);
        break;
      case "SEND_ANALOG_FEEDBACK":
        op = makeDeleteOp(
          "03_PAPER##" + event.dynamodb.NewImage.timelineElementId.S,
          "SEND_PAPER_AR_890",
          event
        );
        dynamoDbOps.push(op);
        break;
      //case "DIGITAL_FAILURE_WORKFLOW": // DIGITAL_FAILURE_WORKFLOW is immediately followed by SEND_SIMPLE_REGISTERED_LETTER, so we ignore the first one as beginning of event
      case "SEND_SIMPLE_REGISTERED_LETTER":
        recIdx = event.dynamodb.NewImage.details.M.recIndex.N;
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
          event.dynamodb.NewImage.details.M.registeredLetterCode.S &&
          event.dynamodb.NewImage.details.M.deliveryDetailCode &&
          event.dynamodb.NewImage.details.M.deliveryDetailCode.S === "CON080"
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
      default:
    }
  }

  return dynamoDbOps;
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
