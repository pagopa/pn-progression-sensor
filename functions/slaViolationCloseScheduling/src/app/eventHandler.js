const { getActiveSLAViolations } = require("./lib/lambda");
const { addActiveSLAToQueue } = require("./lib/sqs");

module.exports.eventHandler = async (event) => {
  //console.log("event: ", event);

  // basic return payload
  const payload = {
    lambdaInvocationSuccesses: 0,
    lambdaInvocationFailures: 0,
    eventsSentToQueue: 0,
  };

  // 1. get currently active SLA Violations
  const slaViolations = [];

  const types = [
    "VALIDATION",
    "REFINEMENT",
    "SEND_PEC",
    "SEND_PAPER_AR_890",
    "SEND_AMR",
  ];

  types.forEach(async (type) => {
    let lastScannedKey = null;

    do {
      const lambdaResponse = await getActiveSLAViolations(type, lastScannedKey);

      if (lambdaResponse && !lambdaResponse.success) {
        console.log("problem calling lambda function for type: ", type);
        payload.lambdaInvocationFailures++;
      }

      console.log("lambda invocation response: ", lambdaResponse);
      payload.lambdaInvocationSuccesses++;

      slaViolations.push(lambdaResponse.results);

      lastScannedKey = lambdaResponse.lastScannedKey || null;
    } while (lastScannedKey != null);

    if (slaViolations.length) {
      console.log("No active SLA Violations for type: " + type);
    } else {
      // 2. send active queue for checking/processing
      const responses = await addActiveSLAToQueue(slaViolations);
      // ...

      // communicate the metric
      // ...
    }
  });

  return payload;
};
