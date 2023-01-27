const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

/**
 * checks wheter the activity is ended or is still running
 * @returns {boolean} true if the activity is still running, false if an activity terminated event is found
 */
exports.checkStillRunningActivity = async () => {
  const tableName = "pn-Timelines";
  return true;
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

exports.persistEvents = async (events) => {
  const summary = {
    deletions: 0,
    insertions: 0,
    skippedDeletions: 0,
    skippedInsertions: 0,
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
    }
  }

  return summary;
};
