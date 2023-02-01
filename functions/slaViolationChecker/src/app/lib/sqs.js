// just for following an organizations similar to the one used for Kinesis
//
// ref: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs-example.html
exports.extractSQSData = function (sqsEvent) {
  console.log("SQS event: ", JSON.stringify(sqsEvent));
  if (sqsEvent == null || sqsEvent.Records == null) {
    return [];
  }
  return sqsEvent.Records.map((rec) => {
    const decodedPayload = JSON.parse(rec.body); // the payload will be JSON and will contain the same object
    return {
      messageId: rec.messageId,
      dynamodb: { ...decodedPayload },
    };
  });
};
