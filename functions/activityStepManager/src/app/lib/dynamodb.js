import { ddbDocClient } from './ddbClient.js';
import { DeleteCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import moment from 'moment-business-days-it';

const allowedTimelineCategories = [
    'REQUEST_ACCEPTED',
    'REQUEST_REFUSED',
    'REFINEMENT',
    'NOTIFICATION_VIEWED',
    'SEND_DIGITAL_DOMICILE',
    'SEND_DIGITAL_FEEDBACK',
    'SEND_ANALOG_DOMICILE',
    'SEND_ANALOG_FEEDBACK',
    'DIGITAL_FAILURE_WORKFLOW',
    'SEND_SIMPLE_REGISTERED_LETTER',
    'SEND_SIMPLE_REGISTERD_LETTER_PROGRESS'
]

function calculateNextDate(startTS, days){
    if(days<1){
        const hours = 24*days
        const date = moment(startTS).add(hours, 'hours');
        if(date.isBusinessDay()) return date.toISOString();
        return date.nextBusinessDay().toISOString();
    } else {
        const date = moment(startTS).businessAdd(days);
        if(date.isBusinessDay()) return date.toISOString();
        return date.nextBusinessDay().toISOString();
    }
}

function extractRecIdsFromTimelineId(timelineElementId){
    const tokens = timelineElementId.split('_')
    const lastToken = tokens[tokens.lenght-1]
    return lastToken;
}

function mapPayload(event){
    const dynamoDbOps = []
    if(event.tableName=='pn-Notifications') {
        const alarmTTL = calculateNextDate(event.dynamodb.NewImage.sentAt.S, 0.5)
        const slaExpiration = calculateNextDate(event.dynamodb.NewImage.sentAt.S, 1)
        const step_alarmTTL = new Date(alarmTTL).getTime();
        const op = {
            type: 'VALIDATION',
            id: "00_VALID##"+event.dynamodb.NewImage.iun.S,
            relatedEntityId: event.dynamodb.NewImage.iun.S,
            startTimestamp: event.dynamodb.NewImage.sentAt.S,
            slaExpiration: slaExpiration,
            step_alarmTTL: step_alarmTTL,
            alarmTTL: alarmTTL,
            opType: 'INSERT'
        }
        dynamoDbOps.push(op)
    } else if(event.tableName=='pn-Timelines'){
        let op, recIdx, alarmTTL, slaExpiration, step_alarmTTL;
        const category = e.dynamodb.NewImage.category.S;
        switch(category) {
            case 'REQUEST_ACCEPTED':
                op = {
                    type: 'VALIDATION',
                    id: "00_VALID##"+event.dynamodb.NewImage.iun.S,
                    opType: 'DELETE'
                }
                dynamoDbOps.push(op)

                recIdx = extractRecIdsFromTimelineId(event.dynamodb.NewImage.timelineElementId.S)

                alarmTTL = calculateNextDate(event.dynamodb.NewImage.notificationSentAt.S, 110)
                slaExpiration = calculateNextDate(event.dynamodb.NewImage.notificationSentAt.S, 120)
                step_alarmTTL = new Date(alarmTTL).getTime();

                const op1 = {
                    type: 'REFINEMENT',
                    id: "01_REFIN##"+event.dynamodb.NewImage.iun.S+'_'+recIdx,
                    relatedEntityId: event.dynamodb.NewImage.iun.S,
                    startTimestamp: event.dynamodb.NewImage.notificationSentAt.S,
                    slaExpiration: slaExpiration,
                    step_alarmTTL: step_alarmTTL,
                    alarmTTL: alarmTTL,
                    opType: 'INSERT'
                }

                dynamoDbOps.push(op1)
                break;
            case 'REQUEST_REFUSED':
                op = {
                    type: 'VALIDATION',
                    id: "00_VALID##"+event.dynamodb.NewImage.iun.S,
                    opType: 'DELETE'
                }
                dynamoDbOps.push(op)

                break;
            case 'REFINEMENT':
                recIdx = extractRecIdsFromTimelineId(event.dynamodb.NewImage.timelineElementId.S)

                op = {
                    type: 'REFINEMENT',
                    id: "01_REFIN##"+event.dynamodb.NewImage.iun.S+'_'+recIdx,
                    opType: 'DELETE'
                }

                dynamoDbOps.push(op)
                break;
            case 'NOTIFICATION_VIEWED':
                recIdx = extractRecIdsFromTimelineId(event.dynamodb.NewImage.timelineElementId.S)

                op = {
                    type: 'REFINEMENT',
                    id: "01_REFIN##"+event.dynamodb.NewImage.iun.S+'_'+recIdx,
                    opType: 'DELETE'
                }

                dynamoDbOps.push(op)
                break;
            case 'SEND_DIGITAL_DOMICILE':
                alarmTTL = calculateNextDate(event.dynamodb.NewImage.timestamp.S, 2)
                slaExpiration = calculateNextDate(event.dynamodb.NewImage.timestamp.S, 2)
                step_alarmTTL = new Date(alarmTTL).getTime();

                op = {
                    type: 'SEND_PEC',
                    id: "02_PEC__##"+event.dynamodb.NewImage.timelineElementId.S,
                    relatedEntityId: event.dynamodb.NewImage.iun.S,
                    startTimestamp: event.dynamodb.NewImage.timestamp.S,
                    slaExpiration: slaExpiration,
                    step_alarmTTL: step_alarmTTL,
                    alarmTTL: alarmTTL,
                    opType: 'INSERT'
                }

                dynamoDbOps.push(op)
                break;
            case 'SEND_DIGITAL_FEEDBACK':
                op = {
                    type: 'SEND_PEC',
                    id: "02_PEC__##"+event.dynamodb.NewImage.timelineElementId.S,
                    opType: 'DELETE'
                }

                dynamoDbOps.push(op)
                break;
            case 'SEND_ANALOG_DOMICILE':
            case 'SEND_SIMPLE_REGISTERED_LETTER':
                alarmTTL = calculateNextDate(event.dynamodb.NewImage.timestamp.S, 100)
                slaExpiration = calculateNextDate(event.dynamodb.NewImage.timestamp.S, 100)
                step_alarmTTL = new Date(alarmTTL).getTime();

                op = {
                    type: 'SEND_PAPER_AR_890',
                    id: "03_PAPER##"+event.dynamodb.NewImage.timelineElementId.S,
                    relatedEntityId: event.dynamodb.NewImage.iun.S,
                    startTimestamp: event.dynamodb.NewImage.timestamp.S,
                    slaExpiration: slaExpiration,
                    step_alarmTTL: step_alarmTTL,
                    alarmTTL: alarmTTL,
                    opType: 'INSERT'
                }

                dynamoDbOps.push(op)
                break;                            
            case 'SEND_ANALOG_FEEDBACK':
                op = {
                    type: 'SEND_PAPER_AR_890',
                    id: "03_PAPER##"+event.dynamodb.NewImage.timelineElementId.S,
                    opType: 'DELETE'
                }

                dynamoDbOps.push(op)
                break;                            
            case 'DIGITAL_FAILURE_WORKFLOW':
                recIdx = event.dynamodb.NewImage.details.M.recIndex.N
                alarmTTL = calculateNextDate(event.dynamodb.NewImage.timestamp.S, 2)
                slaExpiration = calculateNextDate(event.dynamodb.NewImage.timestamp.S, 2)
                step_alarmTTL = new Date(alarmTTL).getTime();

                op = {
                    type: 'SEND_AMR',
                    id: "04_AMR##"+event.dynamodb.NewImage.iun.S+'#'+recIdx,
                    relatedEntityId: event.dynamodb.NewImage.iun.S,
                    startTimestamp: event.dynamodb.NewImage.timestamp.S,
                    slaExpiration: slaExpiration,
                    step_alarmTTL: step_alarmTTL,
                    alarmTTL: alarmTTL,
                    opType: 'INSERT'
                }

                dynamoDbOps.push(op)
                break; 
            case 'SEND_SIMPLE_REGISTERD_LETTER_PROGRESS':
                if(e.dynamodb.NewImage.registeredLetterCode && e.dynamodb.NewImage.registeredLetterCode.S){
                    recIdx = event.dynamodb.NewImage.details.M.recIndex.N
    
                    op = {
                        type: 'SEND_AMR',
                        id: "04_AMR##"+event.dynamodb.NewImage.iun.S+'#'+recIdx,                        
                        opType: 'DELETE'
                    }
    
                    dynamoDbOps.push(op)
                }
                break;                 
            default:

        }
    }

    return dynamoDbOps;
}
export const preparePayload = (events) => {
    const filteredEvents = events.filter((e) => {
        return e.eventName=='INSERT' && (e.tableName=='pn-Notifications' || (e.tableName=='pn-Timelines' && e.dynamodb.NewImage.category && allowedTimelineCategories.indexOf(e.dynamodb.NewImage.category.S)>=0 ))
    })

    let ops = []
    for(let i=0; i<filteredEvents.length; i++){
        const dynamoDbOps = mapPayload(filter[i])
        ops = ops.concat(dynamoDbOps)
    }
    return ops
}

export const executeCommands = async (events) => {
    for(let i=0; i<events.length; i++){
        if(events.opType=='DELETE'){
            const params = {}
            await ddbDocClient.send(new DeleteCommand(params));
        } else if(events.opType=='INSERT'){
            
        }
    }
}