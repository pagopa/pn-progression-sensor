const dynamo = require("./lib/dynamoFunctions.js");

module.exports.eventHandler = async (event) => {
  console.log("event: ", event);

  // basic return payload
  const payload = {
    success: true,
    message: "",
  };

  try {
    // ...
  } catch (error) {
    payload.success = false;
    payload.message = error?.message;
    console.error("error: ", payload.message);
  }
  return JSON.stringify(payload);
};
