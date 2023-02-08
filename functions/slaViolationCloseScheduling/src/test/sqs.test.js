const { expect } = require("chai");
const { addActiveSLAToQueue } = require("../app/lib/sqs");
const { mockClient } = require("aws-sdk-client-mock");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

const sqsMock = mockClient(SQSClient);

describe("test send violations to queue", function () {
  this.beforeEach(() => {
    sqsMock.reset();
    process.env.SEARCH_SLA_VIOLATIONS_QUEUE_URL = "testQueueURL";
  });

  it("should not process violations", async () => {
    // null
    let response = await addActiveSLAToQueue(null);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(0);
    expect(response.correctlySentViolations).equal(0);
    expect(response.problemsSendingViolations).equal(0);
    expect(response.skippedViolations).equal(0);

    // empty
    response = await addActiveSLAToQueue([]);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(0);
    expect(response.correctlySentViolations).equal(0);
    expect(response.problemsSendingViolations).equal(0);
    expect(response.skippedViolations).equal(0);
  });

  it("should skip violations", async () => {
    const violations = [
      { entityName_type_relatedEntityId: "this is a string" },
      { id: "this is another string" },
      {},
    ];
    const response = await addActiveSLAToQueue(violations);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(3);
    expect(response.correctlySentViolations).equal(0);
    expect(response.problemsSendingViolations).equal(0);
    expect(response.skippedViolations).equal(3);
  });

  it("should add a violation", async () => {
    sqsMock.on(SendMessageCommand).resolves({ MessageId: "example_id" });

    const violations = [
      {
        entityName_type_relatedEntityId: "this is a string",
        id: "this is another string",
      },
      {},
    ];
    const response = await addActiveSLAToQueue(violations);
    console.log("response: ", response);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(2);
    expect(response.correctlySentViolations).equal(1);
    expect(response.problemsSendingViolations).equal(0);
    expect(response.skippedViolations).equal(1);
  });

  it("should have a problem adding violation", async () => {
    sqsMock.on(SendMessageCommand).resolves({});

    const violations = [
      {
        entityName_type_relatedEntityId: "this is a string",
        id: "this is another string",
      },
      {},
    ];
    const response = await addActiveSLAToQueue(violations);
    //console.log("response: ", response);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(2);
    expect(response.correctlySentViolations).equal(0);
    expect(response.problemsSendingViolations).equal(1);
    expect(response.skippedViolations).equal(1);
  });
});
