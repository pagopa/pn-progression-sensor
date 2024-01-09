const { expect } = require("chai");
const {
  makeInsertCommandFromEvent,
  persistEvents,
  closingElementIdFromIDAndType,
} = require("../app/lib/dynamoDB.js");
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
    id: "02_PEC__##SEND_DIGITAL;IUN_AWMX-HXYK-YDAH-202302-P-1;RECINDEX_0;SOURCE_SPECIAL;ATTEMPT_0",
    startTimestamp: "2023-01-23T14:43:58.897907952Z",
    slaExpiration: "2023-01-25T14:43:58.897Z",
    alarmTTL: "2023-01-25T14:43:58.897Z",
    active_sla_entityName_type: type,
    sla_relatedEntityId: "GVPH-ZMZX-ZULV-202301-P-1",
    opType: "INSERT",
  };

  const updateEvent = {
    ...insertEvent,
    endTimeStamp: "2023-01-25T14:43:58.897Z",
    opType: "UPDATE",
  };

  const deleteEvent = {
    ...insertEvent,
    opType: "DELETE",
  };

  it("should create correct insertion command parameters", () => {
    const insertionCommandParams = makeInsertCommandFromEvent(insertEvent);

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

    const response = await persistEvents([insertEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(1);
    expect(response.updates).equal(0);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });

  it("basic persistEvents with a single event of the correct type: UPDATE", async () => {
    ddbMock.on(UpdateCommand).resolves({});
    const response = await persistEvents([updateEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(0);
    expect(response.updates).equal(1);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });

  it("basic persistEvents with a single event of the wrong type: DELETE", async () => {
    const response = await persistEvents([deleteEvent]);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.insertions).equal(0);
    expect(response.updates).equal(0);
    expect(response.skippedInsertions).equal(0);
    expect(response.errors.length).equal(0);
  });
});

describe("Find closingElementId tests by type", function () {
  it("should match the VALIDATION type", () => {
    const id = "00_VALID##WEUD-XHKG-ZHDN-202301-W-1";
    const type = "VALIDATION";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response[0]).equal("REQUEST_ACCEPTED.IUN_WEUD-XHKG-ZHDN-202301-W-1");
    expect(response[1]).equal("REQUEST_REFUSED.IUN_WEUD-XHKG-ZHDN-202301-W-1");
    expect(response[2]).equal(
      "NOTIFICATION_CANCELLED.IUN_WEUD-XHKG-ZHDN-202301-W-1"
    );
    expect(response.length).equal(3);
  });

  it("should match the REFINEMENT type", () => {
    const id = "01_REFIN##REKD-NZRJ-NWQJ-202302-M-1##0";
    const type = "REFINEMENT";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response[0]).equal(
      "REFINEMENT.IUN_REKD-NZRJ-NWQJ-202302-M-1.RECINDEX_0"
    );
    expect(response[1]).equal(
      "NOTIFICATION_VIEWED.IUN_REKD-NZRJ-NWQJ-202302-M-1.RECINDEX_0"
    );
    expect(response[2]).equal(
      "NOTIFICATION_CANCELLED.IUN_REKD-NZRJ-NWQJ-202302-M-1"
    );
    expect(response.length).equal(3);
  });

  it("should match the SEND_PEC type, REPEAT false", () => {
    const id =
      "02_PEC__##SEND_DIGITAL.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0.SOURCE_SPECIAL.REPEAT_false.ATTEMPT_0";
    const type = "SEND_PEC";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response[0]).equal(
      "SEND_DIGITAL_FEEDBACK.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0.SOURCE_SPECIAL.REPEAT_false.ATTEMPT_0"
    );
    expect(response[1]).equal(
      "NOTIFICATION_VIEWED.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0"
    );
    expect(response.length).equal(2);
  });

  it("should match the SEND_PEC type, REPEAT true", () => {
    const id =
      "02_PEC__##SEND_DIGITAL.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_1.SOURCE_SPECIAL.REPEAT_true.ATTEMPT_0";
    const type = "SEND_PEC";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response[0]).equal(
      "SEND_DIGITAL_FEEDBACK.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_1.SOURCE_SPECIAL.REPEAT_true.ATTEMPT_0"
    );
    expect(response[1]).equal(
      "NOTIFICATION_VIEWED.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_1"
    );
    expect(response.length).equal(2);
  });

  it("should match the SEND_PAPER_AR_890 type", () => {
    const id =
      "03_PAPER##SEND_ANALOG_DOMICILE.IUN_DNQZ-QUQN-202302-W-1.RECINDEX_1.ATTEMPT_1";
    const type = "SEND_PAPER_AR_890";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response[0]).equal(
      "SEND_ANALOG_FEEDBACK.IUN_DNQZ-QUQN-202302-W-1.RECINDEX_1.ATTEMPT_1"
    );
    expect(response.length).equal(1);
  });

  it("should match the SEND_AMR type", () => {
    const id = "04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1";
    const type = "SEND_AMR";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response[0]).equal(
      "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_1"
    );
    expect(response.length).equal(1);
  });

  it("should match an unknown type", () => {
    const id = "doesntmatter";
    const type = "STRANGE_TYPE";

    const response = closingElementIdFromIDAndType(id, type);

    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
    expect(response.length).equal(0);
  });
});
