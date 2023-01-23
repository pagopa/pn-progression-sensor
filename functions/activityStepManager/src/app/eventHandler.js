const { extractKinesisData } = require('./lib/kinesis.js');
const { persistEvents } =  require('./lib/repository.js');
const { mapEvents } =  require('./lib/eventMapper.js');

exports.handleEvent = async (event) => {
    const cdcEvents = extractKinesisData(event);
    console.log(`Batch size: ${cdcEvents.length} cdc`);
  
    if(cdcEvents.length==0){
        console.log('No events to process')
        return {
            batchItemFailures: []
        }
    }
    const processedItems = mapEvents(cdcEvents)
    if(processedItems.length==0){
        console.log('No events to persist')        
        return {
            batchItemFailures: []
        }
    }

    console.log(`Items to persist`, processedItems)

    const persistSummary = await persistEvents(processedItems)
    let batchItemFailures = []
    console.log('Persist summary', persistSummary)
    console.log(`Inserted ${persistSummary.insertions} records`);
    console.log(`Deleted ${persistSummary.deletions} records`);

    if(persistSummary.errors.length>0){
        console.error(`Activity Step Manager execution finished with ${persistSummary.errors.length} errors`, persistSummary.errors);
        batchItemFailures = persistSummary.errors.map((i) => {
            return i.kinesisSeqNumber
        })
    }

    return {
        batchItemFailures: batchItemFailures
    }
  };
  
