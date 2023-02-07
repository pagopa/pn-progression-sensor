const { getActiveSLAViolations } = require("./lib/lambda");
const { addActiveSLAToQueue } = require("./lib/sqs");

module.exports.eventHandler = async (event) => {
  //console.log("event: ", event);

  // basic return payload
  const payload = {
    activeSLASearchSuccesses: 0,
    activeSLASearchFailures: 0,
    eventsSentToQueue: 0,
  };

  // 1. get currently active SLA Violations
  let slaViolations = [];

  const types = [
    "VALIDATION",
    "REFINEMENT",
    "SEND_PEC",
    "SEND_PAPER_AR_890",
    "SEND_AMR",
  ];

  for (const type of types) {
    let lastScannedKey = null;

    do {
      const lambdaResponse = await getActiveSLAViolations(type, lastScannedKey);

      if (lambdaResponse && !lambdaResponse.success) {
        console.log("problem calling lambda function for type: ", type);
        payload.activeSLASearchFailures++;
        lastScannedKey = null;
      } else {
        // success
        //console.log("lambda invocation response: ", lambdaResponse);
        payload.activeSLASearchSuccesses++;
        slaViolations = slaViolations.concat(lambdaResponse.results); // an array is added
        lastScannedKey = lambdaResponse.lastScannedKey || null;
      }
    } while (lastScannedKey != null);

    if (slaViolations.length < 1) {
      console.log("No active SLA Violations for type: " + type);
    } else {
      console.log(
        slaViolations.length + " active SLA Violations for type: " + type
      );
    }
  }

  const numberOfActiveSLAViolations = slaViolations.length;
  console.log(
    "total number of active SLA Violations: ",
    numberOfActiveSLAViolations
  );

  // communicate the metric
  // ...

  // 2. send active queue for checking/processing
  const responses = await addActiveSLAToQueue(slaViolations);
  // ...

  return payload;
};
