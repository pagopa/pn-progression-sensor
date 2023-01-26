process.env.DYNAMODB_TABLE = "pn-test";
process.env.REGION = "eu-central-1";

const { mockClient } = require("aws-sdk-client-mock");
const {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");
const { expect } = require("chai");
const { persistEvents } = require("../app/lib/repository");
const ddbMock = mockClient(DynamoDBDocumentClient);
const { ConditionalCheckFailedException } = require("./testException");

const events = [
  {
    opType: "INSERT",
    relatedEntityId: "YLPM-JPQG-RZXZ-202301-Z-1",
    type: "VALIDATION",
    id: "123123",
    startTimestamp: "2011-10-05T14:48:00.000Z",
    slaExpiration: "2011-10-05T14:48:00.000Z",
    alarmTTL: "2011-10-05T14:48:00.000Z",
    step_alarmTTL: 1674469350754,
  },
  {
    opType: "DELETE",
    relatedEntityId: "12123123",
    type: "VALIDATION",
    id: "123123",
  },
];

describe("repository tests", function () {
  it("test INSERT / DELETE", async () => {
    ddbMock.on(PutCommand).resolves({});

    ddbMock.on(DeleteCommand).resolves({});

    const res = await persistEvents(events);

    expect(res.insertions).equal(1);
    expect(res.deletions).equal(1);
  });

  it("test INSERT ERROR", async () => {
    ddbMock.on(PutCommand).rejects(new Error("abc"));
    ddbMock.on(DeleteCommand).resolves({});
    const res = await persistEvents(events);

    expect(res.insertions).equal(0);
    expect(res.deletions).equal(1);
    expect(res.errors.length).equal(1);
  });

  it("test DELETE ERROR", async () => {
    process.env.REGION = "eu-central-1";
    ddbMock.on(PutCommand).resolves({});
    ddbMock.on(DeleteCommand).rejects(new Error("abc"));

    const res = await persistEvents(events);

    expect(res.insertions).equal(1);
    expect(res.deletions).equal(0);
    expect(res.errors.length).equal(1);
  });

  it("test DELETE ERROR NO error", async () => {
    ddbMock.on(PutCommand).rejects(new Error("abc"));
    ddbMock.on(DeleteCommand).rejects(new Error("abc"));

    const res = await persistEvents(events);

    expect(res.insertions).equal(0);
    expect(res.deletions).equal(0);
    expect(res.errors.length).equal(2);
  });

  it("test DELETE Conditional Check Error", async () => {
    ddbMock.on(PutCommand).resolves({});
    ddbMock
      .on(DeleteCommand)
      .rejects(new ConditionalCheckFailedException("abc"));

    const res = await persistEvents(events);

    expect(res.insertions).equal(1);
    expect(res.deletions).equal(0);
    expect(res.skippedDeletions).equal(1);
    expect(res.errors.length).equal(0);
  });

  it("test INSERT Conditional Check Error", async () => {
    ddbMock.on(PutCommand).rejects(new ConditionalCheckFailedException("abc"));
    ddbMock.on(DeleteCommand).resolves({});

    const res = await persistEvents(events);

    expect(res.insertions).equal(0);
    expect(res.deletions).equal(1);
    expect(res.skippedInsertions).equal(1);
    expect(res.errors.length).equal(0);
  });
});