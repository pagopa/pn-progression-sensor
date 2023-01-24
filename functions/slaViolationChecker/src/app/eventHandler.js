const dynamo = require("./lib/dynamoFunctions.js");

// input
module.exports.eventHandler = async (event) => {
  console.log("event: ", event);

  // basic return payload
  const payload = {
    success: true,
    message: "",
  };

  try {
    // ...
    // 1. get delete event from Kinesis
    // 2. process if reason is TTL: create an Active SLA Violation
  } catch (error) {
    payload.success = false;
    payload.message = error?.message;
    console.error("error: ", payload.message);
  }
  return JSON.stringify(payload);
};
