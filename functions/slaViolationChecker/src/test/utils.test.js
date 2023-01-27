const { expect } = require("chai");
const {
  isValidDate,
  dateTimeStringToUNIXTimeStamp,
  isUNIXTimeStampPast,
} = require("../app/lib/utils");

describe("test valid datetime string", () => {
  it("should be valid with valid ISO datetime (now)", () => {
    const now = new Date().toISOString();
    expect(isValidDate(now)).to.be.true;
  });

  it("should be invalid with invalid datetime parts", () => {
    expect(isValidDate("2023-13-18 14:37")).to.be.false; // month 13 is not ok
  });

  it("should be invalid with string", () => {
    expect(isValidDate("not a datetime")).to.be.false;
  });

  it("should be invalid with empty datetime", () => {
    expect(isValidDate("")).to.be.false;
  });

  it("should be invalid with null datetime", () => {
    expect(isValidDate()).to.be.false;
  });
});

describe("test datetime string to UNIX epoch", () => {
  it("should be valid", () => {
    expect(dateTimeStringToUNIXTimeStamp("2023-01-18T16:03:40.597Z")).to.equal(
      1674057820
    );
  });

  it("should give exception, with empty datetime", () => {
    try {
      dateTimeStringToUNIXTimeStamp("");
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Not a valid datetime string");
    }
  });

  it("should give exception, with null datetime", () => {
    try {
      dateTimeStringToUNIXTimeStamp();
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Not a valid datetime string");
    }
  });
});

describe("test passed UNIX epoch", () => {
  const nowEpoch = Math.floor(new Date().getTime() / 1000);
  const pastEpoch = nowEpoch - 10000;
  const futureEpoch = nowEpoch + 10000;

  console.log("now epoch: ", nowEpoch);
  console.log("past epoch: ", pastEpoch);
  console.log("future epoch: ", futureEpoch);

  it("should be past (true)", () => {
    expect(isUNIXTimeStampPast(pastEpoch)).to.be.true;
  });

  it("should be future (false)", () => {
    expect(isUNIXTimeStampPast(futureEpoch)).to.be.false;
  });

  it("should be false with string", () => {
    expect(isUNIXTimeStampPast("not a UNIX epoch")).to.be.false;
  });

  it("should be false with empty UNIX epoch", () => {
    expect(isUNIXTimeStampPast("")).to.be.false;
  });

  it("should be false with null UNIX epoch", () => {
    expect(isUNIXTimeStampPast()).to.be.false;
  });
});
