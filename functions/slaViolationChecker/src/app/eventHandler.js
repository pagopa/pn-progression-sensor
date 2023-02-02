const dynamo = require("./lib/dynamoDB.js");
const { extractKinesisData } = require("./lib/kinesis.js");
const { mapEvents, mapEventsFromSQS } = require("./lib/eventMapper.js");
const { persistEvents } = require("./lib/dynamoDB.js");
const { extractSQSData } = require("./lib/sqs.js");

// input
module.exports.eventHandler = async (event, bypassINVOCATION_TYPE) => {
  console.log("event: ", event);

  // basic return payload
  const payload = {
    batchItemFailures: [],
  };

  let processedItems = [];

  if (
    bypassINVOCATION_TYPE === "SQS" ||
    process.env.INVOCATION_TYPE === "SQS"
  ) {
    // SQS path
    console.log("*** SQS processing ***");

    // get SQS records
    const sqsEvents = extractSQSData(event);
    console.log(`Batch size: ${sqsEvents.length} sqs`);
    console.log("SQS data: ", JSON.stringify(sqsEvents));

    if (sqsEvents.length == 0) {
      console.log("No SQS events to process");
      return payload;
    }

    // map to update ops (we're getting active SLA Violations and we check if we can storicize them because they have ended)
    processedItems = await mapEventsFromSQS(sqsEvents);
    if (processedItems.length == 0) {
      console.log("No SQS events to persist");
      return payload;
    }
    console.log(`SQS items to persist`, processedItems);
  } else {
    // "normal" Kinesis path
    console.log("*** Kinesis processing ***");

    // 1. get event from Kinesis and filter for delete
    const cdcEvents = extractKinesisData(event); // only needed events (REMOVE)
    console.log(`Batch size: ${cdcEvents.length} cdc`);
    console.log("kinesis data: ", JSON.stringify(cdcEvents));

    if (cdcEvents.length == 0) {
      // no delete event in the CDC stream from Kinesis
      console.log("No Kinesis events to process");
      return payload;
    }

    processedItems = await mapEvents(cdcEvents); // map events to DB operations to perform (in out case, only PUT if not exists or UPDATE violation for TTL Remove)
    if (processedItems.length == 0) {
      console.log("No Kinesis events to persist");
      return payload;
    }
    console.log(`Kinesis items to persist`, processedItems);
  }

  // 2. process if reason is TTL: create an Active SLA Violation (part common to Kinesis and SQS path)
  const persistSummary = await persistEvents(processedItems); // actually produce changes to DB (in our case create Active Sla Violations or storicize them)

  console.log("Persist summary", persistSummary);
  console.log(`Inserted ${persistSummary.insertions} records`);
  console.log(`Updated ${persistSummary.updates} records`);

  if (persistSummary.errors.length > 0) {
    console.error(
      `SLA Violation Checker execution finished with ${persistSummary.errors.length} errors`,
      persistSummary.errors
    );
    payload.batchItemFailures = persistSummary.errors.map((i) => {
      return i.kinesisSeqNumber || i.messageId; // return one or the other: the first not undefined
    });
  }

  return payload;
};
