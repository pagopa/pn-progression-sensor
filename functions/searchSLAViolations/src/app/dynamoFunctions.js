//const AWS = require("aws-sdk");
const { DynamoDBClient, QueryCommand } = require("@aws-sdk/client-dynamodb");
const { dateTimeStringToUNIXTimeStamp } = require("./utils");

module.exports.searchSLAViolations = async (active, type, olderThan) => {
  const tableName = process.env.DYNAMODB_TABLE;
  console.log(tableName);

  const dynamoDB = new DynamoDBClient();

  let response = null;

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

    response = await dynamoDB.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "activeViolations-index",
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: attributeValues,
        ScanIndexForward: false, // descending (newer to older)
      })
    );
  } else {
    // index: partitionedEndTimestamp-index (storicizzate)
    // ...
    // Dato un “type“ e una data elencare le “SLA Violation“ storicizzate relative ad attività cominciate precedentemente a quella

    let maxEpoch = 0;
    let partitionYearMonth = "";

    let keyConditionExpression = "endTimestampYearMonth = :partitionKey";

    let attributeValues = {};

    if (olderThan != null) {
      keyConditionExpression += " and endTimestamp < :sortKey";

      partitionYearMonth = dateTimeStringToYearAndMonth(olderThan);

      maxEpoch = dateTimeStringToUNIXTimeStamp(olderThan); // we don't check for exception, because we already know the datetime string is valid
      attributeValues[":sortKey"] = maxEpoch;
    } else {
      // current month is used in this case
      partitionYearMonth = dateTimeStringToYearAndMonth(
        new Date().toISOString()
      );
    }
    attributeValues[":partitionKey"] = partitionYearMonth;

    response = await dynamoDB.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "partitionedEndTimestamp-index",
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: attributeValues,
        ScanIndexForward: false,
      })
    );
  }

  //console.log("response", response);

  return response;
};
