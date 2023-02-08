const { expect } = require("chai");
const dynamo = require("../app/lib/dynamoDB.js");
const { mockClient } = require("aws-sdk-client-mock");
const {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

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
    startTimestamp: "2023-01-23T14:43:58.897907952Z",
    slaExpiration: "2023-01-25T14:43:58.897Z",
    alarmTTL: "2023-01-25T14:43:58.897Z",
    active_sla_entityName_type: type,
    sla_relatedEntityId: "GVPH-ZMZX-ZULV-202301-P-1",
    opType: "INSERT",
  };

  const updateEvent = {
    ...insertEvent,
    endTimestamp: "2023-01-25T14:43:58.897Z",
    opType: "UPDATE",
  };

  const deleteEvent = {
    ...insertEvent,
    opType: "DELETE",
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
    expect(insertionCommandParams.Item.startTimestamp).equal(
      insertEvent.startTimestamp
    );
    expect(insertionCommandParams.Item.slaExpiration).equal(
      insertEvent.slaExpiration
    );
    expect(insertionCommandParams.Item.alarmTTL).equal(insertEvent.alarmTTL);
    expect(insertionCommandParams.Item.active_sla_entityName_type).equal(
      insertEvent.type
    );
    expect(insertionCommandParams.Item.sla_relatedEntityId).equal(
      insertEvent.sla_relatedEntityId
    );
  });

  it("basic persistEvents with a single event of the correct type: insert", async () => {
    ddbMock.on(PutCommand).resolves({});

    const response = await dynamo.persistEvents([insertEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(1);
    expect(response.updates).equal(0);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });

  it("basic persistEvents with a single event of the correct type: UPDATE", async () => {
    ddbMock.on(UpdateCommand).resolves({});
    const response = await dynamo.persistEvents([updateEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(0);
    expect(response.updates).equal(1);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });

  it("basic persistEvents with a single event of the wrong type: DELETE", async () => {
    const response = await dynamo.persistEvents([deleteEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(0);
    expect(response.updates).equal(0);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });
});
