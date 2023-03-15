process.env.DYNAMODB_TABLE = "pn-test";
process.env.INVOICING_DYNAMODB_TABLE = "pn-invoices-test";
process.env.REGION = "eu-central-1";

const { mockClient } = require("aws-sdk-client-mock");
const {
  DeleteCommand,
  PutCommand,
  GetCommand,
  BatchGetCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { expect } = require("chai");

const {
  persistEvents,
  getNotification,
  getTimelineElements,
  TABLES,
} = require("../app/lib/repository");
const { ddbDocClient } = require("../app/lib/ddbClient.js");
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
  let ddbMock;

  before(() => {
    ddbMock = mockClient(ddbDocClient);
  });

  after(() => {
    ddbMock.restore();
    ddbMock.reset();
  });

  it("test GET ITEM FOUND", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        recipients: [],
      },
    });

    const res = await getNotification("abc");

    expect(res).deep.equals({
      recipients: [],
    });
  });

  it("test GET ITEM Not FOUND", async () => {
    ddbMock.on(GetCommand).resolves({});

    const res = await getNotification("abc");

    expect(res).equal(null);
  });

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

  it("test GET TIMELINE ITEMS FOUND", async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        [TABLES.TIMELINES]: [],
      },
    });
    const res = await getTimelineElements("abc", ["id1", "id2"]);
    expect(res).deep.equals([]);
  });

  it("test GET IMELINE ITEMS Not FOUND", async () => {
    ddbMock.on(BatchGetCommand).resolves({});
    const res = await getTimelineElements("abc", ["id1", "id2"]);
    expect(res).equal(null);
  });

  it("test GET IMELINE ITEMS Error", async () => {
    ddbMock.on(BatchGetCommand).rejects("Test message");
    const res = await getTimelineElements("abc", ["id1", "id2"]);
    expect(res).equal(null);
  });

  it("test BULK_INSERT_INVOICES ERROR", async () => {
    ddbMock.on(BatchWriteCommand).rejects(new Error("abc"));
    const res = await persistEvents([
      {
        opType: "BULK_INSERT_INVOICES",
        payload: [],
      },
    ]);
    expect(res.insertions).equal(0);
    expect(res.deletions).equal(0);
    expect(res.errors.length).equal(1);
  });

  it("test BULK_INSERT_INVOICES", async () => {
    ddbMock.on(BatchWriteCommand).resolves();
    const res = await persistEvents([
      {
        opType: "BULK_INSERT_INVOICES",
        payload: [
          {
            paId_invoicingDay:
              "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20",
            invoincingTimestamp_timelineElementId:
              "2023-01-20T14:48:00.000Z_notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1",
            ttl: 1705762080,
            paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            invoicingDay: "2023-01-20",
            invoincingTimestamp: "2023-01-20T14:48:00.000Z",
            iun: "abcd",
            timelineElementId:
              "notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1",
            notificationSentAt: "2023-01-20T14:48:00.000Z",
            timestamp: "2023-01-20T14:48:00.000Z",
            details: { notificationCost: 100 },
            category: "REFINEMENT",
          },
        ],
      },
    ]);
    expect(res.insertions).equal(1);
    expect(res.deletions).equal(0);
    expect(res.errors.length).equal(0);
  });
});
