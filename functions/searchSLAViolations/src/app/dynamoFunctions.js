//const AWS = require("aws-sdk");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  dateTimeStringToUNIXTimeStamp,
  dateTimeStringToYearAndMonth,
} = require("./utils");

module.exports.searchSLAViolations = async (
  active,
  type,
  olderThan,
  lastScannedKey
) => {
  const tableName = process.env.DYNAMODB_TABLE || "testTable";
  //console.log(tableName);

  const client = new DynamoDBClient();
  const dynamoDB = DynamoDBDocumentClient.from(client);

  let params = {};

  if (active) {
    // index: activeViolations-index (attive)
    //
    // given a "type", get the active "SLA Violations" for that type
    let keyConditionExpression = "active_sla_entityName_type = :partitionKey";

    let attributeValues = {
      ":partitionKey": type,
    };

    if (olderThan != null) {
      keyConditionExpression += " and alarmTTL < :sortKey";
      attributeValues[":sortKey"] = olderThan;
    }

    params = {
      TableName: tableName,
      IndexName: "activeViolations-index",
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: attributeValues,
      ScanIndexForward: false, // descending (newer to older)
    };
  } else {
    // index: partitionedEndTimestamp-index (storicizzate)
    // ...
    // Dato un “type“ e una data elencare le “SLA Violation“ storicizzate relative ad attività cominciate precedentemente a quella

    let maxEpoch = 0;
    let partitionYearMonth = "";

    let keyConditionExpression = "type_endTimestampYearMonth = :partitionKey";

    let attributeValues = {};

    if (olderThan != null) {
      keyConditionExpression += " and endTimestamp < :sortKey";

      partitionYearMonth = dateTimeStringToYearAndMonth(olderThan);

      //maxEpoch = dateTimeStringToUNIXTimeStamp(olderThan); // we don't check for exception, because we already know the datetime string is valid
      attributeValues[":sortKey"] = olderThan;
    } else {
      // current month is used in this case
      partitionYearMonth = dateTimeStringToYearAndMonth(
        new Date().toISOString()
      );
    }
    attributeValues[":partitionKey"] = type + "##" + partitionYearMonth; // example: "VALIDATION##2023-01"

    params = {
      TableName: tableName,
      IndexName: "partitionedEndTimeStamp-index",
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: attributeValues,
      ScanIndexForward: false,
    };
  }
  if (lastScannedKey != undefined) {
    params.lastScannedKey = lastScannedKey;
  }
  console.log("params: ", params);

  const response = await dynamoDB.send(new QueryCommand(params));
  console.log("response: ", response);

  return response;
};
