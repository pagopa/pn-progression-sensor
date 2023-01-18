import { extractKinesisData } from './lib/kinesis.js';
import { preparePayload } from './lib/dynamodb.js';

const handleEvent = async (event) => {
    const cdcEvents = extractKinesisData(event);
    console.log(`Batch size: ${cdcEvents.length} cdc`);
  
    const processedItems = preparePayload(cdcEvents)
    console.log(`Filtered items`, processedItems)
    return {
        batchItemFailures: []
    }
  };
  
  export { handleEvent };