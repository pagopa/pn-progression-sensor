const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

/**
 * checks wheter the activity is ended or is still running
 * @returns {string} returns the ISO timestamp of the ended searched activity, or null if the activity is still running
 */
exports.checkStillRunningActivity = async () => {
  const tableName = "pn-Timelines";
  return null;
};

/**
 * create params object for put if not exist operation
 *
 * @param {Object} event the event object from eventMapper
 * @returns {Object} the params object to be used on DynamoDB for the insert operation
 */
exports.makeInsertCommandFromEvent = (event) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      entityName_type_relatedEntityId:
        event.entityName_type_relatedEntityId.replace("step##", "sla##"), // replace: step## -> sla## (not a step, but a sla violation)
      type: event.type,
      id: event.id,
      startTimestamp: event.startTimestamp,
      slaExpiration: event.slaExpiration,
      alarmTTL: event.alarmTTL,
      active_sla_entityName_type: event.type,
      sla_relatedEntityId: event.sla_relatedEntityId,
    },
    ConditionExpression:
      "attribute_not_exists(entityName_type_relatedEntityId)",
  };

  //console.log(params);

  return params;
};

exports.makeUpdateCommandFromEvent = (event) => {
  // if attribute active_sla_entityName_type exist:
  //  - remove active_sla_entityName_type
  //  - set endTimestamp
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      entityName_type_relatedEntityId: event.entityName_type_relatedEntityId,
      id: event.id,
    },
    UpdateExpression:
      "SET #active_sla_entityName_type = :eT REMOVE #endTimestamp",
    ExpressionAttributeNames: {
      "#endTimestamp": "endTimestamp",
      "#active_sla_entityName_type": "active_sla_entityName_type",
    },
    ExpressionAttributeValues: {
      ":eT": event.endTimestamp,
    },
    ConditionExpression: "attribute_exists(#active_sla_entityName_type)",
  };

  return params;
};

exports.persistEvents = async (events) => {
  const summary = {
    insertions: 0,
    updates: 0,
    skippedInsertions: 0,
    skippedUpdates: 0,
    errors: [],
  };

  const client = new DynamoDBClient({
    region: process.env.REGION,
  });
  const dynamoDB = DynamoDBDocumentClient.from(client);

  for (let i = 0; i < events.length; i++) {
    if (events[i].opType == "INSERT") {
      const params = this.makeInsertCommandFromEvent(events[i]);
      try {
        // db operation
        await dynamoDB.send(new PutCommand(params));
        summary.insertions++;
      } catch (error) {
        /* istanbul ignore next */
        if (error.name == "ConditionalCheckFailedException") {
          summary.skippedInsertions++;
        } else {
          console.error("Error on insert if not exists", events[i]);
          console.error("Error details", error);
          events[i].exception = error;
          summary.errors.push(events[i]);
        }
      }
    } else if (events[i].opType == "UPDATE") {
      const params = this.makeUpdateCommandFromEvent(events[i]);
      try {
        await dynamoDB.send(new UpdateCommand(params));
        summary.updates++;
      } catch (error) {
        /* istanbul ignore next */
        if (error.name == "ConditionalCheckFailedException") {
          summary.skippedUpdates++;
        } else {
          console.error("Error on update if exists", events[i]);
          console.error("Error details", error);
          events[i].exception = error;
          summary.errors.push(events[i]);
        }
      }
    }
  }

  return summary;
};
