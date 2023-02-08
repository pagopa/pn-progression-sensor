const { expect } = require("chai");
const proxyquire = require("proxyquire").noPreserveCache();

describe("event handler tests", function () {
  it("test no events, with succesful calls", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: async (res) => {
          return new Promise((res) => res({ success: true, results: [] }));
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
    //console.log(res);
    expect(res.activeSLASearchSuccesses).deep.equals(5); // 1 success for each type
    expect(res.activeSLASearchFailures).deep.equals(0);
    expect(res.eventsSentToQueue).deep.equals(0);
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
    //console.log(res);
    expect(res.activeSLASearchSuccesses).deep.equals(0);
    expect(res.activeSLASearchFailures).deep.equals(5); // 1 failure for each type
    expect(res.eventsSentToQueue).deep.equals(0);
  });

  it("test 1 event, with succesful calls", async () => {
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
    //console.log(res);
    expect(res.activeSLASearchSuccesses).deep.equals(5); // 1 success for each type
    expect(res.activeSLASearchFailures).deep.equals(0);
    expect(res.eventsSentToQueue).deep.equals(0);
  });
});
