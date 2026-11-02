/**
 * convert kinesis object to json object
 * @returns {obj} json obkject
 */
exports.parseKinesisObjToJsonObj = (elToParse) => {
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
  if (elToParse === null || elToParse === undefined) {
    return elToParse;
  } else if (Array.isArray(elToParse)) {
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

exports.initTtlSlaTimes = () => {
  const ttlSlaTimes = {
    // The default values are stored in the microservice.yml Parameters section.
    // The values here are only for the initialization of the object and will be overwritten.
    INVOICING_TTL_DAYS: 365,
  };

  ttlSlaTimes.INVOICING_TTL_DAYS =
    process.env.INVOICING_TTL_DAYS || ttlSlaTimes.INVOICING_TTL_DAYS;

  // ensure any property is a float number and not a string
  for (const [key, value] of Object.entries(ttlSlaTimes)) {
    ttlSlaTimes[key] = parseFloat(value);

    if (isNaN(ttlSlaTimes[key])) {
      console.error(
        `ERROR: the value for ${key} is not a number: ${value}. Please check the environment variables.`
      );
    }

    if (ttlSlaTimes[key] === 0) {
      console.warn(
        `WARNING: the value for ${key} is 0. Please check the environment variables.`
      );
    }
  }

  return ttlSlaTimes;
};
