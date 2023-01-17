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

const handler = async (event) => {
  // temp...
  console.log("event", event);
  const payload = {
    date: new Date(),
    message: "Hello Lambda, SearchSLAViolationsLambdaFunction",
  };
  return JSON.stringify(payload);

  // 1. input verification -> go on or 400
  // ...
  // 2. DynamoDB query
  // ...
  // 3. prepare and return response
  // ...
};

export { handler };
