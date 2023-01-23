// basic event
const { expect } = require("chai");
const event = require("../../event.json");
const { eventHandler } = require("../app/eventHandler.js");
const { mockClient } = require("aws-sdk-client-mock");
const {
  DynamoDBDocumentClient,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

describe("test missing mandatory event parameters", function () {
  // missing parameters errors
  it("should give exception, with missing event", async () => {
    try {
      await eventHandler(null);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Missing event object");
    }
  });

  it("should give exception, with missing event.type", async () => {
    try {
      let testEvent = {
        ...event,
      };
      delete testEvent.type;

      await eventHandler(testEvent);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Required parameters missing");
    }
  });

  it("should give exception, with missing event.active", async () => {
    try {
      let testEvent = {
        ...event,
      };
      delete testEvent.active;

      await eventHandler(testEvent);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Required parameters missing");
    }
  });

  it("should give exception, with malformed event.olderThan", async () => {
    try {
      let testEvent = {
        ...event,
        olderThan: "malformed datetime",
      };

      await eventHandler(testEvent);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Incorrect input parameters");
    }
  });

  it("should give exception, with event.active wrong type", async () => {
    try {
      let testEvent = {
        ...event,
        active: "not a boolean",
      };

      await eventHandler(testEvent);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Incorrect input parameters");
    }
  });

  it("should give exception, with event.lastScannedKey wrong type", async () => {
    try {
      let testEvent = {
        ...event,
        lastScannedKey: 1,
      };

      await eventHandler(testEvent);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Incorrect input parameters");
    }
  });

  it("should return without giving errors", async () => {
    const ddbMock = mockClient(DynamoDBDocumentClient);
    ddbMock.on(QueryCommand).resolves({
      Items: [],
    });

    // DynamoDB tests cover different cases better

    let testEvent = {
      type: "REFINEMENT",
      active: true,
      olderThan: "2023-01-20T13:28:52.819Z",
      lastScannedKey: "testKey",
    };

    const response = await eventHandler(testEvent); // we just want it not to thor and exceptio
    expect(response).to.not.be.null;
    expect(response).to.not.be.undefined;
  });
});
