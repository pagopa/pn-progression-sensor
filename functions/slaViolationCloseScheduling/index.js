const { eventHandler } = require("./src/app/eventHandler");

exports.handler = async (event) => {
  console.log("event: ", event);
  return eventHandler(event);
};

// test locally with:
// node -e 'require("./index").handler()'
