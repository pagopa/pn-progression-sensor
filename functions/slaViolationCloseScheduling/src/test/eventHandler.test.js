const { expect } = require("chai");
const proxyquire = require("proxyquire").noPreserveCache();

describe("event handler tests", function () {
  it("test no events, with succesful calls", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: async (res) => {
          return new Promise((res) => res({ success: true, results: [{}] }));
        },
      },
      "./lib/sqs.js": {
        addActiveSLAToQueue: () => {
          return {};
        },
      },
      "./lib/metrics.js": {
        putMetricDataForType: () => {
          // nothing
        },
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res.activeSLASearchSuccesses).deep.equals(5); // 1 success for each type
    expect(res.activeSLASearchFailures).deep.equals(0);
    expect(res.eventsSentToQueue).deep.equals(0);
    expect(res.activeSlasFound).deep.equals(5); // 1 found slas for each type
    expect(res.partialResults).deep.equals(false);
  });

  it("test no events, with non succesful calls", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: async (res) => {
          return new Promise((res) => res({ success: false, results: [] }));
        },
      },
      "./lib/sqs.js": {
        addActiveSLAToQueue: () => {
          return {};
        },
      },
      "./lib/metrics.js": {
        putMetricDataForType: () => {
          // nothing
        },
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res.activeSLASearchSuccesses).deep.equals(0);
    expect(res.activeSLASearchFailures).deep.equals(5); // 1 failure for each type
    expect(res.eventsSentToQueue).deep.equals(0);
    expect(res.activeSlasFound).deep.equals(0); // 0 found slas for each type
    expect(res.partialResults).deep.equals(false);
  });

  it("test 1 event, with succesful calls", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: async (res) => {
          return new Promise((res) =>
            res({ success: true, results: [{}, {}, {}] })
          );
        },
      },
      "./lib/sqs.js": {
        addActiveSLAToQueue: () => {
          return {};
        },
      },
      "./lib/metrics.js": {
        putMetricDataForType: () => {
          // nothing
        },
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res.activeSLASearchSuccesses).deep.equals(5); // 3 successes for each type (not the same number as found slas)
    expect(res.activeSLASearchFailures).deep.equals(0);
    expect(res.eventsSentToQueue).deep.equals(0);
    expect(res.activeSlasFound).deep.equals(15); // 3 found slas for each type
    expect(res.partialResults).deep.equals(false);
  });
});
