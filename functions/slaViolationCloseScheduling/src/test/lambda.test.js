const { expect } = require("chai");
const { getActiveSLAViolations } = require("../app/lib/lambda");
const { mockClient } = require("aws-sdk-client-mock");
const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");

const lambdaMock = mockClient(LambdaClient);
const { Buffer } = require("node:buffer");

describe("test send metrics", function () {
  this.beforeEach(() => {
    lambdaMock.reset();
  });

  it("should not send metrics", async () => {
    // null
    let response = await getActiveSLAViolations("WRONG TYPE");

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.success).equal(false);
  });

  it("it should send metrics", async () => {
    lambdaMock.on(InvokeCommand).resolves({
      Payload: Buffer.from(JSON.stringify(JSON.stringify({ success: true }))),
    });

    const knownTypes = [
      "VALIDATION",
      "REFINEMENT",
      "SEND_PEC",
      "SEND_PAPER_AR_890",
      "SEND_AMR",
    ];

    // without lastScannedKey
    for (const type of knownTypes) {
      let response = await getActiveSLAViolations(type);

      expect(response).to.be.not.null;
      expect(response).to.be.not.undefined;
      expect(response.success).equal(true);
    }

    // with lastScannedKey (just for coverage)
    for (const type of knownTypes) {
      let response = await getActiveSLAViolations(
        type,
        "possibleLastScannedKey"
      );

      expect(response).to.be.not.null;
      expect(response).to.be.not.undefined;
      expect(response.success).equal(true);
    }
  });
});
