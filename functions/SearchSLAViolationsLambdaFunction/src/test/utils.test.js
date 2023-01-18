import { expect } from "chai";
import { isValidDate, isValidType } from "../utils.js";

describe("is valid datetime string", function () {
  it("valid ISO datetime (now)", () => {
    const now = new Date().toISOString();
    expect(isValidDate(now)).to.be.true;
  });

  it("invalid datetime parts", () => {
    expect(isValidDate("2023-13-18 14:37")).to.be.false; // month 13 is not ok
  });

  it("invalid datetime", () => {
    expect(isValidDate("not a datetime")).to.be.false;
  });

  it("empty datetime", () => {
    expect(isValidDate("")).to.be.false;
  });

  it("null datetime", () => {
    expect(isValidDate()).to.be.false;
  });
});

describe("is valid type string", function () {
  const knownTypes = [
    "VALIDATION",
    "REFINEMENT",
    "SEND_PEC",
    "SEND_PAPER_AR_890",
    "SEND_AMR",
  ];

  it("correct types", () => {
    for (const singleType of knownTypes) {
      expect(isValidType(singleType)).to.be.true;
    }
  });

  it("correct types, but lowecase", () => {
    for (const singleType of knownTypes) {
      expect(isValidType(singleType.toLowerCase())).to.be.false;
    }
  });

  it("wrong type", () => {
    expect(isValidType("WRONG_TYPE")).to.be.false;
  });

  it("empty type", () => {
    expect(isValidType("")).to.be.false;
  });

  it("null type", () => {
    expect(isValidType("")).to.be.false;
  });
});
