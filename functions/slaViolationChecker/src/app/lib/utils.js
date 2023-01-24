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
 * checks if the passed UNIX timestamp (a number) is in the past
 *
 * @param {number} unixTimestamp a number containing a UNIX timestamp (such as the one usable for DynamoDB item TTL)
 * @returns true if the passed UNIX timestamp has passed, false otherwise (including when a number is not passed to the function)
 */
const isUNIXTimeStampPast = (unixTimestamp) => {
  if (typeof unixTimestamp !== "number") {
    return false;
  }
  const now = new Date();
  const nowTimeStamp = Math.floor(now.getTime() / 1000);

  return unixTimestamp < nowTimeStamp; // be careful: nowTimeStamp, not now!!!
};

module.exports = {
  isValidDate,
  dateTimeStringToUNIXTimeStamp,
  isUNIXTimeStampPast,
};
