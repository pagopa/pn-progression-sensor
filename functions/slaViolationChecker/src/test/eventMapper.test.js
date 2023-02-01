const { expect } = require("chai");
const {
  checkRemovedByTTL,
  mapEvents,
  mapEventsFromSQS,
} = require("../app/lib/eventMapper");
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("test check removed by TTL", () => {
  const sampleKinesisEventNotByTTL = {
    kinesisSeqNumber:
      "49637329937448784559035416658086603608349162186672701458",
    awsRegion: "eu-south-1",
    eventID: "509b20a7-42f3-47af-b571-bfdb980d68f4",
    eventName: "REMOVE",
    userIdentity: null,
    recordFormat: "application/json",
    tableName: "pn-ProgressionSensorData",
    dynamodb: {
      ApproximateCreationDateTime: 1674576197043,
      Keys: {},
      OldImage: {},
      SizeBytes: 480,
    },
    eventSource: "aws:dynamodb",
  };

  it("should not be removed by TTL", () => {
    expect(checkRemovedByTTL(sampleKinesisEventNotByTTL)).to.be.false;
  });

  it("should be removed by TTL", () => {
    const sampleKinesisEventByTTL = { ...sampleKinesisEventNotByTTL };
    sampleKinesisEventByTTL.userIdentity = {
      type: "Service",
      principalId: "dynamodb.amazonaws.com",
    };

    expect(checkRemovedByTTL(sampleKinesisEventByTTL)).to.be.true;
  });

  it("should be invalid with kinesis event", () => {
    expect(checkRemovedByTTL("")).to.be.false;
  });

  it("should be invalid with null kinesis event", () => {
    expect(checkRemovedByTTL()).to.be.false;
  });
});

