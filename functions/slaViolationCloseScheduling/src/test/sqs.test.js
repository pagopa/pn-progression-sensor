const { expect } = require("chai");
const { addActiveSLAToQueue } = require("../app/lib/sqs");

describe("test send violations to queue", () => {
  it("should not process violations", async () => {
    // null
    let response = await addActiveSLAToQueue(null);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(0);
    expect(response.correctlySentViolations).equal(0);

    // empty
    response = await addActiveSLAToQueue([]);

    expect(response).to.be.not.null;
    expect(response).to.be.not.undefined;
    expect(response.receivedViolations).equal(0);
    expect(response.correctlySentViolations).equal(0);
  });
});
