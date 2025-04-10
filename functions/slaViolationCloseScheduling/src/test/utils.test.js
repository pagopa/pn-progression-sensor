const { expect } = require("chai");
const { isValidType } = require("../app/lib/utils");

describe("test valid type string", () => {
  const knownTypes = [
    "VALIDATION",
    "VALIDATION_WITH_VAS_ADDRESS",
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
