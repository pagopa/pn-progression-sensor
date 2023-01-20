const { extractKinesisData } = require('./lib/kinesis.js');
const { preparePayload, executeCommands } =  require('./lib/dynamodb.js');

exports.handleEvent = async (event) => {
    const cdcEvents = extractKinesisData(event);
    console.log(`Batch size: ${cdcEvents.length} cdc`);
  
    const processedItems = preparePayload(cdcEvents)
    console.log(`Processed items`, processedItems)

    await executeCommands(processedItems)

    return {
        batchItemFailures: []
    }
  };
  
