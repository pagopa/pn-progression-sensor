const { expect } = require("chai");
const { addActiveSLAToQueue } = require("../app/lib/sqs");
const { mockClient } = require("aws-sdk-client-mock");
const { SQSClient, SendMessageBatchCommand } = require("@aws-sdk/client-sqs");

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
      sqsMock.on(SendMessageBatchCommand).resolves({ Successful: [
        {
          "Id": "example_id"
        }
      ]  
    });

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
    sqsMock.on(SendMessageBatchCommand).resolves({});

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


  it("should add a batch violations", async () => {
    sqsMock.on(SendMessageBatchCommand).resolves({ Successful: [
        {
          "Id": "this is another string"
        },
        {
          "Id": "this is another string1"
        },
        {
          "Id": "this is another string2"
        },
        {
          "Id": "this is another string3"
        },
        {
          "Id": "this is another string4"
        },
        {
          "Id": "this is another string5"
        },
        {
          "Id": "this is another string6"
        },
        {
          "Id": "this is another string7"
        },
        {
          "Id": "this is another string8"
        },
        {
          "Id": "this is another string9"
        }
      ] 
    });

    const violations = [
      {
        entityName_type_relatedEntityId: "this is a string",
        id: "this is another string",
      },
      {
        entityName_type_relatedEntityId: "this is a string1",
        id: "this is another string1",
      },
      {
        entityName_type_relatedEntityId: "this is a string2",
        id: "this is another string2",
      },
      {
        entityName_type_relatedEntityId: "this is a string3",
        id: "this is another string3",
      },
      {
        entityName_type_relatedEntityId: "this is a string4",
        id: "this is another string4",
      },
      {
        entityName_type_relatedEntityId: "this is a string5",
        id: "this is another string5",
      },
      {
        entityName_type_relatedEntityId: "this is a string6",
        id: "this is another string6",
      },
      {
        entityName_type_relatedEntityId: "this is a string7",
        id: "this is another string7",
      },
      {
        entityName_type_relatedEntityId: "this is a string8",
        id: "this is another string8",
      },
      {
        entityName_type_relatedEntityId: "this is a string9",
        id: "this is another string9",
      }
    ];
    const response = await addActiveSLAToQueue(violations);
    console.log("response: ", response);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(10);
    expect(response.correctlySentViolations).equal(10);
    expect(response.problemsSendingViolations).equal(0);
    expect(response.skippedViolations).equal(0);
  });
});
