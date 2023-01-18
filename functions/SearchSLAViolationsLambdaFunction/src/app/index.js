import pkg from "aws-sdk";
const { AWS } = pkg;

import {
  dateTimeStringToUNIXTimeStamp,
  isValidDate,
  isValidType,
} from "../utils.js";

const tableName = process.env.DYNAMODB_TABLE;

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
  // event = {
  //  type,           // required, string
  //  active,         // required, boolean
  //  olderThan,      // datetime string
  //  lastScannedKey, // string
  // }
  console.log("event", event);

  // basic return payload
  const payload = {
    success: true,
    message: "",
    results: null,
    lastScannedKey: null,
  };

  // -- 1. input verification -> go on or 400

  // check required input parameters
  if (!event.type || !event.active) {
    payload.success = false;
    payload.message = "required parameters missing";
    console.err("event", payload.message);
    return JSON.stringify(payload);
  }
  // check input paramters correctness
  if (
    !isValidType(event.type) ||
    typeof event.active !== "boolean" ||
    (event.olderThan != null && !isValidDate(event.olderThan)) || // we control it only if passed
    typeof event.lastScannedKey !== "string"
  ) {
    payload.success = false;
    payload.message = "incorrect input parameters";
    console.err("event", payload.message);
    return JSON.stringify(payload);
  }
  // -- 2. DynamoDB query
  const dynamoDB = new AWS.DynamoDB.DocumentClient();

  let response = null;

  try {
    if (event.active) {
      // index: activeViolations-index (attive)
      // ...
      // alarmTTL is a string... possibile problema: forse conviene averne comunque una copia non datetime iso, ma con unix timestamp, per l'ordinamento...
      //
      // Dato un “type“ elencare le “SLA Violation“ attive di quel tipo
      let keyConditionExpression = "active_sla_entityName_type = :partitionKey";
      //let maxEpoch = 0;
      if (event.olderThan != null) {
        //maxEpoch = dateTimeStringToUNIXTimeStamp(event.olderThan); // we don't check for exception, because we already know the datetime string is valid
        keyConditionExpression += " and alarmTTL < :sortKey";
      }
      response = await dynamoDB
        .query({
          TableName: tableName,
          IndexName: "activeViolations-index",
          KeyConditionExpression: keyConditionExpression,
          ExpressionAttributeValues: {
            ":partitionKey": event.type,
            //":sortKey": maxEpoch,
            ":sortKey": event.olderThan,
          },
          ScanIndexForward: false, // descending (newer to older)
        })
        .promise();
    } else {
      // index: partitionedEndTimestamp-index (storicizzate)
      // ...
      // Dato un “type“ e una data elencare le “SLA Violation“ storicizzate relative ad attività cominciate precedentemente a quella data, restituite dalla più recente alla più remota (partizionare per mese)

      // let keyConditionExpression = "active_sla_entityName_type = :partitionKey";
      // let maxEpoch = 0;
      // if (event.olderThan != null) {
      //   maxEpoch = dateTimeStringToUNIXTimeStamp(event.olderThan); // we don't check for exception, because we already know the datetime string is valid
      //   keyConditionExpression += " and alarmTTL < :sortKey";
      // }

      response = await dynamoDB // scan instead on query...?
        .query({
          TableName: tableName,
          IndexName: "partitionedEndTimestamp-index",
          KeyConditionExpression: "gsi1pk = :gsi1pk... INSERT", // ...
          ExpressionAttributeValues: {
            //':gsi1pk': '123',
            // ...
          },
          ScanIndexForward: false, // descending
        })
        .promise();
    }
  } catch (error) {
    payload.success = false;
    payload.message = JSON.stringify(error);
    console.err("error on query", payload.message);
    return JSON.stringify(payload);
  }

  // -- 3. prepare and return response
  if (response?.Items && response.Items.length > 0) {
    payload.results = response.Items;
    lastScannedKey = response.lastScannedKey;
  } else {
    payload.success = false;
    payload.message = "problem getting response";
    console.err("event", payload.message);
    return JSON.stringify(payload);
  }
};

export { handler };
