const dynamo = require("./dynamoDB.js");

const { isValidDate, isValidType } = require("./utils");

const {
  MissingRequiredParametersException,
  WrongInputParametersException,
  MissingEventObjectException,
} = require("./exceptions");

/**
 * stops if there's a problem with the event
 *
 * @param {object} event the AWS Lambda event object
 * @throws MissingEventObjectException, MissingRequiredParametersException, WrongInputParametersException
 */
const checkSearchSLAViolationsEvent = (event) => {
  // problem with event
  if (!event) {
    throw new MissingEventObjectException("Missing event object");
  }

  // check required input parameters
  if (event.type == null || !event.active == null) {
    throw new MissingRequiredParametersException("Required parameters missing");
  }

  // check input parameters correctness
  if (
    !isValidType(event.type) ||
    typeof event.active !== "boolean" ||
    (event.olderThan != null && !isValidDate(event.olderThan)) // we control it only if passed
    // lastScannedKey, if present and != null will be an object: we don't check it
  ) {
    throw new WrongInputParametersException(
      "Incorrect input parameters, event: " + JSON.stringify(event)
    );
  }
};

// Request
//
// type: string (required)
// active: boolean (required)
// olderThan: string con formato date-time
// lastScannedKey: string
//
//
// Response (400 in case on invalid request parameters)
//
// lastScannedKey: string
// results: array of "SLA Violations"
//   type: string
//   id: string
//   startTimestamp: string con formato date-time
//   SLAExpiration: string con formato date-time
//   alarmTTL: number (unix epoch time in seconds)
//   isActive: boolean
//   endTimestamp: string con formato date-time

module.exports.eventHandler = async (event /*, context, callback*/) => {
  // event = {
  //  type,           // required, string
  //  active,         // required, boolean
  //  olderThan,      // datetime string
  //  lastScannedKey, // string
  // }
  console.log("event: ", event);

  // basic return payload
  const payload = {
    success: true,
    message: "",
    results: null,
    lastScannedKey: null,
  };

  try {
    // -- input verification
    checkSearchSLAViolationsEvent(event);

    // -- DynamoDB query
    const response = await dynamo.searchSLAViolations(
      event.active,
      event.type,
      event.olderThan,
      event.lastScannedKey
    );

    // -- prepare and return response
    payload.results = response.Items;
    payload.lastScannedKey = response.LastEvaluatedKey || null;
  } catch (error) {
    payload.success = false;
    payload.message = error?.message;
    console.error("error: ", payload.message);
  }
  return payload;
};
