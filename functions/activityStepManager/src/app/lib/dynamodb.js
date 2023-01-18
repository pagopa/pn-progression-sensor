import { DynamoDBClient, BatchExecuteStatementCommand } from "@aws-sdk/client-dynamodb";

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
    'SEND_SIMPLE_REGISTERD_LETTER_PROGRESS'
]

export const preparePayload = function(events){
    const ret = [];
    const filteredEvents = events.filter((e) => {
        return e.eventName=='INSERT' && (e.tableName=='pn-Notifications' || (e.tableName=='pn-Timelines' && e.dynamodb.NewImage.category && allowedTimelineCategories.indexOf(e.dynamodb.NewImage.category.S)>=0 ))
    })

    return filteredEvents
//    return ret;
}