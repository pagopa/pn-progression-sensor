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

/**
 * convert kinesis object to json object
 * @returns {obj} json obkject
 */
exports.parseKinesisObjToJsonObj = (elToParse) => {
  const jsonObj = {};
  const keysToBypass = [
    "N",
    "M",
    "S",
    "BOOL",
    "SS",
    "NS",
    "BS",
    "L",
    "NULL",
    "B",
  ];
  if (Array.isArray(elToParse)) {
    const elParsed = [];
    for (const el of elToParse) {
      elParsed.push(this.parseKinesisObjToJsonObj(el));
    }
    return elParsed;
  } else if (typeof elToParse === "object") {
    let elParsed = {};
    for (const [key, value] of Object.entries(elToParse)) {
      if (keysToBypass.includes(key)) {
        elParsed = this.parseKinesisObjToJsonObj(value);
        continue;
      }
      elParsed[key] = this.parseKinesisObjToJsonObj(value);
    }
    return elParsed;
  }
  // neither object or array (string, number or boolean)
  return elToParse;
};
