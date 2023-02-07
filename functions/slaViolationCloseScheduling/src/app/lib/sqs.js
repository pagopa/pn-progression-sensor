const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const client = new SQSClient({ region: process.env.REGION });

exports.addActiveSLAToQueue = async (violations) => {
  const response = {
    receivedViolations: 0,
    correctlySentViolations: 0,
  };

  // for each violation
  if (violations == null || !Array.isArray(violations)) {
    return response;
  }

  response.receivedViolations = violations.length;

  // ...
  //   const params = {
  //     // input parameters
  //   };
  //   const command = new SendMessageCommand(params);

  //   try {
  //     const data = await client.send(command);
  //     // process data
  //   } catch (error) {
  //     // error handling
  //   }

  return response;
};
