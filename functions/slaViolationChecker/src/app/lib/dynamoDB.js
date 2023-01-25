const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

function makeInsertIfNotExistsCommandFromEvent(event) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      entityName_type_relatedEntityId:
        event.entityName_type_relatedEntityId.replace("step##", "sla##"), // replace: step## -> sla## (not a step, but a sla violation)
      type: event.type,
      id: event.it,
      relatedEntityId: event.relatedEntityId,
      startTimestamp: event.startTimestamp,
      slaExpiration: event.slaExpiration,
      alarmTTL: event.alarmTTL,
      entityName_type_relatedEntityId: event.entityName_type_relatedEntityId,
      active_sla_entityName_type: event.type,
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

  const client = new DynamoDBClient({
    region: process.env.REGION,
  });
  const dynamoDB = DynamoDBDocumentClient.from(client);

  for (let i = 0; i < events.length; i++) {
    if (events[i].opType == "INSERT_IF_NOT_EXISTS") {
      const params = makeInsertIfNotExistsCommandFromEvent(events[i]);
      try {
        // db operation
        await dynamoDB.send(new PutCommand(params));
        summary.insertions++;
      } catch (error) {
        if (e.name == "ConditionalCheckFailedException") {
          summary.skippedInsertions++;
        } else {
          console.error("Error on insert if not exists", events[i]);
          console.error("Error details", error);
          events[i].exception = error; // same index as the event index
          summary.errors.push(events[i]);
        }
      }
    }
  }

  return summary;
};
