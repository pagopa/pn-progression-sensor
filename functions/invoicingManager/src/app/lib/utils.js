exports.initTtlTimes = () => {
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
