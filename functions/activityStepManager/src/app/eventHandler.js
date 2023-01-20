const { extractKinesisData } = require('./lib/kinesis.js');
const { persistEvents } =  require('./lib/repository.js');
const { mapEvents } =  require('./lib/eventMapper.js');

exports.handleEvent = async (event) => {
    const cdcEvents = extractKinesisData(event);
    console.log(`Batch size: ${cdcEvents.length} cdc`);
  
    const processedItems = preparePayload(cdcEvents)
    console.log(`Processed items`, processedItems)

    await persistEvents(processedItems)

    return {
        batchItemFailures: []
    }
  };
  
