const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { BatchGetCommand } = require("@aws-sdk/lib-dynamodb");
const fs = require("fs");

const { mapEvents } = require("../app/lib/eventMapper");
const { ddbDocClient } = require("../app/lib/ddbClient.js");

describe("event mapper tests", function () {
  let ddbMock;

  before(() => {
    ddbMock = mockClient(ddbDocClient);
  });

  after(() => {
    ddbMock.restore();
    ddbMock.reset();
  });

  it("test VALIDATION", async () => {
    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.notifications.json"
    );
    const event = JSON.parse(eventJSON);
    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("INSERT");
  });

  it("test REQUEST_REFUSED", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REQUEST_REFUSED");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("DELETE");
    expect(res[1].opType).equal("BULK_INSERT_INVOICES");
    // element 0
    expect(res[1].payload[0].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1"
    );
    expect(res[1].payload[0].ttl).equal(1705762080);
    expect(res[1].payload[0].invoicingDay).equal("2023-01-20");
    expect(res[1].payload[0].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
  });

  it("test REFINEMENT", async () => {
    const batchGetJSON = fs.readFileSync(
      "./src/test/batchGet.timeline.json",
      "utf8"
    );
    const batchGet = JSON.parse(batchGetJSON);
    ddbMock.on(BatchGetCommand).resolves(batchGet);
    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.timeline.json",
      "utf8"
    );
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REFINEMENT");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("REFINEMENT");
    expect(res[0].opType).equal("DELETE");
    expect(res[1].opType).equal("BULK_INSERT_INVOICES");
    // element 0 - refinement - invoice
    expect(res[1].payload[0].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1"
    );
    expect(res[1].payload[0].ttl).equal(1705762080);
    expect(res[1].payload[0].invoicingDay).equal("2023-01-20");
    expect(res[1].payload[0].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[1].payload[0].timestamp).equal(
      res[1].payload[0].invoincingTimestamp
    );
    // element 1 - paper invoice - the timestamp from the first element, not the one from this element
    expect(res[1].payload[1].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[1].payload[1].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_1.ATTEMPT_0"
    );
    expect(res[1].payload[1].ttl).equal(1705762080);
    expect(res[1].payload[1].invoicingDay).equal("2023-01-20");
    expect(res[1].payload[1].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[1].payload[1].invoincingTimestamp).not.equal(
      res[1].payload[1].timestamp
    );
    // element 2 - paper invoice
    expect(res[1].payload[2].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[1].payload[2].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_SEND_SIMPLE_REGISTERED_LETTER.IUN_abcd.RECINDEX_1"
    );
    expect(res[1].payload[2].ttl).equal(1705762080);
    expect(res[1].payload[2].invoicingDay).equal("2023-01-20");
    expect(res[1].payload[2].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[1].payload[2].invoincingTimestamp).not.equal(
      res[1].payload[2].timestamp
    );
    // reset mock
    ddbMock.reset();
  });

  it("test REFINEMENT (batch get returns zero results)", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REFINEMENT");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("REFINEMENT");
    expect(res[0].opType).equal("DELETE");
    expect(res[1].opType).equal("BULK_INSERT_INVOICES");
    expect(res[1].payload[0].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1"
    );
    expect(res[1].payload[0].ttl).equal(1705762080);
    expect(res[1].payload[0].invoicingDay).equal("2023-01-20");
    expect(res[1].payload[0].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[1].payload[0].timestamp).equal(
      res[1].payload[0].invoincingTimestamp
    );
  });

  it("test REFINEMENT (no notificationCost)", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REFINEMENT");
    event.dynamodb.NewImage.details = null;

    const events = [event];
    const res = await mapEvents(events);
    expect(res[0].type).equal("REFINEMENT");
    expect(res[0].opType).equal("DELETE");
    expect(res[1]).equal(undefined);
  });

  it("test NOTIFICATION_VIEWED", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "NOTIFICATION_VIEWED");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("REFINEMENT");
    expect(res[0].opType).equal("DELETE");
  });

  it("test NOTIFICATION_CANCELLED", async () => {
    const batchGetJSON = fs.readFileSync(
      "./src/test/batchGet.timeline.json",
      "utf8"
    );
    const batchGet = JSON.parse(batchGetJSON);
    ddbMock.on(BatchGetCommand).resolves(batchGet);
    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.timeline.json",
      "utf8"
    );
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "NOTIFICATION_CANCELLED");

    const events = [event];

    const res = await mapEvents(events);

    // we expect 4 events: 1 validation and 3 refinements to delete(validation can already have been deleted)
    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("DELETE");
    expect(res[1].type).equal("REFINEMENT");
    expect(res[1].opType).equal("DELETE");
    expect(res[2].type).equal("REFINEMENT");
    expect(res[2].opType).equal("DELETE");
    expect(res[3].type).equal("REFINEMENT");
    expect(res[3].opType).equal("DELETE");

    // payloads
    // element 0
    expect(res[4].payload[0].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[4].payload[0].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1"
    );
    expect(res[4].payload[0].ttl).equal(1705762080);
    expect(res[4].payload[0].invoicingDay).equal("2023-01-20");
    expect(res[4].payload[0].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[4].payload[0].timestamp).equal(
      res[4].payload[0].invoincingTimestamp
    );
    // element 1
    expect(res[4].payload[1].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[4].payload[1].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_1.ATTEMPT_0"
    );
    expect(res[4].payload[1].ttl).equal(1705762080);
    expect(res[4].payload[1].invoicingDay).equal("2023-01-20");
    expect(res[4].payload[1].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[4].payload[1].timestamp).not.equal(
      res[4].payload[1].invoincingTimestamp
    );
    // element 2
    expect(res[4].payload[2].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[4].payload[2].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_SEND_SIMPLE_REGISTERED_LETTER.IUN_abcd.RECINDEX_1"
    );
    expect(res[4].payload[2].ttl).equal(1705762080);
    expect(res[4].payload[2].invoicingDay).equal("2023-01-20");
    expect(res[4].payload[2].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[4].payload[2].timestamp).not.equal(
      res[4].payload[2].invoincingTimestamp
    );
    // we're simulating only for recindex 1
  });

  it("test SEND_DIGITAL_DOMICILE", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_DIGITAL_DOMICILE");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("SEND_PEC");
    expect(res[0].opType).equal("INSERT");
  });

  it("test SEND_DIGITAL_FEEDBACK", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_DIGITAL_FEEDBACK");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("SEND_PEC");
    expect(res[0].opType).equal("DELETE");
  });

  it("test SEND_ANALOG_DOMICILE", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_ANALOG_DOMICILE");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("SEND_PAPER_AR_890");
    expect(res[0].opType).equal("INSERT");
  });

  it("test SEND_ANALOG_FEEDBACK", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_ANALOG_FEEDBACK");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("SEND_PAPER_AR_890");
    expect(res[0].opType).equal("DELETE");
  });

  // it("test DIGITAL_FAILURE_WORKFLOW", async () => {
  //   const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
  //   let event = JSON.parse(eventJSON);
  //   event = setCategory(event, "DIGITAL_FAILURE_WORKFLOW");

  //   event.dynamodb.NewImage.details = {
  //     M: {
  //       recIndex: {
  //         N: 0,
  //       },
  //     },
  //   };
  //   const events = [event];

  //   const res = await mapEvents(events);

  //   expect(res[0].type).equal("SEND_AMR");
  //   expect(res[0].opType).equal("INSERT");
  // });

  it("test SEND_SIMPLE_REGISTERED_LETTER", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_SIMPLE_REGISTERED_LETTER");

    event.dynamodb.NewImage.details = {
      M: {
        recIndex: {
          N: 0,
        },
      },
    };
    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("SEND_AMR");
    expect(res[0].opType).equal("INSERT");
  });

  it("test SEND_SIMPLE_REGISTERED_LETTER_PROGRESS", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS");

    event.dynamodb.NewImage.details = {
      M: {
        recIndex: {
          N: 0,
        },
        registeredLetterCode: {
          S: "abcd",
        },
        deliveryDetailCode: {
          S: "CON080",
        },
      },
    };

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("SEND_AMR");
    expect(res[0].opType).equal("DELETE");
  });
});

function setCategory(event, category) {
  event.dynamodb.NewImage.category = {
    S: category,
  };
  return event;
}
