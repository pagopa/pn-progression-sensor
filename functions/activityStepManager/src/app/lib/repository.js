const { ddbDocClient } = require("./ddbClient.js");
const { DeleteCommand, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { twoNumbersFromIUN } = require("./utils");

function makePartitionKey(event) {
  return "step##" + event.type + "##" + event.relatedEntityId;
}

function makeDeleteCommandFromEvent(event) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      entityName_type_relatedEntityId: makePartitionKey(event),
      id: event.id,
    },
    ConditionExpression: "attribute_exists(entityName_type_relatedEntityId)",
  };

  console.log(params);

  return params;
}

function fromTimestampToYearToMinute(timestamp) {
  const d = new Date(timestamp);
  const isoString = d.toISOString();
  const dateTokens = isoString.split("T");
  let ret = dateTokens[0];
  const timeTokens = dateTokens[1].split(":");
  ret += "T" + timeTokens[0] + ":" + timeTokens[1];
  return ret;
}

function makeInsertCommandFromEvent(event) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      entityName_type_relatedEntityId: makePartitionKey(event),
      id: event.id,
      type: event.type,
      relatedEntityId: event.relatedEntityId,
      startTimestamp: event.startTimestamp,
      slaExpiration: event.slaExpiration,
      step_alarmTTL: Math.floor(event.step_alarmTTL / 1000),
      alarmTTL: event.alarmTTL,
      alarmTTLYearToMinute:
        twoNumbersFromIUN(event.relatedEntityId) +
        "#" +
        fromTimestampToYearToMinute(event.alarmTTL),
    },
    ConditionExpression:
      "attribute_not_exists(entityName_type_relatedEntityId)",
  };

  console.log(params);

  return params;
}

exports.persistEvents = async (events) => {
  const summary = {
    deletions: 0,
    insertions: 0,
    skippedDeletions: 0,
    skippedInsertions: 0,
    errors: [],
  };

  for (let i = 0; i < events.length; i++) {
    /* istanbul ignore else */
    if (events[i].opType == "DELETE") {
      const params = makeDeleteCommandFromEvent(events[i]);
      try {
        await ddbDocClient.send(new DeleteCommand(params));
        summary.deletions++;
      } catch (e) {
        if (e.name == "ConditionalCheckFailedException") {
          summary.skippedDeletions++;
        } else {
          console.error("Error on delete", events[i]);
          console.error("Error details", e);
          events[i].exception = e;
          summary.errors.push(events[i]);
        }
      }
    } else if (events[i].opType == "INSERT") {
      const params = makeInsertCommandFromEvent(events[i]);
      try {
        await ddbDocClient.send(new PutCommand(params));
        summary.insertions++;
      } catch (e) {
        if (e.name == "ConditionalCheckFailedException") {
          summary.skippedInsertions++;
        } else {
          console.error("Error on insert", events[i]);
          console.error("Error details", e);
          events[i].exception = e;
          summary.errors.push(events[i]);
        }
      }
    }
  }

  return summary;
};

exports.getNotification = async function(iun){
  try {
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      Key: {
        iun: iun
      },
    };
    const response = await ddbDocClient.send(new GetCommand(params));
    if(response.Item){
      return response.Item
    } 

    return null;
  } catch (e) {
    console.log('Get Notification error '+iun, e)
  }
  return null
}

const TABLES = {
  NOTIFICATIONS: 'pn-Notifications',
  TIMELINES: 'pn-Timelines'
}

exports.TABLES = TABLES