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

  /*it("test REQUEST ACCEPTED", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)

        event = setCategory(event, "REQUEST_ACCEPTED")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('VALIDATION')
        expect(res[0].opType).equal('DELETE')

        expect(res[1].type).equal('REFINEMENT')
        expect(res[1].opType).equal('INSERT')
    });

    it("test REQUEST ACCEPTED multiple recipients", async () => {
        const eventJSON = fs.readFileSync('./src/test/eventMapper.timeline.json')
        let event = JSON.parse(eventJSON)

        event = setCategory(event, "REQUEST_ACCEPTED")

        const events = [
            event
        ]

        const res = await mapEvents(events)

        expect(res[0].type).equal('VALIDATION')
        expect(res[0].opType).equal('DELETE')

        expect(res[1].type).equal('REFINEMENT')
        expect(res[1].opType).equal('INSERT')

        expect(res[2].type).equal('REFINEMENT')
        expect(res[2].opType).equal('INSERT')
    });
*/
  it("test REQUEST REFUSED", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REQUEST_REFUSED");

    const events = [event];

    const res = await mapEvents(events);

    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("DELETE");
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
    // element 1
    expect(res[1].payload[1].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-02-16"
    );
    expect(res[1].payload[1].invoincingTimestamp_timelineElementId).equal(
      "2023-02-16T09:12:05.283Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0"
    );
    expect(res[1].payload[1].ttl).equal(1708074725);
    expect(res[1].payload[1].invoicingDay).equal("2023-02-16");
    expect(res[1].payload[1].invoincingTimestamp).equal(
      "2023-02-16T09:12:05.283Z"
    );
    // element 2
    expect(res[1].payload[2].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-02-16"
    );
    expect(res[1].payload[2].invoincingTimestamp_timelineElementId).equal(
      "2023-02-16T09:11:38.619Z_SEND_SIMPLE_REGISTERED_LETTER.IUN_abcd.RECINDEX_0"
    );
    expect(res[1].payload[2].ttl).equal(1708074698);
    expect(res[1].payload[2].invoicingDay).equal("2023-02-16");
    expect(res[1].payload[2].invoincingTimestamp).equal(
      "2023-02-16T09:11:38.619Z"
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

  it("test SEND_DIGITAL", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_DIGITAL");

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

    event.dynamodb.NewImage.registeredLetterCode = {
      S: "abcd",
    };

    event.dynamodb.NewImage.deliveryDetailCode = {
      S: "CON080",
    };

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
    expect(res[0].opType).equal("DELETE");
  });
});

function setCategory(event, category) {
  event.dynamodb.NewImage.category = {
    S: category,
  };
  return event;
}
