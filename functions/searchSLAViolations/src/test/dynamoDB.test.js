const { expect } = require("chai");
const dynamo = require("../app/dynamoDB.js");
const { mockClient } = require("aws-sdk-client-mock");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dateTimeStringToYearAndMonth } = require("../app/utils");

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("DynamoDB tests", function () {
  this.beforeEach(() => {
    ddbMock.reset();
  });

  it("basic searchSLAViolations test, active", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const response = await dynamo.searchSLAViolations(
      true,
      "VALIDATION",
      null,
      null
    );

    expect(response.Items).to.not.be.null;
    expect(response.Items).to.not.be.undefined;
    expect(response.queryParameters.IndexName).equal("activeViolations-index");
    expect(response.queryParameters.KeyConditionExpression).equal(
      "active_sla_entityName_type = :partitionKey"
    );
    expect(
      response.queryParameters.ExpressionAttributeValues[":partitionKey"]
    ).equal("VALIDATION");
    expect(response.queryParameters.ExpressionAttributeValues[":sortKey"]).to.be
      .undefined;
    expect(response.queryParameters.lastScannedKey).to.be.undefined;
  });

  it("basic searchSLAViolations test, storicized", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const response = await dynamo.searchSLAViolations(
      false,
      "VALIDATION",
      null,
      null
    );

    expect(response.Items).to.not.be.null;
    expect(response.Items).to.not.be.undefined;
    expect(response.queryParameters.IndexName).equal(
      "partitionedEndTimeStamp-index"
    );
    expect(response.queryParameters.KeyConditionExpression).equal(
      "type_endTimestampYearMonth = :partitionKey"
    );
    expect(
      response.queryParameters.ExpressionAttributeValues[":partitionKey"]
    ).equal(
      "VALIDATION##" + dateTimeStringToYearAndMonth(new Date().toISOString())
    );
    expect(response.queryParameters.ExpressionAttributeValues[":sortKey"]).to.be
      .undefined;
    expect(response.queryParameters.lastScannedKey).to.be.undefined;
  });

  it("basic searchSLAViolations test, active, with olderThan", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const response = await dynamo.searchSLAViolations(
      true,
      "VALIDATION",
      "2023-01-20T13:28:52.819Z",
      null
    );

    expect(response.Items).to.not.be.null;
    expect(response.Items).to.not.be.undefined;
    expect(response.queryParameters.IndexName).equal("activeViolations-index");
    expect(response.queryParameters.KeyConditionExpression).equal(
      "active_sla_entityName_type = :partitionKey and alarmTTL < :sortKey"
    );
    expect(
      response.queryParameters.ExpressionAttributeValues[":partitionKey"]
    ).equal("VALIDATION");
    expect(
      response.queryParameters.ExpressionAttributeValues[":sortKey"]
    ).to.be.equal("2023-01-20T13:28:52.819Z");
    expect(response.queryParameters.lastScannedKey).to.be.undefined;
  });

  it("basic searchSLAViolations test, storicized, with olderThan", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const response = await dynamo.searchSLAViolations(
      false,
      "VALIDATION",
      "2023-01-20T13:28:52.819Z",
      null
    );

    expect(response.Items).to.not.be.null;
    expect(response.Items).to.not.be.undefined;
    expect(response.queryParameters.IndexName).equal(
      "partitionedEndTimeStamp-index"
    );
    expect(response.queryParameters.KeyConditionExpression).equal(
      "type_endTimestampYearMonth = :partitionKey and endTimeStamp < :sortKey"
    );
    expect(
      response.queryParameters.ExpressionAttributeValues[":partitionKey"]
    ).equal("VALIDATION##2023-01");
    expect(
      response.queryParameters.ExpressionAttributeValues[":sortKey"]
    ).to.be.equal("2023-01-20T13:28:52.819Z");
    expect(response.queryParameters.lastScannedKey).to.be.undefined;
  });

  it("basic searchSLAViolations test, active, with lastScannedKey", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    const response = await dynamo.searchSLAViolations(
      true,
      "VALIDATION",
      null,
      "testKey"
    );

    expect(response.Items).to.not.be.null;
    expect(response.Items).to.not.be.undefined;
    expect(response.queryParameters.IndexName).equal("activeViolations-index");
    expect(response.queryParameters.KeyConditionExpression).equal(
      "active_sla_entityName_type = :partitionKey"
    );
    expect(response.queryParameters.ExclusiveStartKey).equal("testKey");
  });
});
