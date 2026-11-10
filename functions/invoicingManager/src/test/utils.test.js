const { expect } = require("chai");
const {
  initTtlTimes,
} = require("../app/lib/utils");

describe("test utils functions", () => {

  it("should test initTtlSlaTimes with default values", () => {
    const ttlSlaTimes = initTtlTimes();
    expect(ttlSlaTimes.INVOICING_TTL_DAYS).to.eq(365);
  });

  it("should test initTtlSlaTimes with values from env variables", () => {
    // set the environment variables
    process.env.INVOICING_TTL_DAYS = 0;

    const ttlSlaTimes = initTtlTimes();

    expect(ttlSlaTimes.INVOICING_TTL_DAYS).to.eq(0);

    // unset the environment variables
    delete process.env.INVOICING_TTL_DAYS;
  });

  it("should get initTtlSlaTimes with NaN with text values from env variables", () => {
    // set the environment variables
    process.env.INVOICING_TTL_DAYS = "k";

    const ttlSlaTimes = initTtlTimes();

    expect(ttlSlaTimes.INVOICING_TTL_DAYS).to.be.NaN;

    // unset the environment variables
    delete process.env.INVOICING_TTL_DAYS;
  });
});
