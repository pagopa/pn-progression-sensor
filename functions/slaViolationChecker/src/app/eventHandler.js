const dynamo = require("./lib/dynamoDB.js");
const { extractKinesisData } = require("./lib/kinesis.js");
const { mapEvents } = require("./lib/eventMapper.js");
const { persistEvents } = require("./lib/dynamoDB.js");

// input
module.exports.eventHandler = async (event) => {
  console.log("event: ", event);

  // basic return payload
  const payload = {
    batchItemFailures: [],
  };

  if (process.env.INVOCATION_TYPE === "SQS") {
    // SQS path
    // ...
  } else {
    // "normal" Kinesis path
    // ...
    // what we already did
    // ...
  }

  // 1. get event from Kinesis and filter for delete
  const cdcEvents = extractKinesisData(event); // only needed events (REMOVE)
  console.log(`Batch size: ${cdcEvents.length} cdc`);
  console.log("kinesis data: ", JSON.stringify(cdcEvents));

  if (cdcEvents.length == 0) {
    // no delete event in the CDC stream from Kinesis
    console.log("No events to process");
    return payload;
  }

  const processedItems = await mapEvents(cdcEvents); // map events to DB operations to perform (in out case, only PUT if not exists or UPDATE violation for TTL Remove)
  if (processedItems.length == 0) {
    console.log("No events to persist");
    return payload;
  }
  console.log(`Items to persist`, processedItems);

  // 2. process if reason is TTL: create an Active SLA Violation
  const persistSummary = await persistEvents(processedItems); // actually produce changes to DB (in our case create Active Sla Violations or soritize them)

  console.log("Persist summary", persistSummary);
  console.log(`Inserted ${persistSummary.insertions} records`);
  console.log(`Inserted ${persistSummary.updates} records`);

  if (persistSummary.errors.length > 0) {
    console.error(
      `SLA Violation Checker execution finished with ${persistSummary.errors.length} errors`,
      persistSummary.errors
    );
    payload.batchItemFailures = persistSummary.errors.map((i) => {
      return i.kinesisSeqNumber;
    });
  }

  return payload;
};
