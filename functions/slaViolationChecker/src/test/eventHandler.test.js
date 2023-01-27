const { expect } = require("chai");
const proxyquire = require("proxyquire").noPreserveCache();

describe("event handler tests", function () {
  it("test Ok", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/kinesis.js": {
        extractKinesisData: () => {
          return [{}];
        },
      },
      "./lib/eventMapper.js": {
        mapEvents: () => {
          return [{ test: 1 }];
        },
      },
      "./lib/repository.js": {
        persistEvents: async () => {
          return new Promise((res) =>
            res({
              insertions: 1,
              deletions: 0,
              errors: [],
            })
          );
        },
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res).deep.equals({
      batchItemFailures: [],
    });
  });

  it("test no kinesis data", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/kinesis.js": {
        extractKinesisData: () => {
          return [];
        },
      },
      "./lib/eventMapper.js": {
        mapEvents: () => {
          return [{ test: 1 }];
        },
      },
      "./lib/dynamoDB.js": {
        persistEvents: async () => {
          return new Promise((res) =>
            res({
              insertions: 1,
              deletions: 0,
              errors: [],
            })
          );
        },
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res).deep.equals({
      batchItemFailures: [],
    });
  });

  it("test no data to persist", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/kinesis.js": {
        extractKinesisData: () => {
          return [{ test: 1 }];
        },
      },
      "./lib/eventMapper.js": {
        mapEvents: () => {
          return [];
        },
      },
      "./lib/dynamoDB.js": {
        persistEvents: async () => {
          return new Promise((res) =>
            res({
              insertions: 1,
              deletions: 0,
              errors: [],
            })
          );
        },
      },
    });

    const res = await lambda.eventHandler(event);
    expect(res).deep.equals({
      batchItemFailures: [],
    });
  });

  it("persist errors", async () => {
    const event = {};

    const lambda = proxyquire.noCallThru().load("../app/eventHandler.js", {
      "./lib/kinesis.js": {
        extractKinesisData: () => {
          return [{ test: 1 }];
        },
      },
      "./lib/eventMapper.js": {
        mapEvents: () => {
          return [{ test: 1 }];
        },
      },
      "./lib/dynamoDB.js": {
        persistEvents: async () => {
          return new Promise((res) =>
            res({
              insertions: 1,
              deletions: 0,
              errors: [
                {
                  kinesisSeqNumber: "abc",
                },
              ],
            })
          );
        },
      },
    });

    const res = await lambda.eventHandler(event);
    console.log("ERRORS: ", res);
    expect(res).deep.equals({
      batchItemFailures: ["abc"],
    });
  });
});
