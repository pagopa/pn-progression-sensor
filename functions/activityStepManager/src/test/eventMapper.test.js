const { expect } = require("chai");
const { mockClient } = require("aws-sdk-client-mock");
const { BatchGetCommand, QueryCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
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

  it("test VALIDATION", async () => {
    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.notifications.json"
    );
    const event = JSON.parse(eventJSON);
    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(1);

    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("INSERT");
  });

  it("test REQUEST_REFUSED", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REQUEST_REFUSED");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(2);

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
     ddbMock.on(QueryCommand).resolves({
              Items: [],
            });
    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.timeline.json",
      "utf8"
    );
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REFINEMENT");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(2);

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

  it("test REFINEMENT rework attempt 0 without old attempt 1", async () => {
      const batchGetJSON = fs.readFileSync(
        "./src/test/batchGetRework.timeline.json",
        "utf8"
      );
      const batchGet = JSON.parse(batchGetJSON);
      ddbMock.on(BatchGetCommand).resolves(batchGet);
      ddbMock.on(QueryCommand).resolves({
        Items: [{iun: 'abcd', timestamp: '2025-05-02T00:00:00Z', timelineElementId: 'NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0', details: {recIndex:0, sentAttemptMade:0, invalidatedTimelineAndStatusHistory:[{
            relatedTimelineElements: ["REFINEMENT.IUN_abcd.RECINDEX_0.ATTEMPT_0"]
        }] }}],
      });
      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT")

      const events = [event];

      const res = await mapEvents(events);

      expect(res.length).equal(2);

      expect(res[0].type).equal("REFINEMENT");
      expect(res[0].opType).equal("DELETE");
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload[0].invoicingType).equal("NEW");
      // element 0 - refinement - invoice
      expect(res[1].payload[0].paId_invoicingDay).equal(
        "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
      );
      expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_REFINEMENT.IUN_abcd.RECINDEX_0"
      );
      expect(res[1].payload[0].ttl).equal(1705762080);
      expect(res[1].payload[0].invoicingDay).equal("2023-01-20");
      expect(res[1].payload[0].timestamp).equal(
        res[1].payload[0].invoincingTimestamp
      );

      expect(res[1].payload[1].invoicingType).equal("NEW");
      // element 0 - refinement - invoice
      expect(res[1].payload[1].paId_invoicingDay).equal(
        "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
      );
      expect(res[1].payload[1].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1"
      );
      expect(res[1].payload[1].ttl).equal(1705762080);
      expect(res[1].payload[1].invoicingDay).equal("2023-01-20");
    
      // reset mock
      ddbMock.reset();
    });

    it("test REFINEMENT rework attempt 0 with old attempt 1", async () => {
      const batchGetJSON = fs.readFileSync(
        "./src/test/batchGetRework.timeline.json",
        "utf8"
      );
      const batchGet = JSON.parse(batchGetJSON);
      ddbMock.on(BatchGetCommand).resolves(batchGet);
      ddbMock.on(QueryCommand).resolves({
        Items: [{iun: 'abcd', timestamp: '2025-05-02T00:00:00Z',  timelineElementId: 'NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0', details: {recIndex:0, sentAttemptMade:0, invalidatedTimelineAndStatusHistory:[{
            relatedTimelineElements: ["REFINEMENT.IUN_abcd.RECINDEX_0.ATTEMPT_0", "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1"]
        }] }}],
      });
      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT")

      const events = [event];

      const res = await mapEvents(events);

      expect(res.length).equal(2);

      expect(res[0].type).equal("REFINEMENT");
      expect(res[0].opType).equal("DELETE");
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload.length).equal(2);
      expect(res[1].payload[0].invoicingType).equal("NEW");
      // element 0 - refinement - invoice
      expect(res[1].payload[0].paId_invoicingDay).equal(
        "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
      );
      expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_REFINEMENT.IUN_abcd.RECINDEX_0"
      );
      expect(res[1].payload[0].ttl).equal(1705762080);
      expect(res[1].payload[0].invoicingDay).equal("2023-01-20");
      expect(res[1].payload[0].invoincingTimestamp).equal(
        "2023-01-20T14:48:00.000Z"
      );
      expect(res[1].payload[0].timestamp).equal(
        res[1].payload[0].invoincingTimestamp
      );

      expect(res[1].payload[1].invoicingType).equal("NEW");
      expect(res[1].payload[1].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1"
      );
    
      // reset mock
      ddbMock.reset();
    });

    it("test REFINEMENT rework - both ATTEMPT_0 and ATTEMPT_1 invalidated", async () => {
      ddbMock.on(BatchGetCommand).resolves({
        Responses: {
          "pn-Timelines": [
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0",
              timestamp: "2023-02-16T09:12:05.283425635Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1.REWORK_0",
              timestamp: "2023-02-16T09:11:38.619808042Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
          ],
        },
      });
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            iun: "abcd",
            timelineElementId:
              "NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0",
            timestamp: '2025-05-02T00:00:00Z' ,
            details: {
              recIndex: 0,
              sentAttemptMade: 0,
              invalidatedTimelineAndStatusHistory: [
                {
                  relatedTimelineElements: [
                    "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0",
                    "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1",
                  ],
                },
              ],
            },
          },
        ],
      });

      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT");

      const res = await mapEvents([event]);

      expect(res.length).equal(2);
      expect(res[0].type).equal("REFINEMENT");
      expect(res[0].opType).equal("DELETE");
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");

      // refinement + 2 SEND_ANALOG_DOMICILE fetched
      expect(res[1].payload.length).equal(3);
      const ids = res[1].payload.map((p) => p.invoincingTimestamp_timelineElementId);
      expect(ids.some((id) => id.includes("REFINEMENT.IUN_abcd.RECINDEX_0"))).to.be.true;
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0")
        )
      ).to.be.true;
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1.REWORK_0")
        )
      ).to.be.true;

      // all must be marked as NEW
      res[1].payload.forEach((p) => expect(p.invoicingType).equal("NEW"));
      ddbMock.reset();
    });

    it("test REFINEMENT rework - only ATTEMPT_0 invalidated", async () => {
      ddbMock.on(BatchGetCommand).resolves({
        Responses: {
          "pn-Timelines": [
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0",
              timestamp: "2023-02-16T09:12:05.283425635Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1",
              timestamp: "2023-02-16T09:11:38.619808042Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
          ],
        },
      });
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            iun: "abcd",
            timelineElementId:
              "NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0",
            timestamp: '2025-05-02T00:00:00Z',
            details: {
              recIndex: 0,
              sentAttemptMade: 0,
              invalidatedTimelineAndStatusHistory: [
                {
                  relatedTimelineElements: [
                    "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0",
                  ],
                },
              ],
            },
          },
        ],
      });

      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT");

      const res = await mapEvents([event]);

      expect(res.length).equal(2);
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload.length).equal(3);

      const ids = res[1].payload.map((p) => p.invoincingTimestamp_timelineElementId);
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0")
        )
      ).to.be.true;
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1") &&
          !id.includes("ATTEMPT_1.REWORK_0")
        )
      ).to.be.true;

      res[1].payload.forEach((p) => expect(p.invoicingType).equal("NEW"));
      ddbMock.reset();
    });

    it("test REFINEMENT rework - only ATTEMPT_1 invalidated", async () => {
      ddbMock.on(BatchGetCommand).resolves({
        Responses: {
          "pn-Timelines": [
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1.REWORK_0",
              timestamp: "2023-02-16T09:11:38.619808042Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
          ],
        },
      });
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            iun: "abcd",
            timelineElementId:
              "NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_1.REWORK_0",
            timestamp: '2025-05-02T00:00:00Z',
            details: {
              recIndex: 0,
              sentAttemptMade: 1,
              invalidatedTimelineAndStatusHistory: [
                {
                  relatedTimelineElements: [
                    "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1.REWORK_0",
                    "REFINEMENT.IUN_abcd.RECINDEX_0.REWORK_0",
                  ],
                },
              ],
            },
          },
        ],
      });

      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT");

      const res = await mapEvents([event]);

      expect(res.length).equal(2);
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload.length).equal(2);

      const ids = res[1].payload.map((p) => p.invoincingTimestamp_timelineElementId);
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1.REWORK_0")
        )
      ).to.be.true;
      res[1].payload.forEach((p) => expect(p.invoicingType).equal("NEW"));
      ddbMock.reset();
    });

    it("test REFINEMENT rework ignores invalidated SEND_ANALOG for other recipient indexes", async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            iun: "abcd",
            timelineElementId:
              "NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_1.ATTEMPT_1.REWORK_0",
            timestamp: '2025-05-02T00:00:00Z',
            details: {
              recIndex: 1,
              sentAttemptMade: 1,
              invalidatedTimelineAndStatusHistory: [
                {
                  relatedTimelineElements: [
                    "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_10.ATTEMPT_1",
                  ],
                },
              ],
            },
          },
        ],
      });

      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      event.dynamodb.NewImage.timelineElementId = {
        S: "REFINEMENT.IUN_abcd.RECINDEX_1",
      };

      const res = await mapEvents([event]);

      expect(res.length).equal(2);
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload.length).equal(1);
      expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_REFINEMENT.IUN_abcd.RECINDEX_1"
      );
      expect(ddbMock.commandCalls(BatchGetCommand)).to.have.length(0);
      ddbMock.reset();
    });

    it("test REFINEMENT rework parses invalidated SEND_ANALOG from DynamoDB M/L shape", async () => {
      ddbMock.on(BatchGetCommand).resolves({
        Responses: {
          "pn-Timelines": [
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0",
              timestamp: "2023-02-16T09:12:05.283425635Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
            {
              iun: "abcd",
              timelineElementId: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1",
              timestamp: "2023-02-16T09:11:38.619808042Z",
              category: "SEND_ANALOG_DOMICILE",
              details: { recIndex: 0 },
              paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
            },
          ],
        },
      });
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            iun: "abcd",
            timelineElementId:
              "NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0",
            timestamp: '2025-05-02T00:00:00Z',
            details: {
              recIndex: 0,
              sentAttemptMade: 0,
              invalidatedTimelineAndStatusHistory: {
                L: [
                  {
                    M: {
                      relatedTimelineElements: {
                        L: [
                          {
                            S: "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0",
                          },
                          {
                            S: "OTHER_TIMELINE_ELEMENT.IUN_abcd.RECINDEX_0",
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      });

      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT");

      const res = await mapEvents([event]);

      expect(res.length).equal(2);
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload.length).equal(3);

      const ids = res[1].payload.map(
        (p) => p.invoincingTimestamp_timelineElementId
      );
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0")
        )
      ).to.be.true;
      expect(
        ids.some((id) =>
          id.includes("SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1")
        )
      ).to.be.true;
      ddbMock.reset();
    });

  it("test REFINEMENT rework attempt 1", async () => {
      const batchGetJSON = fs.readFileSync(
        "./src/test/batchGetRework.timeline.json",
        "utf8"
      );
      const batchGet = JSON.parse(batchGetJSON);
      ddbMock.on(BatchGetCommand).resolves(batchGet);
         ddbMock.on(QueryCommand).resolvesOnce({
              Items: [{iun: 'abcd', timestamp: '2025-05-02T00:00:00Z', timelineElementId: 'NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0', details: {recIndex:0, sentAttemptMade:0, invalidatedTimelineAndStatusHistory:[{
                relatedTimelineElements: ["REFINEMENT.IUN_abcd.RECINDEX_0.ATTEMPT_0", "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1"]
              }] }}],
              }).resolves({
              Items: [],
              });
      const eventJSON = fs.readFileSync(
        "./src/test/eventMapper.timeline.json",
        "utf8"
      );
      let event = JSON.parse(eventJSON);
      event = setCategory(event, "REFINEMENT");
      setTimelineElementId(event, "REFINEMENT")

      const events = [event];

      const res = await mapEvents(events);

      expect(res.length).equal(2);

      expect(res[0].type).equal("REFINEMENT");
      expect(res[0].opType).equal("DELETE");
      expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
      expect(res[1].payload.length).equal(2);
      expect(res[1].payload[0].invoicingType).equal("NEW");
      // element 0 - refinement - invoice
      expect(res[1].payload[0].paId_invoicingDay).equal(
        "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
      );
      expect(res[1].payload[0].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_REFINEMENT.IUN_abcd.RECINDEX_0"
      );
      expect(res[1].payload[0].ttl).equal(1705762080);
      expect(res[1].payload[0].invoicingDay).equal("2023-01-20");
      expect(res[1].payload[0].invoincingTimestamp).equal(
        "2023-01-20T14:48:00.000Z"
      );
      expect(res[1].payload[0].timestamp).equal(
        res[1].payload[0].invoincingTimestamp
      );

      expect(res[1].payload[1].invoicingType).equal("NEW");
      expect(res[1].payload[1].invoincingTimestamp_timelineElementId).equal(
        "2023-01-20T14:48:00.000Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1"
      );
    
      // reset mock
      ddbMock.reset();
    });

  it("test REFINEMENT (batch get returns zero results)", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REFINEMENT");
     ddbMock.on(QueryCommand).resolves({
                  Items: [],
                });

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(2);

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

    expect(res.length).equal(1);
    expect(res[0].type).equal("REFINEMENT");
    expect(res[0].opType).equal("DELETE");
    expect(res[1]).equal(undefined);
  });

  it("test NOTIFICATION_VIEWED", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
     ddbMock.on(QueryCommand).resolves({
                  Items: [],
                });
    event = setCategory(event, "NOTIFICATION_VIEWED");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(14);

    expect(res[0].type).equal("REFINEMENT"); // used for creating the key for DynamoDB later: it must be REFINEMENT, not NOTIFICATION_VIEWED
    expect(res[0].opType).equal("DELETE");

    expect(res[0].id).equal("01_REFIN##abcd##1");

    // invoices
    expect(res[1].opType).equal("BULK_INSERT_INVOICES");

    // pec
    for (let index = 2; index < res.length; index++) {
      console.log("pec: ", res[index]);
      expect(res[index].type).equal("SEND_PEC");
      expect(res[index].opType).equal("DELETE");

      // expect  res[index].id to start with
      // 02_PEC__##SEND_DIGITAL.IUN_abcd.RECINDEX_
      expect(
        res[index].id.startsWith("02_PEC__##SEND_DIGITAL.IUN_abcd.RECINDEX_")
      ).to.be.true;
    }
  });

  it("test NOTIFICATION_CANCELLED", async () => {
    const batchGetJSON = fs.readFileSync(
      "./src/test/batchGet.timeline.json",
      "utf8"
    );
     ddbMock.on(QueryCommand).resolves({
                  Items: [],
                });
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

    // payloads
    // element 0
    expect(res[3].payload[0].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[3].payload[0].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1"
    );
    expect(res[3].payload[0].ttl).equal(1705762080);
    expect(res[3].payload[0].invoicingDay).equal("2023-01-20");
    expect(res[3].payload[0].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[3].payload[0].timestamp).equal(
      res[3].payload[0].invoincingTimestamp
    );
    // element 1
    expect(res[3].payload[1].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[3].payload[1].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_1.ATTEMPT_0"
    );
    expect(res[3].payload[1].ttl).equal(1705762080);
    expect(res[3].payload[1].invoicingDay).equal("2023-01-20");
    expect(res[3].payload[1].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[3].payload[1].timestamp).not.equal(
      res[3].payload[1].invoincingTimestamp
    );
    // element 2
    expect(res[3].payload[2].paId_invoicingDay).equal(
      "026e8c72-7944-4dcd-8668-f596447fec6d_2023-01-20"
    );
    expect(res[3].payload[2].invoincingTimestamp_timelineElementId).equal(
      "2023-01-20T14:48:00.000Z_SEND_SIMPLE_REGISTERED_LETTER.IUN_abcd.RECINDEX_1"
    );
    expect(res[3].payload[2].ttl).equal(1705762080);
    expect(res[3].payload[2].invoicingDay).equal("2023-01-20");
    expect(res[3].payload[2].invoincingTimestamp).equal(
      "2023-01-20T14:48:00.000Z"
    );
    expect(res[3].payload[2].timestamp).not.equal(
      res[3].payload[2].invoincingTimestamp
    );
    // we're simulating only for recindex 1
    ddbMock.reset();
  });

  it("test CANCELLED with rework attempt 0 without old attempt 1", async () => {
      ddbMock.on(QueryCommand).resolvesOnce({
        Items: [{iun: 'abcd', timestamp: '2025-05-02T00:00:00Z', timelineElementId: 'NOTIFICATION_TIMELINE_REWORKED.IUN_abcd.RECINDEX_0.ATTEMPT_0.REWORK_0', details: {recIndex:0, sentAttemptMade:0, invalidatedTimelineAndStatusHistory:[{
          relatedTimelineElements: ["REFINEMENT.IUN_abcd.RECINDEX_0.ATTEMPT_0"]
        }] }}],
        }).resolves({
        Items: [],
        });

    const batchGetReworkJSON = fs.readFileSync(
             "./src/test/batchGetRework.timeline.json",
             "utf8"
           );
      const batchGetJSON = fs.readFileSync(
             "./src/test/batchGet.timeline.json",
             "utf8"
           );

     const batchGet = JSON.parse(batchGetJSON);
     const batchGetRework = JSON.parse(batchGetReworkJSON);
     ddbMock.on(BatchGetCommand).resolvesOnce(batchGetRework).resolves(batchGet);
     const eventJSON = fs.readFileSync(
       "./src/test/eventMapper.timeline.json",
       "utf8"
     );
     let event = JSON.parse(eventJSON);
     event = setCategory(event, "NOTIFICATION_CANCELLED");
     event.dynamodb.NewImage.timelineElementId = {
      S: "NOTIFICATION_CANCELLED.IUN_abcd"
    }

     const events = [event];

     const res = await mapEvents(events);

     // we expect 4 events: 1 validation and 3 refinements to delete(validation can already have been deleted)
     expect(res[0].type).equal("VALIDATION");
     expect(res[0].opType).equal("DELETE");
     expect(res[1].type).equal("REFINEMENT");
     expect(res[1].opType).equal("DELETE");
     expect(res[2].type).equal("REFINEMENT");
     expect(res[2].opType).equal("DELETE");
     expect(res[4].opType).equal("BULK_INSERT_REWORKED_INVOICES");
     expect(res[3].opType).equal("BULK_INSERT_INVOICES");

     expect(res[3].payload[0].invoincingTimestamp_timelineElementId).contain(
       "NOTIFICATION_CANCELLED"
     );
     expect(res[3].payload[1].invoincingTimestamp_timelineElementId).contain(
       "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_1.ATTEMPT_0"
     );
     expect(res[3].payload[2].invoincingTimestamp_timelineElementId).contain(
       "SEND_SIMPLE_REGISTERED_LETTER"
     );
     expect(res[4].payload[1].invoincingTimestamp_timelineElementId).contain(
       "NOTIFICATION_CANCELLED"
     );
     expect(res[4].payload[0].invoincingTimestamp_timelineElementId).contain(
       "SEND_ANALOG_DOMICILE.IUN_abcd.RECINDEX_0.ATTEMPT_1"
     );

     expect(res[3].payload[0].invoicingType).to.be.undefined;
     expect(res[3].payload[1].invoicingType).to.be.undefined;
     expect(res[3].payload[2].invoicingType).to.be.undefined;
     expect(res[4].payload[0].invoicingType).equal("NEW");
     expect(res[4].payload[1].invoicingType).equal("NEW");
     
     // we're simulating only for recindex 1
     ddbMock.reset();
    });

  it("test SEND_DIGITAL_DOMICILE", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_DIGITAL_DOMICILE");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(1);

    expect(res[0].type).equal("SEND_PEC");
    expect(res[0].opType).equal("INSERT");
  });

  it("test SEND_DIGITAL_FEEDBACK", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_DIGITAL_FEEDBACK");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(1);

    expect(res[0].type).equal("SEND_PEC");
    expect(res[0].opType).equal("DELETE");
  });

  it("test SEND_ANALOG_DOMICILE", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_ANALOG_DOMICILE");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(1);

    expect(res[0].type).equal("SEND_PAPER_AR_890");
    expect(res[0].opType).equal("INSERT");
  });

  it("test SEND_ANALOG_FEEDBACK", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_ANALOG_FEEDBACK");

    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(1);

    expect(res[0].type).equal("SEND_PAPER_AR_890");
    expect(res[0].opType).equal("DELETE");
  });

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

    expect(res.length).equal(1);

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

    expect(res.length).equal(1);

    expect(res[0].type).equal("SEND_AMR");
    expect(res[0].opType).equal("DELETE");
  });

  it("test NOTIFICATION_TIMELINE_REWORKED", async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        "pn-Timelines": [
          {
            iun: "IUN1",
            timelineElementId: "SEND_ANALOG_DOMICILE.IUN_IUN1.RECINDEX_0.ATTEMPT_1",
            timestamp: "2023-02-16T09:11:38.619808042Z",
            category: "SEND_ANALOG_DOMICILE",
            details: { recIndex: 0 },
            paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
          },
        ],
      },
    });
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event.dynamodb.NewImage.iun = { S: "IUN1" };
    event.dynamodb.NewImage.timelineElementId = { S: "NOTIFICATION_TIMELINE_REWORKED.IUN_IUN1.RECINDEX_0.ATTEMTPT_0.REWORK_0" };
    event = setCategory(event, "NOTIFICATION_TIMELINE_REWORKED");
    event.dynamodb.NewImage.details = {
        M: {
          invalidatedTimelineAndStatusHistory: {
            L: [
              {
                M: {
                  relatedTimelineElements: {
                    L: [
                      { S: "ANALOG_WORKFLOW_RECIPIENT_DECEASED.IUN_IUN1.RECINDEX_0" },
                      { S: "REFINEMENT.IUN_IUN1.RECINDEX_1" },
                      { S: "ELEM_X" }
                    ]
                  }
                }
              },
              {
                M: {
                  relatedTimelineElements: {
                    L: [
                      { S: "SEND_ANALOG_DOMICILE.IUN_IUN1.RECINDEX_0.ATTEMPT_1" },
                      { S: "SEND_ANALOG_DOMICILE.IUN_IUN1.RECINDEX_0.ATTEMPT_0" }
                    ]
                  }
                }
              },
              {
                M: {
                  relatedTimelineElements: {
                    L: [
                      { S: "ELEM_J" },
                      { S: "ELEM_P" },
                      { S: "ELEM_Q" }
                    ]
                  }
                }
              }
            ]
          }
        }
    };
    const events = [event];

    const res = await mapEvents(events);

    expect(res.length).equal(2);
    expect(res[0].type).equal("REFINEMENT");
    expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
    expect(res[1].payload.length).equal(1);
    res[1].payload.forEach(item => expect(item.invoicingType).equal("INVALIDATED"));
    res[1].payload.forEach(item => expect(item.iun).equal("IUN1"));
    res[1].payload.forEach(item => expect(item.invoincingTimestamp).equal(res[1].payload[0].invoincingTimestamp));
    const ids = res[1].payload.map(item => item.invoincingTimestamp_timelineElementId);
    expect(ids.some(id => id.includes("SEND_ANALOG_DOMICILE.IUN_IUN1.RECINDEX_0.ATTEMPT_1"))).to.be.true;
    ddbMock.reset();
  });

  it("test NOTIFICATION_TIMELINE_REWORKED does not match RECINDEX_10 for recipient 1", async () => {
    ddbMock.on(BatchGetCommand).resolves({
      Responses: {
        "pn-Timelines": [
          {
            iun: "IUN1",
            timelineElementId: "REFINEMENT.IUN_IUN1.RECINDEX_1",
            timestamp: "2023-02-16T09:11:38.619808042Z",
            category: "REFINEMENT",
            details: { notificationCost: 100 },
            paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
          },
        ],
      },
    });

    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event.dynamodb.NewImage.iun = { S: "IUN1" };
    event.dynamodb.NewImage.timelineElementId = {
      S: "NOTIFICATION_TIMELINE_REWORKED.IUN_IUN1.RECINDEX_1.ATTEMPT_0.REWORK_0",
    };
    event = setCategory(event, "NOTIFICATION_TIMELINE_REWORKED");
    event.dynamodb.NewImage.details = {
      M: {
        invalidatedTimelineAndStatusHistory: {
          L: [
            {
              M: {
                relatedTimelineElements: {
                  L: [
                    { S: "REFINEMENT.IUN_IUN1.RECINDEX_1" },
                    { S: "SEND_ANALOG_DOMICILE.IUN_IUN1.RECINDEX_1.ATTEMPT_1" },
                  ],
                },
              },
            },
          ],
        },
      },
    };

    const res = await mapEvents([event]);

    expect(res.length).equal(2);
    expect(res[1].opType).equal("BULK_INSERT_REWORKED_INVOICES");
    expect(res[1].payload.length).equal(1);
    expect(res[1].payload[0].timelineElementId).equal(
      "REFINEMENT.IUN_IUN1.RECINDEX_1"
    );

    const batchGetCalls = ddbMock.commandCalls(BatchGetCommand);
    expect(batchGetCalls).to.have.length(1);
    const requestedIds = batchGetCalls[0].args[0].input.RequestItems["pn-Timelines"].Keys.map(
      (key) => key.timelineElementId
    );
    expect(requestedIds).to.deep.equal([
      "REFINEMENT.IUN_IUN1.RECINDEX_1",
      "SEND_ANALOG_DOMICILE.IUN_IUN1.RECINDEX_1.ATTEMPT_1"
    ]);
    ddbMock.reset();
  });

  it("should skip NOTIFICATIONS records with communicationType present", async () => {
    const event = {
      eventName: "INSERT",
      tableName: "pn-Notifications",
      dynamodb: {
        NewImage: {
          iun: { S: "testIUN" },
          communicationType: { S: "EMAIL" }
        }
      },
      kinesisSeqNumber: "seq123"
    };

    const res = await mapEvents([event]);
    expect(res).to.be.an("array").that.is.empty;
  });

  it("test REQUEST_ACCEPTED", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        iun: "abcd",
        recipients: [{}, {}],
      },
    });

    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.timeline.json",
      "utf8"
    );
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REQUEST_ACCEPTED");

    const res = await mapEvents([event]);

    expect(res.length).equal(3);
    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("DELETE");
    expect(res[1].type).equal("REFINEMENT");
    expect(res[1].opType).equal("INSERT");
    expect(res[1].id).equal("01_REFIN##abcd##0");
    expect(res[2].type).equal("REFINEMENT");
    expect(res[2].opType).equal("INSERT");
    expect(res[2].id).equal("01_REFIN##abcd##1");
  });

  it("test REQUEST_ACCEPTED without recipients", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        iun: "abcd",
      },
    });

    const eventJSON = fs.readFileSync(
      "./src/test/eventMapper.timeline.json",
      "utf8"
    );
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "REQUEST_ACCEPTED");

    const res = await mapEvents([event]);

    expect(res.length).equal(1);
    expect(res[0].type).equal("VALIDATION");
    expect(res[0].opType).equal("DELETE");
  });

  it("should skip unsupported timeline category", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "UNSUPPORTED_CATEGORY");

    const res = await mapEvents([event]);

    expect(res).to.be.an("array").that.is.empty;
  });

  it("test SEND_SIMPLE_REGISTERED_LETTER_PROGRESS without registeredLetterCode", async () => {
    const eventJSON = fs.readFileSync("./src/test/eventMapper.timeline.json");
    let event = JSON.parse(eventJSON);
    event = setCategory(event, "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS");

    event.dynamodb.NewImage.details = {
      M: {
        recIndex: {
          N: 0,
        },
        deliveryDetailCode: {
          S: "CON080",
        },
      },
    };

    const res = await mapEvents([event]);

    expect(res.length).equal(0);
  });
});

function setCategory(event, category) {
  event.dynamodb.NewImage.category = {
    S: category,
  };
  return event;
}
function setTimelineElementId(event, category) {
  event.dynamodb.NewImage.timelineElementId = {
      S: category + ".IUN_abcd.RECINDEX_0"
    };
}
