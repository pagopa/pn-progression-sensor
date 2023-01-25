const { expect } = require("chai");
const { checkRemovedByTTL, mapEvents } = require("../app/lib/eventMapper");

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

describe("test check removed by TTL", () => {
  const kinesisEvent = {
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
        alarmTTLYearToMinute: { S: "2023-07-03T15:06" },
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
    ...kinesisEvent,
  };
  delete skippedKinesisEvent.userIdentity;

  const processedItems = mapEvents([kinesisEvent, skippedKinesisEvent]);
  console.log("processed items: ", processedItems);

  expect(processedItems.length).equal(1);
  expect(processedItems[0].step_alarmTTL).to.be.undefined;

  expect(processedItems[0].entityName_type_relatedEntityId).equal(
    "step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1"
  ),
    expect(processedItems[0].type).equal("REFINEMENT"),
    expect(processedItems[0].id).equal(
      "01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted"
    ),
    expect(processedItems[0].relatedEntityId).equal(
      "YZPN-ZTVQ-UTGU-202301-Y-1"
    ),
    expect(processedItems[0].startTimestamp).equal(
      "2023-01-24T15:06:12.470719211Z"
    ),
    expect(processedItems[0].slaExpiration).equal("2023-07-17T15:06:12.470Z"),
    expect(processedItems[0].alarmTTL).equal("2023-07-03T15:06:12.470Z"),
    expect(processedItems[0].alarmTTLYearToMinute).equal("2023-07-03T15:06"),
    expect(processedItems[0].active_sla_entityName_type).equal("REFINEMENT"),
    expect(processedItems[0].opType).equal("INSERT"),
    expect(processedItems[0].kinesisSeqNumber).equal(
      "49637329937448784559035416658086603608349162186672701458"
    );
});
