const { extractKinesisData } = require("./lib/kinesis.js");
const { persistEvents } = require("./lib/repository.js");
const { mapEvents } = require("./lib/eventMapper.js");

const ttlSlaTimes = {
  // The default values are stored in the microservice.yml Parameters section.
  // The values here are only for the initialization of the object and will be overwritten.
  "ALARM_TTL_VALIDATION" : 0.5,
  "ALARM_TTL_REFINEMENT" : 110,
  "ALARM_TTL_SEND_PEC" : 2,
  "ALARM_TTL_SEND_PAPER_AR_890" : 100,
  "ALARM_TTL_SEND_AMR" : 2,
  "SLA_EXPIRATION_VALIDATION" : 1,
  "SLA_EXPIRATION_REFINEMENT" : 120,
  "SLA_EXPIRATION_SEND_PEC" : 2,
  "SLA_EXPIRATION_SEND_PAPER_AR_890" : 100,
  "SLA_EXPIRATION_SEND_AMR" : 2
};

function initTtlSlaTimes() {
  ttlSlaTimes.ALARM_TTL_VALIDATION = process.env.ALARM_TTL_VALIDATION;
  ttlSlaTimes.ALARM_TTL_REFINEMENT = process.env.ALARM_TTL_REFINEMENT;
  ttlSlaTimes.ALARM_TTL_SEND_PEC = process.env.ALARM_TTL_SEND_PEC;
  ttlSlaTimes.ALARM_TTL_SEND_PAPER_AR_890 = process.env.ALARM_TTL_SEND_PAPER_AR_890;
  ttlSlaTimes.ALARM_TTL_SEND_AMR = process.env.ALARM_TTL_SEND_AMR;
  ttlSlaTimes.SLA_EXPIRATION_VALIDATION = process.env.SLA_EXPIRATION_VALIDATION;
  ttlSlaTimes.SLA_EXPIRATION_REFINEMENT = process.env.SLA_EXPIRATION_REFINEMENT;
  ttlSlaTimes.SLA_EXPIRATION_SEND_PEC = process.env.SLA_EXPIRATION_SEND_PEC;
  ttlSlaTimes.SLA_EXPIRATION_SEND_PAPER_AR_890 = process.env.SLA_EXPIRATION_SEND_PAPER_AR_890;
  ttlSlaTimes.SLA_EXPIRATION_SEND_AMR = process.env.SLA_EXPIRATION_SEND_AMR;
}

exports.handleEvent = async (event) => {
  initTtlSlaTimes();
  const cdcEvents = extractKinesisData(event);
  console.log(`Batch size: ${cdcEvents.length} cdc`);

  if (cdcEvents.length == 0) {
    console.log("No events to process");
    return {
      batchItemFailures: [],
    };
  }
  const processedItems = await mapEvents(cdcEvents, ttlSlaTimes);
  if (processedItems.length == 0) {
    console.log("No events to persist");
    return {
      batchItemFailures: [],
    };
  }

  console.log(`Items to persist`, processedItems);

  const persistSummary = await persistEvents(processedItems);
  let batchItemFailures = [];
  console.log("Persist summary", persistSummary);
  console.log(`Inserted ${persistSummary.insertions} records`);
  console.log(`Deleted ${persistSummary.deletions} records`);

  if (persistSummary.errors.length > 0) {
    console.error(
      `Activity Step Manager execution finished with ${persistSummary.errors.length} errors`,
      persistSummary.errors
    );
    batchItemFailures = persistSummary.errors.map((i) => {
      return { itemIdentifier: i.kinesisSeqNumber };
    });
  }

  return {
    batchItemFailures: batchItemFailures,
  };
};
