const { getActiveSLAViolations } = require("./lib/lambda");
const { addActiveSLAToQueue } = require("./lib/sqs");
const { putMetricDataForType } = require("./lib/metrics");

// global lastScannedKey, kept between invocations when the lambda is
// invoked again and is hot
let globalLastScannedKey = null;
let globalLastScannedKeyType = "";
let globalLastScannedCount = 0;

module.exports.eventHandler = async (event) => {
  // read max allowed execution time from env
  const max_allowed_time_ms = process.env.MAX_ALLOWED_TIME_MS || 10000; // default 10 seconds

  // determine start time
  const startTime = new Date().getTime();

  let completelyStop = false;

  // basic return payload
  const payload = {
    activeSLASearchSuccesses: 0,
    activeSLASearchFailures: 0,
    eventsSentToQueue: 0,
    activeSlasFound: 0,
    partialResults: false,
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

    let recoveredTypeCount = 0;

    // check if we have a global last scanned key,
    // and if it is for the same type
    /* istanbul ignore next */
    if (globalLastScannedKey != null) {
      if (globalLastScannedKeyType === type) {
        // process this type from previous interryption
        lastScannedKey = globalLastScannedKey;
      } else {
        // pass to next type for recovering from previous interruption
        continue;
      }
    } // if we get here, go with normal loop processing (no recover needed)

    /* istanbul ignore next */
    if (completelyStop) {
      break;
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
        globalLastScannedCount = 0;
      } else {
        // success
        console.log(
          "lambda invocation response - results number: ",
          JSON.stringify(lambdaResponse.results.length)
        );
        payload.activeSLASearchSuccesses++;
        currentTypeSlaViolations = currentTypeSlaViolations.concat(
          lambdaResponse.results
        ); // an array is added to the array for current type
        lastScannedKey = lambdaResponse.lastScannedKey || null;

        // send active queue for checking/processing
        const queueResponse = await addActiveSLAToQueue(lambdaResponse.results);
        console.log("send to queue response: ", queueResponse);

        // we performed everything for the current loop iteration

        // we save the last scanned key, if not null, and reset it otherwise
        /* istanbul ignore next */
        if (lastScannedKey != null) {
          // we could do this only if previously different...
          globalLastScannedKey = lastScannedKey;
          globalLastScannedKeyType = type;
          globalLastScannedCount =
            globalLastScannedCount + lambdaResponse.results.length;
          console.log(
            "global last scanned key: ",
            globalLastScannedKey,
            ", type: ",
            type
          );
        } else {
          recoveredTypeCount =
            globalLastScannedCount + lambdaResponse.results.length;
          // reset global last scanned key
          globalLastScannedKey = null;
          globalLastScannedKeyType = "";
          globalLastScannedCount = 0;
          console.log("reset global last scanned key, type: ", type);
        }

        // check if we must stop
        const currentTime = new Date().getTime();
        const elapsed_ms = currentTime - startTime; // in milliseconds
        console.log("elapsed time: ", elapsed_ms);

        /* istanbul ignore next */
        if (elapsed_ms >= max_allowed_time_ms) {
          console.log("stopping before timeout");
          completelyStop = true; // stop the outer loop (types loop)
          payload.partialResults = true;
          break; // stop the do while loop (violations inner loop)
        } else {
          completelyStop = false;
        }
      }
    } while (lastScannedKey != null); // end violations inner do while loop (single type)

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

    // communicate the metric if we were not forced to stop (and only have partials for the current type)
    if (!completelyStop) {
      await putMetricDataForType(recoveredTypeCount, type);
      console.log("put metric data for type: ", recoveredTypeCount);
    }
  } // end types loop (for)

  const numberOfActiveSLAViolations = slaViolations.length;
  payload.activeSlasFound = numberOfActiveSLAViolations;
  console.log(
    "total number of active SLA Violations: ",
    numberOfActiveSLAViolations
  );
  // 2. send active queue for checking/processing
  //const queueResponse = await addActiveSLAToQueue(slaViolations);
  //console.log("send to queue response: ", queueResponse);

  return payload;
};
