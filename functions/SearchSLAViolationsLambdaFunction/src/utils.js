/**
 * checks if a string contains a valid datetime
 *
 * @param {string} dateString a string containing a datetime (it must be able to become a valida Date object)
 * @returns {boolean} returns true if the passed string is a correct datetime
 */
function isValidDate(dateString) {
  const datetimeObject = new Date(dateString);
  return !Number.isNaN(datetimeObject.getTime());
}

/**
 * checks if a string contains a valid type
 *
 * @param {string} typeString a string containing step type
 * @returns {boolean} returns true if the passed string is a correct step type
 */
function isValidType(typeString) {
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
}

export { isValidDate, isValidType };
