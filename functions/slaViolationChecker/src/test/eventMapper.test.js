const { expect } = require("chai");
const { checkRemovedByTTL } = require("../app/lib/eventMapper");

describe("test check REMOVE by TTL", () => {
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

  it("should be not removed by TTL", () => {
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
