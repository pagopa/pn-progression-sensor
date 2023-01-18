import { extractKinesisData } from './lib/kinesis.js';

const handleEvent = async (event) => {
    const cdc = extractKinesisData(event);
    console.log(`Batch size: ${cdc.length} cdc`);
  
    return {
        batchItemFailures: []
    }
  };
  
  export { handleEvent };