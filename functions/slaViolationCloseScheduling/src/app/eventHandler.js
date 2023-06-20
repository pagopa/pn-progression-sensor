const { getActiveSLAViolations } = require("./lib/lambda");
const { addActiveSLAToQueue } = require("./lib/sqs");
const { putMetricDataForType } = require("./lib/metrics");

// global lastScannedKey, kept between invocations when the lambda is
// invoked again and is hot
let globalLastScannedKey = null;
let globalLastScannedKeyType = "";

module.exports.eventHandler = async (event) => {
  // read max allowed execution time from env
  const max_allowed_time_ms = process.env.MAX_ALLOWED_TIME_MS || 10000; // default 10 seconds

  // determine start time
  const startTime = new Date().getTime();

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

    // check if we have a global last scanned key,
    // and if it is for the same type
    if (globalLastScannedKey != null) {
      if (globalLastScannedKeyType === type) {
        lastScannedKey = globalLastScannedKey;
      } else {
        // reset and break, passing to next type
        globalLastScannedKeyType = "";

        continue;
      }
    }

    // violations inner loop
    let currentTypeSlaViolations = [];
    do {
      const lambdaResponse = await getActiveSLAViolations(type, lastScannedKey);

      if (lambdaResponse && !lambdaResponse.success) {
        console.log("problem calling lambda function for type: ", type);
        payload.activeSLASearchFailures++;
        lastScannedKey = null;

        // reset global last scanned key
        globalLastScannedKey = null;
        globalLastScannedKeyType = "";
      } else {
        // success
        console.log(
          "lambda invocation response: ",
          JSON.stringify(lambdaResponse)
        );
        payload.activeSLASearchSuccesses++;
        currentTypeSlaViolations = currentTypeSlaViolations.concat(
          lambdaResponse.results
        ); // an array is added to the array for current type
        lastScannedKey = lambdaResponse.lastScannedKey || null;

        // send active queue for checking/processing
        const queueResponse = await addActiveSLAToQueue(lambdaResponse.results);
        console.log("send to queue response: ", queueResponse);

        // check elapsed time
        const currentTime = new Date().getTime();
        const elapsed_ms = currentTime - startTime; // in milliseconds

        // check if we must stop
        let mustStopBeforeTimeout = false;
        if (elapsed_ms > max_allowed_time_ms) {
          mustStopBeforeTimeout = true;
        }

        // if we must stop
        if (mustStopBeforeTimeout) {
          // we save the last scanned key, if not null
          if (lastScannedKey != null) {
            globalLastScannedKey = lastScannedKey;
            globalLastScannedKeyType = type;
          }

          break; // stop the loop
          // SEE... we must stop both loops!!!! while and for... (but probably we automatically exit with the continue from the external one...)
          /// ...
        }
      }
    } while (lastScannedKey != null); // end violations inner loop

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
    //
    // WE MUST ALSO COMMUNICATE THE NUMBER OF ACTIVE SLA VIOLATIONS FOR EACH TYPE, so
    // we need to save this and communicate only when we have the complete number for that type
    // ...
    await putMetricDataForType(currentTypeSlaViolations.length, type);
  } // end types loop

  const numberOfActiveSLAViolations = slaViolations.length;
  console.log(
    "total number of active SLA Violations: ",
    numberOfActiveSLAViolations
  );
  // 2. send active queue for checking/processing
  //const queueResponse = await addActiveSLAToQueue(slaViolations);
  //console.log("send to queue response: ", queueResponse);

  return payload;
};
