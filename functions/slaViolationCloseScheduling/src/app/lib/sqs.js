const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const client = new SQSClient({ region: process.env.REGION });

exports.addActiveSLAToQueue = async (violations) => {
  const response = {
    correctlySentViolations: 0,
  };

  // for each violation...
  // ...

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
