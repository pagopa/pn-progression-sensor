const { ddbDocClient } = require('./ddbClient.js');
const { DeleteCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

function makePartitionKey(event){
    return 'step_'+event.type+'_'+event.relatedEntityId   
}

function makeDeleteCommandFromEvent(event){
    const params = {
        TableName: process.env.PROGRESSION_SENSOR_TABLE_NAME,
        Key: {
            entityName_type_relatedEntityId: makePartitionKey(event),
            id: event.id
        },
        ConditionExpression: 'attribute_exists(entityName_type_relatedEntityId)'
    }
    
    return params
}

function makeInsertCommandFromEvent(event){
    const params = {
        TableName: process.env.PROGRESSION_SENSOR_TABLE_NAME,
        Item: {
            entityName_type_relatedEntityId: makePartitionKey(event),
            id: event.id,
            relatedEntityId: event.relatedEntityId,
            startTimestamp: event.startTimestamp,
            slaExpiration: event.slaExpiration,
            step_alarmTTL: event.step_alarmTTL,
            alarmTTL: event.alarmTTL
        },
        ConditionExpression: 'attribute_not_exists(entityName_type_relatedEntityId)'
    }
    
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