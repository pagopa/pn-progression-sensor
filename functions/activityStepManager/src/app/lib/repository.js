const { ddbDocClient } = require("./ddbClient.js");
const {
  DeleteCommand,
  PutCommand,
  GetCommand,
  BatchGetCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
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
      step_alarmTTL: event.step_alarmTTL,
      alarmTTL: event.alarmTTL,
      alarmTTLYearToMinute:
        twoNumbersFromIUN(event.relatedEntityId) +
        "#" +
        fromTimestampToYearToMinute(event.alarmTTL),
    },
    ConditionExpression:
      "attribute_not_exists(entityName_type_relatedEntityId)",
  };

  if(event.hasPhysicalAddressLookup) {
    params.Item.hasPhysicalAddressLookup = event.hasPhysicalAddressLookup;
  }

  console.log(params);

  return params;
}

function makeBulkInsertInvoicesCommandFromEvent(event) {
  const params = {
    RequestItems: {
      [process.env.INVOICING_DYNAMODB_TABLE]: event.payload.map((p) => ({
        PutRequest: {
          Item: p,
        },
      })),
    },
  };

  console.log(JSON.stringify(params));

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

  for (const evt of events) {
    /* istanbul ignore else */
    if (evt.opType == "DELETE") {
      const params = makeDeleteCommandFromEvent(evt);
      try {
        await ddbDocClient.send(new DeleteCommand(params));
        summary.deletions++;
      } catch (e) {
        if (e.name == "ConditionalCheckFailedException") {
          summary.skippedDeletions++;
        } else {
          console.error("Error on delete", evt);
          console.error("Error details", e);
          evt.exception = e;
          summary.errors.push(evt);
        }
      }
    } else if (evt.opType == "INSERT") {
      const params = makeInsertCommandFromEvent(evt);
      try {
        await ddbDocClient.send(new PutCommand(params));
        summary.insertions++;
      } catch (e) {
        if (e.name == "ConditionalCheckFailedException") {
          summary.skippedInsertions++;
        } else {
          console.error("Error on insert", evt);
          console.error("Error details", e);
          evt.exception = e;
          summary.errors.push(evt);
        }
      }
    } else if (evt.opType == "BULK_INSERT_INVOICES") {
      console.log("Save elements to invoicing table");
      const params = makeBulkInsertInvoicesCommandFromEvent(evt);
      try {
        await ddbDocClient.send(new BatchWriteCommand(params));
        summary.insertions++;
      } catch (e) {
        console.error("Error on batch insert", evt);
        console.error("Error details", e);
        evt.exception = e;
        summary.errors.push(evt);
      }
    }
  }

  return summary;
};

exports.getNotification = async function (iun) {
  try {
    const params = {
      TableName: TABLES.NOTIFICATIONS,
      Key: {
        iun: iun,
      },
    };
    const response = await ddbDocClient.send(new GetCommand(params));
    if (response.Item) {
      return response.Item;
    }

    return null;
  } catch (e) {
    console.log("Get Notification error " + iun, e);
  }
  return null;
};

exports.getTimelineElements = async function (iun, timelineElementIds) {
  console.log("Getting timeline elments ", iun, timelineElementIds);
  try {
    const params = {
      RequestItems: {
        [TABLES.TIMELINES]: {
          Keys: timelineElementIds.map((t) => ({
            iun,
            timelineElementId: t,
          })),
        },
      },
    };
    console.log(JSON.stringify(params));
    const response = await ddbDocClient.send(new BatchGetCommand(params));
    if (response.Responses) {
      return response.Responses[TABLES.TIMELINES];
    }
    return null;
  } catch (e) {
    console.log("Get Timeline elements error " + iun, e);
  }
  return null;
};

const TABLES = {
  NOTIFICATIONS: "pn-Notifications",
  TIMELINES: "pn-Timelines",
};

exports.TABLES = TABLES;
