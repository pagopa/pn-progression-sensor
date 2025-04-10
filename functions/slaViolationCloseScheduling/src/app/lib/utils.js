/**
 * checks if a string contains a valid type
 *
 * @param {string} typeString a string containing step type
 * @returns {boolean} returns true if the passed string is a correct step type
 */
exports.isValidType = (typeString) => {
  const knownTypes = [
    "VALIDATION",
    "VALIDATION_WITH_VAS_ADDRESS",
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
