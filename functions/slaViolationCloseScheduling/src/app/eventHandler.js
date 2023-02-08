const { getActiveSLAViolations } = require("./lib/lambda");
const { addActiveSLAToQueue } = require("./lib/sqs");
const { putMetricDataForType } = require("./lib/metrics");

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

    let currentTypeSlaViolations = [];
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
        currentTypeSlaViolations = currentTypeSlaViolations.concat(
          lambdaResponse.results
        ); // an array is added to the array for current type
        lastScannedKey = lambdaResponse.lastScannedKey || null;
      }
    } while (lastScannedKey != null);

    if (currentTypeSlaViolations.length < 1) {
      console.log("No active SLA Violations for type: " + type);
    } else {
      console.log(
        currentTypeSlaViolations.length +
          " active SLA Violations for type: " +
          type
      );
    }

    slaViolations = slaViolations.concat(currentTypeSlaViolations); // an array is added to the global array

    // communicate the metric
    await putMetricDataForType(currentTypeSlaViolations.length, type);
  }

  const numberOfActiveSLAViolations = slaViolations.length;
  console.log(
    "total number of active SLA Violations: ",
    numberOfActiveSLAViolations
  );
  // 2. send active queue for checking/processing
  const queueResponse = await addActiveSLAToQueue(slaViolations);

  console.log("send to queue response: ", queueResponse);

  return payload;
};
