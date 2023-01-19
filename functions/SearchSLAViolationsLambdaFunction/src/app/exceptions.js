class MissingRequiredParametersException extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingRequiredParametersException";
  }
}

class WrongInputParametersException extends Error {
  constructor(message) {
    super(message);
    this.name = "WrongInputParametersException";
  }
}

class MissingEventObjectException extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingEventObjectException";
  }
}

module.exports = {
  MissingRequiredParametersException,
  WrongInputParametersException,
  MissingEventObjectException,
};
