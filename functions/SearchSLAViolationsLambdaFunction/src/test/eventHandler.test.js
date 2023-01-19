// basic event
const { expect } = require("chai");
const event = require("../../event.json");
const { eventHandler } = require("../app/eventHandler.js");

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
});
