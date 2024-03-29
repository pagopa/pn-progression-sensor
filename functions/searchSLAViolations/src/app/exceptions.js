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

class DateTimeParsingException extends Error {
  constructor(message) {
    super(message);
    this.name = "DateTimeParsingException";
  }
}

module.exports = {
  MissingRequiredParametersException,
  WrongInputParametersException,
  MissingEventObjectException,
  DateTimeParsingException,
};
