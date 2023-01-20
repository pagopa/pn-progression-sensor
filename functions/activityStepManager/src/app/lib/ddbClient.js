// Create a service client module using ES6 syntax.
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { ddbClient } = require("./ddbClient.js");

const region = process.env.REGION?process.env.REGION:'eu-south-1'
const ddbClient = new DynamoDBClient({
  region: region
});

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

// Create the DynamoDB document client.
exports.ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions,
  unmarshallOptions,
});