const { expect } = require("chai");
const dynamo = require("../app/lib/dynamoDB.js");
const { mockClient } = require("aws-sdk-client-mock");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const ddbMock = mockClient(DynamoDBDocumentClient);

describe("DynamoDB tests", function () {
  this.beforeEach(() => {
    ddbMock.reset();
  });

  const type = "SEND_PEC";
  const insertEvent = {
    entityName_type_relatedEntityId:
      "step##SEND_PEC##GVPH-ZMZX-ZULV-202301-P-1",
    type: type,
    id: "02_PEC__##GVPH-ZMZX-ZULV-202301-P-1_send_digital_domicile_0_source_SPECIAL_attempt_0",
    relatedEntityId: "GVPH-ZMZX-ZULV-202301-P-1",
    startTimestamp: "2023-01-23T14:43:58.897907952Z",
    slaExpiration: "2023-01-25T14:43:58.897Z",
    alarmTTL: "2023-01-25T14:43:58.897Z",
    alarmTTLYearToMinute: "2023-01-25T14:43",
    active_sla_entityName_type: type,
    opType: "INSERT",
  };

  const updateEvent = {
    entityName_type_relatedEntityId:
      "step##SEND_PEC##GVPH-ZMZX-ZULV-202301-P-1",
    type: type,
    id: "02_PEC__##GVPH-ZMZX-ZULV-202301-P-1_send_digital_domicile_0_source_SPECIAL_attempt_0",
    relatedEntityId: "GVPH-ZMZX-ZULV-202301-P-1",
    startTimestamp: "2023-01-23T14:43:58.897907952Z",
    slaExpiration: "2023-01-25T14:43:58.897Z",
    alarmTTL: "2023-01-25T14:43:58.897Z",
    alarmTTLYearToMinute: "2023-01-25T14:43",
    active_sla_entityName_type: type,
    opType: "UPDATE",
  };

  it("should create correct insertion command parameters", () => {
    const insertionCommandParams =
      dynamo.makeInsertCommandFromEvent(insertEvent);

    expect(insertionCommandParams).to.not.be.null;
    expect(insertionCommandParams).to.not.be.undefined;

    expect(insertionCommandParams.Item.entityName_type_relatedEntityId).equal(
      insertEvent.entityName_type_relatedEntityId.replace("step##", "sla##")
    );
    expect(insertionCommandParams.Item.type).equal(insertEvent.type);
    expect(insertionCommandParams.Item.id).equal(insertEvent.id);
    expect(insertionCommandParams.Item.relatedEntityId).equal(
      insertEvent.relatedEntityId
    );
    expect(insertionCommandParams.Item.startTimestamp).equal(
      insertEvent.startTimestamp
    );
    expect(insertionCommandParams.Item.slaExpiration).equal(
      insertEvent.slaExpiration
    );
    expect(insertionCommandParams.Item.alarmTTL).equal(insertEvent.alarmTTL);
    expect(insertionCommandParams.Item.alarmTTLYearToMinute).equal(
      insertEvent.alarmTTLYearToMinute
    );
    expect(insertionCommandParams.Item.active_sla_entityName_type).equal(
      insertEvent.type
    );
  });

  it("basic persistEvents with a single event of the correct type", async () => {
    ddbMock.on(PutCommand).resolves({});

    const response = await dynamo.persistEvents([insertEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(1);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });

  it("basic persistEvents with a single event of the wrong type", async () => {
    ddbMock.on(PutCommand).resolves({});

    const response = await dynamo.persistEvents([updateEvent]);

    console.log(response);
    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(0);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });
});
