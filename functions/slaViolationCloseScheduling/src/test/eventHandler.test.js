const { expect } = require("chai");
const proxyquire = require("proxyquire").noPreserveCache();

describe("event handler tests", function () {
  it("test no events, with succesful calls", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: async (type) => {
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

  it("test for validation with new lookupAddress flag", async () => {
    const event = {};

    // Creazione di una funzione mock per tracciare le chiamate
    const putMetricDataForTypeMock = function (...args) {
      putMetricDataForTypeMock.calls.push(args); // Salva i parametri di ogni chiamata
    };
    putMetricDataForTypeMock.calls = []; // Array per tracciare le chiamate


    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: async (type) => {
          // Simulate different results based on type
          // For all types we return 3 results, but only for VALIDATION we return 5 results 
          // 3 for basic validation and 2 with lookupAddress
          let results = [{}, {}, {}];
          if (type === "VALIDATION") {
            results = generateResults(3, 2); // 2 more results for VALIDATION
          }
          return new Promise((res) => res({ success: true, results }));
        },
      },
      "./lib/sqs.js": {
        addActiveSLAToQueue: () => {
          return {};
        },
      },
      "./lib/metrics.js": {
        putMetricDataForType: putMetricDataForTypeMock
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res.activeSLASearchSuccesses).deep.equals(5); // 1 success for each type
    expect(res.activeSLASearchFailures).deep.equals(0);
    expect(res.eventsSentToQueue).deep.equals(0);
    expect(res.activeSlasFound).deep.equals(17);
    expect(res.partialResults).deep.equals(false);
    expect(putMetricDataForTypeMock.calls[0]).to.deep.equal([3, "VALIDATION"]); // 3 for basic validation
    expect(putMetricDataForTypeMock.calls[1]).to.deep.equal([2, "VALIDATION_WITH_VAS_ADDRESS"]); // 2 with lookupAddress
    expect(putMetricDataForTypeMock.calls[2]).to.deep.equal([3, "REFINEMENT"]);
    expect(putMetricDataForTypeMock.calls[3]).to.deep.equal([3, "SEND_PEC"]);
    expect(putMetricDataForTypeMock.calls[4]).to.deep.equal([3, "SEND_PAPER_AR_890"]);
    expect(putMetricDataForTypeMock.calls[5]).to.deep.equal([3, "SEND_AMR"]);
  });

  it("test for validation with new lookupAddress flag when exceeding max items", async () => {
    // Set environment variables for testing
    process.env.MAX_ALLOWED_BY_TYPE = "5";

    const event = {};

    // Creazione di una funzione mock per tracciare le chiamate
    const putMetricDataForTypeMock = function (...args) {
      putMetricDataForTypeMock.calls.push(args); // Salva i parametri di ogni chiamata
    };
    putMetricDataForTypeMock.calls = []; // Array per tracciare le chiamate    

    const getActiveSLAViolationsMock = async function (type, lastScannedKey) {
      // Simulate different results based on type
          // For all types we return 5 results, but only for VALIDATION we return 20 results 
          // 10 for basic validation and 10 with lookupAddress
          let results = [{}, {}, {}, {}, {}];
          let outputLastScannedKey = null;
          if (type === "VALIDATION") {
            results = generateResults(10, 10); // 10 for basic validation and 10 with lookupAddress
            outputLastScannedKey = "test"; // Simulate a last scanned key for the next iteration
          }
          getActiveSLAViolationsMock.calls.push({ type, lastScannedKey }); // Salva i parametri di ogni chiamata
          return new Promise((res) => res({ success: true, results, lastScannedKey: outputLastScannedKey }));
    }
    getActiveSLAViolationsMock.calls = []; // Array per tracciare le chiamate

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/lambda.js": {
        getActiveSLAViolations: getActiveSLAViolationsMock,
      },
      "./lib/sqs.js": {
        addActiveSLAToQueue: () => {
          return {};
        },
      },
      "./lib/metrics.js": {
        putMetricDataForType: putMetricDataForTypeMock
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res.activeSLASearchSuccesses).deep.equals(5); // 1 success for each type
    expect(res.activeSLASearchFailures).deep.equals(0);
    expect(res.eventsSentToQueue).deep.equals(0);
    // 10 VALIDATION, 10 VALIDATION_WITH_VAS_ADDRESS, 5 REFINEMENT, 5 SEND_PEC, 5 SEND_PAPER_AR_890, 5 SEND_AMR
    expect(res.activeSlasFound).deep.equals(40);
    expect(res.partialResults).deep.equals(true);
    expect(putMetricDataForTypeMock.calls[0]).to.deep.equal([10, "VALIDATION"]);
    expect(putMetricDataForTypeMock.calls[1]).to.deep.equal([10, "VALIDATION_WITH_VAS_ADDRESS"]);
    expect(putMetricDataForTypeMock.calls[2]).to.deep.equal([5, "REFINEMENT"]);
    expect(putMetricDataForTypeMock.calls[3]).to.deep.equal([5, "SEND_PEC"]);
    expect(putMetricDataForTypeMock.calls[4]).to.deep.equal([5, "SEND_PAPER_AR_890"]);
    expect(putMetricDataForTypeMock.calls[5]).to.deep.equal([5, "SEND_AMR"]);

    // The mock for getActiveSLAViolations should have been called 6 times.
    // 2 times for VALIDATION (one for the first batch and one for the second batch)
    // and 1 time for each of the other types (REFINEMENT, SEND_PEC, SEND_PAPER_AR_890, SEND_AMR)
    // But when the max is exceeded there won't be any more calls to getActiveSLAViolations of the same type
    // so we expect only 5 calls in total (1 for each type)
    expect(getActiveSLAViolationsMock.calls.length).to.equal(5); // Only one call for VALIDATION

    // Reset environment variables after testing
    delete process.env.MAX_ALLOWED_BY_TYPE;

    expect(process.env.MAX_ALLOWED_BY_TYPE).to.be.undefined; // Check if the variable is deleted
  });
});


function generateResults(emptyItemsCount, lookupItemsCount) {
  const emptyItems = Array.from({ length: emptyItemsCount }, () => ({}));
  const lookupItems = Array.from({ length: lookupItemsCount }, () => ({ hasPhysicalAddressLookup: true }));
  return [...emptyItems, ...lookupItems];
}

