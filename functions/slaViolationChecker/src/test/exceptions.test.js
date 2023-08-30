const { expect } = require("chai");
const {
  MissingRequiredParametersException,
  WrongInputParametersException,
  MissingEventObjectException,
  DateTimeParsingException,
} = require("../app/lib/exceptions");

describe("test MissingRequiredParametersException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new MissingRequiredParametersException(message);
    expect(exception.name).to.eq("MissingRequiredParametersException");
    expect(exception.message).to.eq("test");
  });
});

describe("test WrongInputParametersException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new WrongInputParametersException(message);
    expect(exception.name).to.eq("WrongInputParametersException");
    expect(exception.message).to.eq("test");
  });
});

describe("test MissingEventObjectException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new MissingEventObjectException(message);
    expect(exception.name).to.eq("MissingEventObjectException");
    expect(exception.message).to.eq("test");
  });
});

describe("test DateTimeParsingException", () => {
  it("should set name", () => {
    const message = "test";
    const exception = new DateTimeParsingException(message);
    expect(exception.name).to.eq("DateTimeParsingException");
    expect(exception.message).to.eq("test");
  });
});
