const { ddbDocClient } = require('./ddbClient.js');
const { DeleteCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

function makePartitionKey(event){
    return 'step_'+event.type+'_'+event.relatedEntityId   
}

function makeDeleteCommandFromEvent(event){
    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
            entityName_type_relatedEntityId: makePartitionKey(event),
            id: event.id
        },
        ConditionExpression: 'attribute_exists(entityName_type_relatedEntityId)'
    }

    console.log(params)
    
    return params
}

function fromTimestampToYearToMinute(timestamp){
    const d = new Date(timestamp);
    const isoString = d.toISOString();
    const dateTokens = isoString.split('T')
    let ret = dateTokens[0]
    const timeTokens = dateTokens[1].split(':')
    ret += 'T'+timeTokens[0]+':'+timeTokens[1]
    return ret
}

function makeInsertCommandFromEvent(event){
    const params = {
        TableName: process.env.DYNAMODB_TABLE,
        Item: {
            entityName_type_relatedEntityId: makePartitionKey(event),
            id: event.id,
            type: event.type,
            relatedEntityId: event.relatedEntityId,
            startTimestamp: event.startTimestamp,
            slaExpiration: event.slaExpiration,
            step_alarmTTL: Math.floor(event.step_alarmTTL / 1000) ,
            alarmTTL: event.alarmTTL,
            alarmTTLYearToMinute: fromTimestampToYearToMinute(event.alarmTTL)
        },
        ConditionExpression: 'attribute_not_exists(entityName_type_relatedEntityId)'
    }

    console.log(params)
    
    return params
}

exports.persistEvents = async (events) => {
    const summary = {
        deletions: 0,
        insertions: 0,
        errors: []
    }

    for(let i=0; i<events.length; i++){
        /* istanbul ignore else */
        if(events[i].opType=='DELETE'){
            const params = makeDeleteCommandFromEvent(events[i])
            try {
                await ddbDocClient.send(new DeleteCommand(params));
                summary.deletions++
            } catch(e){
                summary.errors.push(events[i])              
            }
        } else if(events[i].opType=='INSERT'){
            const params = makeInsertCommandFromEvent(events[i])
            try {
                await ddbDocClient.send(new PutCommand(params));
                summary.insertions++
            } catch(e){
                summary.errors.push(events[i])       
            }
        }
    }

    return summary
}