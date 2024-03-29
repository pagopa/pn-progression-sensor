const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { Buffer } = require("node:buffer");
const { isValidType } = require("./utils");

const client = new LambdaClient({ region: process.env.REGION });

exports.getActiveSLAViolations = async (type, lastScannedKey) => {
  if (!isValidType(type)) {
    const message = "wrong type passed: " + type;
    console.error(message);
    return { success: false, message: message };
  }

  const lambdaFunctionPayload = {
    type: type,
    active: true,
  };
  if (lastScannedKey) {
    lambdaFunctionPayload.lastScannedKey = lastScannedKey;
  }

  const payLoad = {
    FunctionName:
      process.env.SEARCH_SLA_VIOLATIONS_FUNCTION_ARN ||
      "pn-searchSLAViolationsLambda",
    //InvocationType: "RequestResponse", // default: synchronous invocation
    Payload: Buffer.from(JSON.stringify(lambdaFunctionPayload)), // Uint8Array
  };
  const command = new InvokeCommand(payLoad);

  try {
    const response = await client.send(command);
    const decodedResponse = JSON.parse(Buffer.from(response.Payload)); // the lambda function returns a string containing a JSON, not a plain object

    //console.log("lambda invocation response: ", decodedResponse);

    // we could check for decodedResponse.success, but directly pass the response to the caller, who
    // actually controls the returned data

    return decodedResponse;
  } catch (error) {
    /* istanbul ignore next */
    const message = "error calling lambda function: " + error;
    /* istanbul ignore next */
    console.error(message);
    /* istanbul ignore next */
    return { success: false, message: message };
  }
};
