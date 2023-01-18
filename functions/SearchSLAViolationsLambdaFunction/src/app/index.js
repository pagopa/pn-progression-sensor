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

const handler = async (event, context, callback) => {
  // temp...
  console.log("event", event);
  // const payload = {
  //   date: new Date(),
  //   message: "Hello Lambda, SearchSLAViolationsLambdaFunction",
  // };
  return JSON.stringify(payload);

  // basic return payload
  const payload = {
    success: true,
    message: "",
    data: null,
  };

  // 1. input verification -> go on or 400
  // event = {
  //  type,           // required, string
  //  active,         // required, boolean
  //  olderThan,      // datetime string
  //  lastScannedKey, // string
  // }

  // check required input parameters
  if (!event.type || !event.active) {
    payload.success = false;
    payload.message = "required parameters missing";
    return payload;
  }
  // check input paramters correctness
  if (
    typeof type !== "string" ||
    typeof active !== "boolean" ||
    !isValidDate(olderThan) ||
    (!lastScannedKey && typeof lastScannedKey !== "string")
  ) {
    payload.success = false;
    payload.message = "incorrect input parameters";
    return payload;
  }
  // 2. DynamoDB query
  // ...
  // 3. prepare and return response
  // ...
};

// UTILS

/**
 * checks if a string contains a valid datetime
 *
 * @param {string} dateString a string containing a datetime (it must be able to become a valida Date object)
 * @returns {boolean} returns true if the passed string is a correct datetime
 */
function isValidDate(dateString) {
  const schedule_datetime = new Date(dateString);
  return !Number.isNaN(schedule_datetime.getTime());
}

export { handler };
