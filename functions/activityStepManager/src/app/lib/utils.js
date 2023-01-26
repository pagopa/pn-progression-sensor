/**
 * produces, starting from a string containing the IUN, a numeric sequence from 00 to 10 (11 total values)
 * @param {string} iun_string the string containing the IUN
 * @returns {string} "00" to "10"
 */
exports.twoNumbersFromIUN = (iun_string) => {
  const controlLetter = this.controlLetterFromIUN(iun_string).toUpperCase();

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letterIndex = alphabet.indexOf(controlLetter.toUpperCase());
  return (letterIndex % 11).toString().padStart(2, "0"); // "00" to "10", not to "09", so 11, not 10
};

/**
 * extracts the control letter from the IUN string
 * @param {string} iun_string the string containing the IUN
 * @returns {string} 'A' to 'Z'
 */
exports.controlLetterFromIUN = (iun_string) => {
  const parts = iun_string.split("-");
  return parts[parts.length - 2];
};
