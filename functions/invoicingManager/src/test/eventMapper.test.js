const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { BatchGetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");

const { mapEvents } = require("../app/lib/eventMapper");
const { ddbDocClient } = require("../app/lib/ddbClient.js");

describe("event mapper tests", function () {
  let ddbMock;

  before(() => {
    ddbMock = mockClient(ddbDocClient);
  });

  beforeEach(() => {
    ddbMock.reset();
  });

  after(() => {
    ddbMock.restore();
    ddbMock.reset();
  });

  it("test INFORMAL REQUEST_REFUSED", async () => {
    const eventJSON = fs.readFileSync("./src/test/events/eventMapper.informal.timeline.request_refused.json");
    let event = JSON.parse(eventJSON);

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(1);

    expect(res[0].opType).equal("BULK_INSERT_INVOICES");
    // element 0
    expect(res[0].payload[0].paId_invoicingDay).equal(
        "026e8c72-7944-4dcd-8668-f596447fec6d_2026-01-20"
    );
    expect(res[0].payload[0].invoincingTimestamp_timelineElementId).equal(
        "2026-01-20T14:48:00.000Z_REQUEST_REFUSED.IUN_XLDW-MQYJ-WUKA-202602-A-A"
    );
    expect(res[0].payload[0].ttl).equal(1800456480);
    expect(res[0].payload[0].invoicingDay).equal("2026-01-20");
    expect(res[0].payload[0].invoincingTimestamp).equal(
        "2026-01-20T14:48:00.000Z"
    );
  });

  const WORKFLOW_CLOSURE_CATEGORIES = [
    "WORKFLOW_DONE_UNREACHED",
    "WORKFLOW_DONE_REACHED",
    "WORKFLOW_ENDED_UNDELIVERABLE",
    "WORKFLOW_ENDED_UNREACHED",
    "WORKFLOW_ENDED_REACHED",
  ];

  WORKFLOW_CLOSURE_CATEGORIES.forEach((category) => {
    it(`test WORKFLOW CLOSURE with prior SEND_ANALOG_MESSAGE - category ${category}`, async () => {
      const batchGetJSON = fs.readFileSync(
          "./src/test/events/batchGet.informal.timeline.json",
          "utf8"
      );
      const batchGet = JSON.parse(batchGetJSON);
      ddbMock.on(BatchGetCommand).resolves(batchGet);
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });
      const eventJSON = fs.readFileSync(
          "./src/test/events/eventMapper.informal.timeline.closure.workflow.json",
          "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, category);

      const events = [event];

      const res = await mapEvents(events);

      expect(res.length).equal(1);

      expect(res[0].opType).equal("BULK_INSERT_INVOICES");
      // element 0 - workflow closure - invoice
      expect(res[0].payload[0].paId_invoicingDay).equal(
          "026e8c72-7944-4dcd-8668-f596447fec6d_2026-01-20"
      );
      expect(res[0].payload[0].invoincingTimestamp_timelineElementId).equal(
          "2026-01-20T14:48:00.000Z_workflow;IUN_XLDW-MQYJ-WUKA-202602-A-A;RECINDEX_0"
      );
      expect(res[0].payload[0].ttl).equal(1800456480);
      expect(res[0].payload[0].invoicingDay).equal("2026-01-20");
      expect(res[0].payload[0].invoincingTimestamp).equal(
          "2026-01-20T14:48:00.000Z"
      );
      expect(res[0].payload[0].timestamp).equal(
          res[0].payload[0].invoincingTimestamp
      );
      // element 1 - paper invoice - the timestamp from the first element, not the one from this element
      expect(res[0].payload[1].paId_invoicingDay).equal(
          "026e8c72-7944-4dcd-8668-f596447fec6d_2026-01-20"
      );
      expect(res[0].payload[1].invoincingTimestamp_timelineElementId).equal(
          "2026-01-20T14:48:00.000Z_SEND_ANALOG_MESSAGE.IUN_XLDW-MQYJ-WUKA-202602-A-A.RECINDEX_0.ATTEMPT_0.DELIVERYTYPE_RS"
      );
      expect(res[0].payload[1].ttl).equal(1800456480);
      expect(res[0].payload[1].invoicingDay).equal("2026-01-20");
      expect(res[0].payload[1].invoincingTimestamp).equal(
          "2026-01-20T14:48:00.000Z"
      );
      expect(res[0].payload[1].invoincingTimestamp).not.equal(
          res[0].payload[1].timestamp
      );
      // reset mock
      ddbMock.reset();
    })

    it(`test WORKFLOW CLOSURE without prior SEND_ANALOG_MESSAGE - category ${category}`, async () => {
      const eventJSON = fs.readFileSync(
          "./src/test/events/eventMapper.informal.timeline.closure.workflow.json",
          "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, category);
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const events = [event];

      const res = await mapEvents(events);

      expect(res.length).equal(1);

      expect(res[0].opType).equal("BULK_INSERT_INVOICES");
      expect(res[0].payload[0].paId_invoicingDay).equal(
          "026e8c72-7944-4dcd-8668-f596447fec6d_2026-01-20"
      );
      expect(res[0].payload[0].invoincingTimestamp_timelineElementId).equal(
          "2026-01-20T14:48:00.000Z_workflow;IUN_XLDW-MQYJ-WUKA-202602-A-A;RECINDEX_0"
      );
      expect(res[0].payload[0].ttl).equal(1800456480);
      expect(res[0].payload[0].invoicingDay).equal("2026-01-20");
      expect(res[0].payload[0].invoincingTimestamp).equal(
          "2026-01-20T14:48:00.000Z"
      );
      expect(res[0].payload[0].timestamp).equal(
          res[0].payload[0].invoincingTimestamp
      );
    })

    it(`test WORKFLOW CLOSURE (no notificationCost) - category ${category}`, async () => {
      const eventJSON = fs.readFileSync("./src/test/events/eventMapper.informal.timeline.closure.workflow.json");
      let event = JSON.parse(eventJSON);
      event = setCategory(event, category);
      event.dynamodb.NewImage.details = null;

      const events = [event];
      const res = await mapEvents(events);

      expect(res.length).equal(0);
    });
  });

  it("should skip unsupported timeline category", async () => {
    const eventJSON = fs.readFileSync(
        "./src/test/events/eventMapper.informal.timeline.closure.workflow.json",
        "utf8"
    );
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "UNSUPPORTED_CATEGORY");

    const res = await mapEvents([event]);

    expect(res).to.be.an("array").that.is.empty;
  });
})


function setCategory(event, category) {
  event.dynamodb.NewImage.category = {
    S: category,
  };
  return event;
}
