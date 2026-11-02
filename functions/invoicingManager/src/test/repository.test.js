process.env.DYNAMODB_TABLE = "pn-test";
process.env.INVOICING_DYNAMODB_TABLE = "pn-invoices-test";
process.env.REGION = "eu-central-1";

const { mockClient } = require("aws-sdk-client-mock");
const {
  BatchGetCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { expect } = require("chai");

const {
  persistEvents,
  getTimelineElements,
  TABLES,
} = require("../app/lib/repository");
const { ddbDocClient } = require("../app/lib/ddbClient.js");

describe("repository tests", function () {
  let ddbMock;

  before(() => {
    ddbMock = mockClient(ddbDocClient);
  });

  after(() => {
    ddbMock.restore();
    ddbMock.reset();
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