describe("test Kinesis: create SLA Violation or storicize it", function () {
  this.beforeEach(() => {
    ddbMock.reset();
  });

  const kinesisEventRefinement = {
    kinesisSeqNumber:
      "49637329937448784559035416658086603608349162186672701458",
    awsRegion: "eu-south-1",
    eventID: "509b20a7-42f3-47af-b571-bfdb980d68f4",
    eventName: "REMOVE",
    userIdentity: {
      type: "Service",
      principalId: "dynamodb.amazonaws.com",
    },
    recordFormat: "application/json",
    tableName: "pn-ProgressionSensorData",
    dynamodb: {
      ApproximateCreationDateTime: 1674576197043,
      OldImage: {
        entityName_type_relatedEntityId: {
          S: "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1",
        },
        type: { S: "REFINEMENT" },
        id: {
          S: "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted",
        },
        relatedEntityId: { S: "YZPN-ZTVQ-UTGU-202301-Y-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted",
        },
        entityName_type_relatedEntityId: {
          S: "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1",
        },
      },
    },
  };

  const skippedKinesisEvent = {
    ...kinesisEventRefinement,
  };
  delete skippedKinesisEvent.userIdentity;

  const kinesisEventValidation = {
    kinesisSeqNumber:
      "49637329937448784559035416658086603608349162186672701458",
    awsRegion: "eu-south-1",
    eventID: "509b20a7-42f3-47af-b571-bfdb980d68f4",
    eventName: "REMOVE",
    userIdentity: {
      type: "Service",
      principalId: "dynamodb.amazonaws.com",
    },
    recordFormat: "application/json",
    tableName: "pn-ProgressionSensorData",
    dynamodb: {
      ApproximateCreationDateTime: 1674576197043,
      OldImage: {
        entityName_type_relatedEntityId: {
          S: "step##VALIDATION##WEUD-XHKG-ZHDN-202301-W-1",
        },
        type: { S: "VALIDATION" },
        id: {
          S: "00_VALID##WEUD-XHKG-ZHDN-202301-W-1",
        },
        relatedEntityId: { S: "WEUD-XHKG-ZHDN-202301-W-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "00_VALID##WEUD-XHKG-ZHDN-202301-W-1",
        },
        entityName_type_relatedEntityId: {
          S: "step##VALIDATION##WEUD-XHKG-ZHDN-202301-W-1",
        },
      },
    },
  };

  const kinesisEventPEC = {
    kinesisSeqNumber:
      "49637329937448784559035416658086603608349162186672701458",
    awsRegion: "eu-south-1",
    eventID: "509b20a7-42f3-47af-b571-bfdb980d68f4",
    eventName: "REMOVE",
    userIdentity: {
      type: "Service",
      principalId: "dynamodb.amazonaws.com",
    },
    recordFormat: "application/json",
    tableName: "pn-ProgressionSensorData",
    dynamodb: {
      ApproximateCreationDateTime: 1674576197043,
      OldImage: {
        entityName_type_relatedEntityId: {
          S: "step##SEND_PEC##PLDW-UWJP-ATLT-202301-R-1",
        },
        type: { S: "SEND_PEC" },
        id: {
          S: "02_PEC__##PLDW-UWJP-ATLT-202301-R-1_send_digital_domicile_0_source_SPECIAL_attempt_0",
        },
        relatedEntityId: { S: "PLDW-UWJP-ATLT-202301-R-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "02_PEC__##PLDW-UWJP-ATLT-202301-R-1_send_digital_domicile_0_source_SPECIAL_attempt_0",
        },
        entityName_type_relatedEntityId: {
          S: "step##SEND_PEC##PLDW-UWJP-ATLT-202301-R-1",
        },
      },
    },
  };

  const kinesisEventPaper = {
    kinesisSeqNumber:
      "49637329937448784559035416658086603608349162186672701458",
    awsRegion: "eu-south-1",
    eventID: "509b20a7-42f3-47af-b571-bfdb980d68f4",
    eventName: "REMOVE",
    userIdentity: {
      type: "Service",
      principalId: "dynamodb.amazonaws.com",
    },
    recordFormat: "application/json",
    tableName: "pn-ProgressionSensorData",
    dynamodb: {
      ApproximateCreationDateTime: 1674576197043,
      OldImage: {
        entityName_type_relatedEntityId: {
          S: "step##SEND_PAPER_AR_890##GEUY-TJTX-NDUA-202301-N-1",
        },
        type: { S: "SEND_PAPER_AR_890" },
        id: {
          S: "03_PAPER##GEUY-TJTX-NDUA-202301-N-1_send_analog_domicile_0_attempt_0",
        },
        relatedEntityId: { S: "GEUY-TJTX-NDUA-202301-N-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "03_PAPER##GEUY-TJTX-NDUA-202301-N-1_send_analog_domicile_0_attempt_0",
        },
        entityName_type_relatedEntityId: {
          S: "step##SEND_PAPER_AR_890##GEUY-TJTX-NDUA-202301-N-1",
        },
      },
    },
  };

  it("should be correct mapping - insert", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined }); // important: since we are resetting at each test, this must be inside the test

    const processedItems = await mapEvents([
      kinesisEventRefinement,
      skippedKinesisEvent,
      kinesisEventValidation,
      kinesisEventPEC,
      kinesisEventPaper,
    ]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(4);

    // 1: REFINEMENT
    expect(processedItems[0].step_alarmTTL).to.be.undefined;

    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1"
    );
    expect(processedItems[0].type).equal("REFINEMENT");
    expect(processedItems[0].id).equal(
      "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted"
    );
    expect(processedItems[0].sla_relatedEntityId).equal(
      // note: sla_relatedEntityId, not relatedEntityId
      "YZPN-ZTVQ-UTGU-202301-Y-1"
    );
    expect(processedItems[0].startTimestamp).equal(
      "2023-01-24T15:06:12.470719211Z"
    );
    expect(processedItems[0].slaExpiration).equal("2023-07-17T15:06:12.470Z");
    expect(processedItems[0].alarmTTL).equal("2023-07-03T15:06:12.470Z");
    expect(processedItems[0].active_sla_entityName_type).equal("REFINEMENT");
    expect(processedItems[0].opType).equal("INSERT");
    expect(processedItems[0].kinesisSeqNumber).equal(
      "49637329937448784559035416658086603608349162186672701458"
    );

    // 2: VALIDATION
    expect(processedItems[1].type).equal("VALIDATION");
    expect(processedItems[1].sla_relatedEntityId).equal(
      "WEUD-XHKG-ZHDN-202301-W-1"
    );

    // 3: SEND_PEC
    expect(processedItems[2].type).equal("SEND_PEC");
    expect(processedItems[2].sla_relatedEntityId).equal(
      "PLDW-UWJP-ATLT-202301-R-1"
    );

    // 4: SEND_PAPER_AR_890
    expect(processedItems[3].type).equal("SEND_PAPER_AR_890");
    expect(processedItems[3].sla_relatedEntityId).equal(
      "GEUY-TJTX-NDUA-202301-N-1"
    );
  });

  it("should be correct mapping - update", async () => {
    const foundTimestamp = "2023-07-03T15:06:12.470Z";

    ddbMock.on(GetCommand).resolves({ Item: { timestamp: foundTimestamp } });

    const processedItems = await mapEvents([kinesisEventRefinement]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(1);

    // REFINEMENT
    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1"
    );
    expect(processedItems[0].id).equal(
      "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted"
    );

    expect(processedItems[0].active_sla_entityName_type).to.be.undefined; // must have been removed
    expect(processedItems[0].endTimestamp).equal(foundTimestamp);
  });
});

describe("test SQS: storicize SLA Violation", function () {
  this.beforeEach(() => {
    ddbMock.reset();
  });

  const sqsEventRefinement = {
    messageId: "49637329937448784559035416658086603",
    eventName: "REMOVE",
    dynamodb: {
      entityName_type_relatedEntityId:
        "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1",
      type: "REFINEMENT",
      id: "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted",
      relatedEntityId: "YZPN-ZTVQ-UTGU-202301-Y-1",
      startTimestamp: "2023-01-24T15:06:12.470719211Z",
      slaExpiration: "2023-07-17T15:06:12.470Z",
      alarmTTL: "2023-07-03T15:06:12.470Z",
    },
  };

  it("should be correct mapping - update", async () => {
    const foundTimestamp = "2023-07-03T15:06:12.470Z";

    ddbMock.on(GetCommand).resolves({ Item: { timestamp: foundTimestamp } });

    const processedItems = await mapEventsFromSQS([sqsEventRefinement]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(1);

    // REFINEMENT
    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1"
    );
    expect(processedItems[0].id).equal(
      "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted"
    );

    expect(processedItems[0].active_sla_entityName_type).to.be.undefined; // must have been removed
    expect(processedItems[0].endTimestamp).equal(foundTimestamp);
  });
});
