const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { fromUtf8 } = require("@aws-sdk/util-utf8-node");

const client = new LambdaClient({ region: process.env.REGION });

exports.getActiveSLAViolations = async (type, lastScannedKey) => {
  const payLoad = {
    FunctionName:
      process.env.SEARCH_SLA_VIOLATIONS_FUNCTION_NAME ||
      "pn-searchSLAViolationsLambda",
    InvocationType: "RequestResponse",
    Payload: fromUtf8(
      JSON.stringify({
        type: type,
        active: true,
        lastScannedKey: lastScannedKey,
      })
    ),
  };
  const command = new InvokeCommand(payLoad);

  try {
    const response = await client.send(command);
    console.log("lambda invocation response: ", response);

    // ...

    return {};
  } catch (error) {
    console.log("error calling lambda function: ", error);
    return {};
  }
};
