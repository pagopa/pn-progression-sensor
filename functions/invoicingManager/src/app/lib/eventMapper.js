let moment = require("moment-business-days-it");
moment = require("moment-timezone");
const {
  TABLES,
  getTimelineElements,
} = require("./repository");
const { parseKinesisObjToJsonObj, initTtlTimes } = require("./utils");

const allowedTimelineCategories = [
  // Informal categories
  "REQUEST_REFUSED",
  "WORKFLOW_DONE_UNREACHED",
  "WORKFLOW_DONE_REACHED",
  "WORKFLOW_ENDED_UNDELIVERABLE",
  "WORKFLOW_ENDED_UNREACHED",
  "WORKFLOW_ENDED_REACHED"
];

const ttlTimes = initTtlTimes();

function extractRecIdsFromTimelineId(timelineElementId) {
  const match = timelineElementId.match(/RECINDEX_(\d+)(?:\.|$)/);
  return match ? match[1] : null;
  // Handles both RECINDEX_0 and RECINDEX_0.REWORK
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
  const days = ttlTimes.INVOICING_TTL_DAYS; // default 365
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
    ...timelineObj
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
      // WORKFLOW_DONE_REACHED, WORKFLOW_DONE_UNREACHED, WORKFLOW_ENDED_UNREACHED, WORKFLOW_ENDED_REACHED, WORKFLOW_ENDED_UNDELIVERABLE have an array with one recIdxs
      if (recIdxs !== null) {
        for (let recIdx of recIdxs) {
          const iun = timelineObj.iun;
          // get SEND_ANALOG_MESSAGE for the same iun and recipientIndex
          const analogMessagesTimelineId = [
            `SEND_ANALOG_MESSAGE.IUN_${iun}.RECINDEX_${recIdx}.ATTEMPT_0.DELIVERYTYPE_RS`
          ]
          const timelineElements = await getTimelineElements(iun, analogMessagesTimelineId);
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
    } // if invoicedElement
    return invoicedElements;
  }
}

async function mapPayload(event) {
  const dynamoDbOps = [];
  /* istanbul ignore else */
  if (event.tableName == TABLES.TIMELINES) {
    const category = event.dynamodb.NewImage.category.S;
    switch (category) {
      case "REQUEST_REFUSED": {
        const invoicedElementsRefused = await processInvoice(event, null);
        const bulkOpRefused = makeBulkInsertOp(event, invoicedElementsRefused);
        if (bulkOpRefused) {
          dynamoDbOps.push(bulkOpRefused);
        }
        break;
      }
      case "WORKFLOW_DONE_UNREACHED":
      case "WORKFLOW_DONE_REACHED":
      case "WORKFLOW_ENDED_UNDELIVERABLE":
      case "WORKFLOW_ENDED_UNREACHED":
      case "WORKFLOW_ENDED_REACHED": {
        let recIdx = extractRecIdsFromTimelineId(
            event.dynamodb.NewImage.timelineElementId.S
        );
        const invoicedElements = await processInvoice(event, [recIdx]);
        if(invoicedElements && invoicedElements.length > 0){
          const bulkOp = makeBulkInsertOp(event, invoicedElements);
          dynamoDbOps.push(bulkOp);
        }
      }
      break;
      default:
        console.error(`* FATAL * ALLARM!: Unrecognized category ${category} for event: ${JSON.stringify(event)}`);
      break;
    }
  }

  return dynamoDbOps;
}

exports.mapEvents = async (events) => {
  const filteredEvents = events.filter((e) => {
    return (
      e.eventName == "INSERT" &&
      (e.tableName == TABLES.TIMELINES &&
          e.dynamodb.NewImage.category &&
          allowedTimelineCategories.indexOf(e.dynamodb.NewImage.category.S) >=
            0)
    );
  });

  let ops = [];
  for (let i = 0; i < filteredEvents.length; i++) {
    const dynamoDbOps = await mapPayload(filteredEvents[i]);
    ops = ops.concat(dynamoDbOps);
  }
  return ops;
};
