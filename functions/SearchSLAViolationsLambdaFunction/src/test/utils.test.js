const { expect } = require("chai");
const {
  isValidDate,
  isValidType,
  dateTimeStringToUNIXTimeStamp,
  dateTimeStringToYearAndMonth,
} = require("../app/utils");

describe("test valid datetime string", function () {
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

describe("test datetime string to UNIX epoch", function () {
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

describe("test datetime string to UNIX epoch", function () {
  it("should be 2023-01 with january 2023", () => {
    expect(dateTimeStringToYearAndMonth("2023-01-18T16:03:40.597Z")).to.equal(
      "2023-01"
    );
  });

  it("should be 2023-02 with february 2023", () => {
    expect(dateTimeStringToYearAndMonth("2023-02-18T16:03:40.597Z")).to.equal(
      "2023-02"
    );
  });

  it("should be 2023-09 with september 2023", () => {
    expect(dateTimeStringToYearAndMonth("2023-09-18T16:03:40.597Z")).to.equal(
      "2023-09"
    );
  });

  it("should be 2023-10 with october 2023", () => {
    expect(dateTimeStringToYearAndMonth("2023-10-18T16:03:40.597Z")).to.equal(
      "2023-10"
    );
  });

  it("should be 2023-12 with december 2023", () => {
    expect(dateTimeStringToYearAndMonth("2023-12-18T16:03:40.597Z")).to.equal(
      "2023-12"
    );
  });

  it("should be 2022-01 with january 2022", () => {
    expect(dateTimeStringToYearAndMonth("2022-01-18T16:03:40.597Z")).to.equal(
      "2022-01"
    );
  });

  it("should be 2022-12 with december 2022", () => {
    expect(dateTimeStringToYearAndMonth("2022-12-18T16:03:40.597Z")).to.equal(
      "2022-12"
    );
  });

  it("should give exception, with empty datetime", () => {
    try {
      dateTimeStringToYearAndMonth("");
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Not a valid datetime string");
    }
  });

  it("should give exception, with null datetime", () => {
    try {
      dateTimeStringToYearAndMonth(null);
    } catch (error) {
      expect(error).to.not.be.null;
      expect(error).to.not.be.undefined;
      expect(error.message).to.equal("Not a valid datetime string");
    }
  });
});

describe("test valid type string", function () {
  const knownTypes = [
    "VALIDATION",
    "REFINEMENT",
    "SEND_PEC",
    "SEND_PAPER_AR_890",
    "SEND_AMR",
  ];

  it("should be correct", () => {
    for (const singleType of knownTypes) {
      expect(isValidType(singleType)).to.be.true;
    }
  });

  it("should be not correct with correct types, but lowecase", () => {
    for (const singleType of knownTypes) {
      expect(isValidType(singleType.toLowerCase())).to.be.false;
    }
  });

  it("should be not correct, with wrong type", () => {
    expect(isValidType("WRONG_TYPE")).to.be.false;
  });

  it("should be not correct, with empty type", () => {
    expect(isValidType("")).to.be.false;
  });

  it("should be not correct, with null type", () => {
    expect(isValidType("")).to.be.false;
  });
});
