import { extractKinesisData } from './lib/kinesis.js';
import { preparePayload, executeCommands } from './lib/dynamodb.js';

const handleEvent = async (event) => {
    const cdcEvents = extractKinesisData(event);
    console.log(`Batch size: ${cdcEvents.length} cdc`);
  
    const processedItems = preparePayload(cdcEvents)
    console.log(`Processed items`, processedItems)

    await executeCommands(processedItems)

    return {
        batchItemFailures: []
    }
  };
  
  export { handleEvent };