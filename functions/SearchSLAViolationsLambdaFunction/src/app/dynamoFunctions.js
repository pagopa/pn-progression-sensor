//const AWS = require("aws-sdk");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { dateTimeStringToUNIXTimeStamp } = require("./utils");

module.exports.searchSLAViolations = async (active, type, olderThan) => {
  //const dynamoDB = new AWS.DynamoDB.DocumentClient();
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

    response = await dynamoDB
      .query({
        TableName: tableName,
        IndexName: "activeViolations-index",
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: attributeValues,
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

    // partition key without olderThan: take current month
    //
    // partition key with olderThan: current month from date
    // ...

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

    response = await dynamoDB
      .query({
        TableName: tableName,
        IndexName: "partitionedEndTimestamp-index",
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: attributeValues,
        ScanIndexForward: false,
      })
      .promise();
  }

  return response;
};
