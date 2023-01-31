// just for following an organizations similar to the one used for Kinesis
exports.extractSQSData = function (sqsEvent) {
  console.log("SQS event: ", JSON.stringify(sqsEvent));
  if (sqsEvent == null || sqsEvent.Records == null) {
    return [];
  }
  return kinesisEvent.Records.map((rec) => {
    const decodedPayload = JSON.parse(rec.body); // the payload will be JSON and will contain the same object
    return {
      messageId: rec.messageId,
      ...decodedPayload,
    };
  });
};
