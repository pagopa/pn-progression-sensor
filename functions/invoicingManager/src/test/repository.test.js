process.env.DYNAMODB_TABLE = "pn-test";
process.env.INFORMAL_INVOICING_DYNAMODB_TABLE = "pn-invoices-test";
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

  afterEach(() => {
    ddbMock.reset();
  });

  after(() => {
    ddbMock.restore();
  });

  it("test GET TIMELINE ITEMS FOUND", async () => {
    const items = [{ iun: "abc", timelineElementId: "id1" }];
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        [TABLES.TIMELINES]: items,
      },
    });
    const res = await getTimelineElements("abc", ["id1", "id2"]);
    expect(res).deep.equals(items);

    const sent = ddbMock.commandCalls(BatchGetCommand)[0].args[0].input;
    expect(sent.RequestItems[TABLES.TIMELINES].Keys).deep.equals([
      { iun: "abc", timelineElementId: "id1" },
      { iun: "abc", timelineElementId: "id2" },
    ]);
  });

  it("test GET TIMELINE ITEMS Not FOUND (no Responses)", async () => {
    ddbMock.on(BatchGetCommand).resolves({});
    const res = await getTimelineElements("abc", ["id1", "id2"]);
    expect(res).equal(null);
  });

  it("test GET TIMELINE ITEMS UnprocessedKeys throws", async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: { [TABLES.TIMELINES]: [] },
      UnprocessedKeys: {
        [TABLES.TIMELINES]: { Keys: [{ iun: "abc", timelineElementId: "id2" }] },
      },
    });
    let error;
    try {
      await getTimelineElements("abc", ["id1", "id2"]);
    } catch (e) {
      error = e;
    }
    expect(error).to.be.instanceOf(Error);
    expect(error.message).equal("DynamoDB did not process all timeline element keys");
  });

  it("test GET TIMELINE ITEMS Error is rethrown", async () => {
    ddbMock.on(BatchGetCommand).rejects(new Error("Test message"));
    let error;
    try {
      await getTimelineElements("abc", ["id1", "id2"]);
    } catch (e) {
      error = e;
    }
    expect(error).to.be.instanceOf(Error);
    expect(error.message).equal("Test message");
  });

  it("test BULK_INSERT_INVOICES ERROR on rejected write", async () => {
    ddbMock.on(BatchWriteCommand).rejects(new Error("abc"));
    const evt = {
      opType: "BULK_INSERT_INVOICES",
      payload: [],
    };
    const res = await persistEvents([evt]);
    expect(res.insertions).equal(0);
    expect(res.errors.length).equal(1);
    expect(res.errors[0]).equal(evt);
    expect(res.errors[0].exception.message).equal("abc");
  });

  it("test BULK_INSERT_INVOICES ERROR on UnprocessedItems", async () => {
    ddbMock.on(BatchWriteCommand).resolves({
      UnprocessedItems: {
        "pn-invoices-test": [{ PutRequest: { Item: { paId: "x" } } }],
      },
    });
    const res = await persistEvents([
      { opType: "BULK_INSERT_INVOICES", payload: [{ paId: "x" }] },
    ]);
    expect(res.insertions).equal(0);
    expect(res.errors.length).equal(1);
    expect(res.errors[0].exception.message).equal(
      `DynamoDB did not process all invoice writes: ${JSON.stringify({
        "pn-invoices-test": [{ PutRequest: { Item: { paId: "x" } } }],
      })}`
    );
  });

  it("test BULK_INSERT_INVOICES with empty UnprocessedItems counts as insertion", async () => {
    ddbMock.on(BatchWriteCommand).resolves({ UnprocessedItems: {} });
    const res = await persistEvents([
      { opType: "BULK_INSERT_INVOICES", payload: [{ paId: "x" }] },
    ]);
    expect(res.insertions).equal(1);
    expect(res.errors.length).equal(0);
  });

  it("test BULK_INSERT_INVOICES mixed success and failure", async () => {
    ddbMock
      .on(BatchWriteCommand)
      .resolvesOnce({})
      .rejectsOnce(new Error("boom"));
    const res = await persistEvents([
      { opType: "BULK_INSERT_INVOICES", payload: [{ paId: "a" }] },
      { opType: "BULK_INSERT_INVOICES", payload: [{ paId: "b" }] },
    ]);
    expect(res.insertions).equal(1);
    expect(res.errors.length).equal(1);
    expect(res.errors[0].payload).deep.equals([{ paId: "b" }]);
  });

  it("test unknown opType is ignored", async () => {
    const res = await persistEvents([{ opType: "UNKNOWN", payload: [] }]);
    expect(res).deep.equals({ insertions: 0, errors: [] });
    expect(ddbMock.commandCalls(BatchWriteCommand).length).equal(0);
  });

  it("test empty events", async () => {
    const res = await persistEvents([]);
    expect(res).deep.equals({ insertions: 0, errors: [] });
  });

  it("test BULK_INSERT_INVOICES", async () => {
    ddbMock.on(BatchWriteCommand).resolves({});
    const item = {
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
    };
    const res = await persistEvents([
      {
        opType: "BULK_INSERT_INVOICES",
        payload: [item],
      },
    ]);
    expect(res.insertions).equal(1);
    expect(res.errors.length).equal(0);

    const sent = ddbMock.commandCalls(BatchWriteCommand)[0].args[0].input;
    expect(sent.RequestItems["pn-invoices-test"]).deep.equals([
      { PutRequest: { Item: item } },
    ]);
  });
});

