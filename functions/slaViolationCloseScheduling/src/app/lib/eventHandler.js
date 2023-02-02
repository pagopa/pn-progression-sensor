// input
module.exports.eventHandler = async (event) => {
  console.log("event: ", event);

  // basic return payload
  const payload = {
    batchItemFailures: [],
  };

  return payload;
};
