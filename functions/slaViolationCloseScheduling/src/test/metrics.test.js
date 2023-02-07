const { expect } = require("chai");
const { putMetricDataForType } = require("../app/lib/metrics");
const { mockClient } = require("aws-sdk-client-mock");
const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");

const cwMock = mockClient(CloudWatchClient);

describe("test send metrics", function () {
  this.beforeEach(() => {
    cwMock.reset();
  });

  it("should not send metrics", async () => {
    // null
    let response = await putMetricDataForType(-1, "VALIDATION"); // existing type

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response).equal(false);

    response = await putMetricDataForType(12, "WRONG TYPE");

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response).equal(false);
  });

  it("it should send metrics", async () => {
    cwMock.on(PutMetricDataCommand).resolves({});

    const knownTypes = [
      "VALIDATION",
      "REFINEMENT",
      "SEND_PEC",
      "SEND_PAPER_AR_890",
      "SEND_AMR",
    ];

    for (const type of knownTypes) {
      let response = await putMetricDataForType(10, type);
      expect(response).to.be.not.null;
      expect(response).to.be.not.undefined;
      expect(response).equal(true);
    }
  });
});
