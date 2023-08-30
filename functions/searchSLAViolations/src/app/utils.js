const { DateTimeParsingException } = require("./exceptions");

/**
 * checks if a string contains a valid datetime
 *
 * @param {string} dateString a string containing a datetime (it must be able to become a valida Date object)
 * @returns {boolean} returns true if the passed string is a correct datetime
 */
const isValidDate = (dateString) => {
  const datetimeObject = new Date(dateString);
  return !Number.isNaN(datetimeObject.getTime());
};

/**
 * returns a number containing the UNIX timestamp, converted from the passed datetime string
 *
 * @param {string} dateString a string containing a valid datetime
 * @returns {number} UNIX timestamp
 * @throws {DateTimeParsingException} "Not a valid datetime string"
 */
const dateTimeStringToUNIXTimeStamp = (dateString) => {
  if (isValidDate(dateString)) {
    const datetimeObject = new Date(dateString);
    return Math.floor(datetimeObject.getTime() / 1000);
  } else {
    throw new DateTimeParsingException("Not a valid datetime string");
  }
};

/**
 * returns a string in the format "2023-01" from a valid datetime string
 *
 * @param {string} dateString a string containing a valid datetime
 * @returns {string} string in the format "2023-01" from a valid datetime string
 * @throws {DateTimeParsingException} "Not a valid datetime string"
 */
const dateTimeStringToYearAndMonth = (dateString) => {
  if (isValidDate(dateString)) {
    const datetimeObject = new Date(dateString);
    let month = datetimeObject.getUTCMonth() + 1;
    if (month < 10) {
      month = "0" + month;
    }
    return datetimeObject.getUTCFullYear() + "-" + month;
  } else {
    throw new DateTimeParsingException("Not a valid datetime string");
  }
};

/**
 * checks if a string contains a valid type
 *
 * @param {string} typeString a string containing step type
 * @returns {boolean} returns true if the passed string is a correct step type
 */
const isValidType = (typeString) => {
  const knownTypes = [
    "VALIDATION",
    "REFINEMENT",
    "SEND_PEC",
    "SEND_PAPER_AR_890",
    "SEND_AMR",
  ];

  if (typeof typeString === "string" && knownTypes.includes(typeString)) {
    return true;
  }

  return false;
};

module.exports = {
  isValidDate,
  isValidType,
  dateTimeStringToUNIXTimeStamp,
  dateTimeStringToYearAndMonth,
};
