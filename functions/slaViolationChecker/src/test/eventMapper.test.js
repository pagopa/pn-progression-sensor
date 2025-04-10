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
          S: "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##0",
        },
        relatedEntityId: { S: "YZPN-ZTVQ-UTGU-202301-Y-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##0",
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

  const kinesisEventValidationWithLookupAddress = {
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
          S: "step##VALIDATION##MKUE-BGQW-XNDN-202302-T-3",
        },
        type: { S: "VALIDATION" },
        id: {
          S: "00_VALID##MKUE-BGQW-XNDN-202302-T-3",
        },
        relatedEntityId: { S: "MKUE-BGQW-XNDN-202302-T-3" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
        hasPhysicalAddressLookup: { BOOL: true },
      },
      Keys: {
        id: {
          S: "00_VALID##MKUE-BGQW-XNDN-202302-T-3",
        },
        entityName_type_relatedEntityId: {
          S: "step##VALIDATION##MKUE-BGQW-XNDN-202302-T-3",
        },
      },
    }
  }

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
          S: "NOT_CHECKED_IUN", // not important for the tests
        },
        type: { S: "SEND_PEC" },
        id: {
          S: "NOT_CHECKED_ID", // not important for the tests
        },
        relatedEntityId: { S: "PLDW-UWJP-ATLT-202301-R-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "NOT_CHECKED_ID", // not important for the tests
        },
        entityName_type_relatedEntityId: {
          S: "NOT_CHECKED_IUN", // not important for the tests
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
          S: "NOT_CHECKED_IUN", // not important for the tests
        },
        type: { S: "SEND_PAPER_AR_890" },
        id: {
          S: "NOT_CHECKED_ID", // not important for the tests
        },
        relatedEntityId: { S: "GEUY-TJTX-NDUA-202301-N-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "NOT_CHECKED_ID", // not important for the tests
        },
        entityName_type_relatedEntityId: {
          S: "NOT_CHECKED_IUN", // not important for the tests
        },
      },
    },
  };

  const kinesisEventAMR = {
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
          S: "XLDW-MQYJ-WUKA-202302-A-1",
        },
        type: { S: "SEND_AMR" },
        id: {
          S: "04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1",
        },
        relatedEntityId: { S: "XLDW-MQYJ-WUKA-202302-A-1" },
        startTimestamp: { S: "2023-01-24T15:06:12.470719211Z" },
        slaExpiration: { S: "2023-07-17T15:06:12.470Z" },
        step_alarmTTL: { N: 1688396772 },
        alarmTTL: { S: "2023-07-03T15:06:12.470Z" },
      },
      Keys: {
        id: {
          S: "04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1",
        },
        entityName_type_relatedEntityId: {
          S: "XLDW-MQYJ-WUKA-202302-A-1",
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
      kinesisEventValidationWithLookupAddress,
      kinesisEventPEC,
      kinesisEventPaper,
    ]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(5);

    // 1: REFINEMENT
    expect(processedItems[0].step_alarmTTL).to.be.undefined;

    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1"
    );
    expect(processedItems[0].type).equal("REFINEMENT");
    expect(processedItems[0].id).equal(
      "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##0"
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
    expect(processedItems[1].hasPhysicalAddressLookup).equal(undefined);

    // 2: VALIDATION WITH PHYSICAL ADDRESS LOOKUP
    expect(processedItems[2].type).equal("VALIDATION");
    expect(processedItems[2].sla_relatedEntityId).equal(
      "MKUE-BGQW-XNDN-202302-T-3"
    );
    expect(processedItems[2].hasPhysicalAddressLookup).equal(true);

    // 3: SEND_PEC
    expect(processedItems[3].type).equal("SEND_PEC");
    expect(processedItems[3].sla_relatedEntityId).equal(
      "PLDW-UWJP-ATLT-202301-R-1"
    );

    // 4: SEND_PAPER_AR_890
    expect(processedItems[4].type).equal("SEND_PAPER_AR_890");
    expect(processedItems[4].sla_relatedEntityId).equal(
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
      "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##0"
    );

    expect(processedItems[0].active_sla_entityName_type).to.be.undefined; // must have been removed
    expect(processedItems[0].endTimeStamp).equal(foundTimestamp);
  });

  it("should be correct mapping with SEND_AMR - update", async () => {
    const foundTimestamp = "2023-07-03T15:06:12.470Z";

    ddbMock.on(GetCommand).resolves({
      Item: {
        timestamp: foundTimestamp,
        details: {
          registeredLetterCode: "abcd",
          deliveryDetailCode: "CON080",
        },
      },
    });

    const processedItems = await mapEvents([kinesisEventAMR]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(1);

    // SEND_AMR
    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "XLDW-MQYJ-WUKA-202302-A-1"
    );
    expect(processedItems[0].id).equal("04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1");

    // must have been removed, because we're updating
    // (it won't be undefined if registeredLetterCode is not present
    expect(processedItems[0].active_sla_entityName_type).to.be.undefined;
    expect(processedItems[0].endTimeStamp).equal(foundTimestamp);
  });

  it("should be correct mapping with SEND_AMR - update, no registeredLetterCode at idx 1, nothing found at idx 2", async () => {
    const foundTimestamp = "2023-07-03T15:06:12.470Z";

    const paramsCall1 = {
      TableName: "pn-Timelines",
      Key: {
        iun: "XLDW-MQYJ-WUKA-202302-A-1",
        timelineElementId:
          "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_1",
      },
    };
    const paramsCall2 = {
      TableName: "pn-Timelines",
      Key: {
        iun: "XLDW-MQYJ-WUKA-202302-A-1",
        timelineElementId:
          "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_2",
      },
    };

    ddbMock.on(GetCommand, paramsCall1).resolves({
      Item: {
        timestamp: foundTimestamp,
        details: {},
      },
    });
    ddbMock.on(GetCommand, paramsCall2).resolves({
      // Item undefined, or also "Item: null"
    });

    const processedItems = await mapEvents([kinesisEventAMR]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(1);

    // SEND_AMR
    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "XLDW-MQYJ-WUKA-202302-A-1"
    );
    expect(processedItems[0].id).equal("04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1");

    // not removed
    expect(processedItems[0].active_sla_entityName_type).not.to.be.undefined;
    expect(processedItems[0].endTimeStamp).to.be.undefined;
  });

  it("should be correct mapping with SEND_AMR - update, no registeredLetterCode at idx 1, actually found at ids 2", async () => {
    const foundTimestamp = "2023-07-03T15:06:12.470Z";

    const paramsCall1 = {
      TableName: "pn-Timelines",
      Key: {
        iun: "XLDW-MQYJ-WUKA-202302-A-1",
        timelineElementId:
          "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_1",
      },
    };
    const paramsCall2 = {
      TableName: "pn-Timelines",
      Key: {
        iun: "XLDW-MQYJ-WUKA-202302-A-1",
        timelineElementId:
          "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_2",
      },
    };

    ddbMock.on(GetCommand, paramsCall1).resolves({
      Item: {
        timestamp: foundTimestamp,
        details: {},
      },
    });
    ddbMock.on(GetCommand, paramsCall2).resolves({
      Item: {
        timestamp: foundTimestamp,
        details: {
          registeredLetterCode: "abcd",
          deliveryDetailCode: "CON080",
        },
      },
    });

    const processedItems = await mapEvents([kinesisEventAMR]);
    console.log("processed items: ", processedItems);

    expect(processedItems.length).equal(1);

    // SEND_AMR
    expect(processedItems[0].entityName_type_relatedEntityId).equal(
      "XLDW-MQYJ-WUKA-202302-A-1"
    );
    expect(processedItems[0].id).equal("04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1");

    // not removed
    expect(processedItems[0].active_sla_entityName_type).to.be.undefined;
    expect(processedItems[0].endTimeStamp).equal(foundTimestamp);
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
    expect(processedItems[0].endTimeStamp).equal(foundTimestamp);
  });
});
