const { expect } = require("chai");
const dynamo = require("../app/dynamoFunctions.js");
const { mockClient } = require("aws-sdk-client-mock");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("dynamoFunction tests", function () {
  this.beforeEach(() => {
    ddbMock.reset();
  });

  it("basic searchSLAViolations test, active, with null returned result (to be improved...)", async () => {
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
  });

  it("basic searchSLAViolations test, storicized, with null returned result (to be improved...)", async () => {
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
  });

  it("basic searchSLAViolations test, active, with olderThan, with null returned result (to be improved...)", async () => {
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
  });

  it("basic searchSLAViolations test, storicized, with olderThan, with null returned result (to be improved...)", async () => {
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
  });

  it("basic searchSLAViolations test, active, with lastScannedKey, with null returned result (to be improved...)", async () => {
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
  });
});
