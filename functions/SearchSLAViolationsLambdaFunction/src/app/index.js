//const AWS = require("aws-sdk");

import pkg from "aws-sdk";
const { AWS } = pkg;

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
    (!!event.olderThan && !isValidDate(event.olderThan)) ||
    (!!event.lastScannedKey && typeof event.lastScannedKey !== "string")
  ) {
    payload.success = false;
    payload.message = "incorrect input parameters";
    console.err("event", payload.message);
    return JSON.stringify(payload);
  }
  // -- 2. DynamoDB query
  const dynamoDB = new AWS.DynamoDB.DocumentClient();

  // ...
  const response = {};

  // -- 3. prepare and return response
  if (response?.Items && response.Items.length > 0) {
    payload.results = response.Items;
    lastScannedKey = response.lastScannedKey;
  }
};

// UTILS

const knownTypes = [
  "VALIDATION",
  "REFINEMENT",
  "SEND_PEC",
  "SEND_PAPER_AR_890",
  "SEND_AMR",
];

/**
 * checks if a string contains a valid datetime
 *
 * @param {string} dateString a string containing a datetime (it must be able to become a valida Date object)
 * @returns {boolean} returns true if the passed string is a correct datetime
 */
function isValidDate(dateString) {
  const datetimeObject = new Date(dateString);
  return !Number.isNaN(datetimeObject.getTime());
}

/**
 * checks if a string contains a valid type
 *
 * @param {string} typeString a string containing step type
 * @returns {boolean} returns true if the passed string is a correct step type
 */
function isValidType(typeString) {
  if (typeof typeString === "string" && knownTypes.includes(typeString)) {
    return true;
  }

  return false;
}

export { handler, isValidDate, isValidType };
