const dynamo = require("./lib/dynamoDB.js");
const { extractKinesisData } = require("./lib/kinesis.js");
const { mapEvents } = require("./lib/eventMapper.js");

// input
module.exports.eventHandler = async (event) => {
  console.log("event: ", event);

  // basic return payload
  const payload = {
    batchItemFailures: [],
  };

  // 1. get event from Kinesis and filter for delete
  const cdcEvents = extractKinesisData(event);
  console.log(`Batch size: ${cdcEvents.length} cdc`);
  //console.log("kinesis data: ", cdcEvents);

  if (cdcEvents.length == 0) {
    // no delete event in the CDC stream from Kinesis
    console.log("No events to process");
    return payload;
  }

  const processedItems = mapEvents(cdcEvents);
  if (processedItems.length == 0) {
    console.log("No events to persist");
    return payload;
  }
  console.log(`Items to persist`, processedItems);

  try {
    // 2. process if reason is TTL: create an Active SLA Violation
    // ...
  } catch (error) {
    // ...
  }
  return JSON.stringify(payload);
};
