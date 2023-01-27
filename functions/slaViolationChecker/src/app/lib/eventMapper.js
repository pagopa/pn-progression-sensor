const { checkStillRunningActivity: findActivityEnd } = require("./dynamoDB");

const makeInsertOp = (event) => {
  const op = {
    entityName_type_relatedEntityId:
      event.dynamodb.OldImage.entityName_type_relatedEntityId.S,
    type: event.dynamodb.OldImage.type.S,
    id: event.dynamodb.OldImage.id.S,
    // NO relatedEntityId: used as read-access pattern for steps
    startTimestamp: event.dynamodb.OldImage.startTimestamp.S,
    slaExpiration: event.dynamodb.OldImage.slaExpiration.S,
    // NO step_alarmTTL: this is an Active SLA Violation
    alarmTTL: event.dynamodb.OldImage.alarmTTL.S,
    // NO alarmTTLYearToMinute: not needed for violation, it's a step read acces pattern
    // end of original fields
    active_sla_entityName_type: event.dynamodb.OldImage.type.S, // new field for SLA violations, to be removed when endTimestamp is eventually set
    sla_relatedEntityId: event.dynamodb.OldImage.relatedEntityId.S, // new field for SLA violations
    //endTimestamp is null because it's an active SLA Violation
    // end of fields
    opType: "INSERT",
    kinesisSeqNumber: event.kinesisSeqNumber,
  };

  return op;
};

const makeUpdateOp = (event, endTimestamp) => {
  const op = {
    // keys
    entityName_type_relatedEntityId:
      event.dynamodb.OldImage.entityName_type_relatedEntityId.S,
    id: event.dynamodb.OldImage.id.S,
    // what to set
    endTimestamp: endTimestamp,
    // end of fields
    opType: "UPDATE",
    kinesisSeqNumber: event.kinesisSeqNumber,
  };

  return op;
};

const mapPayload = async (event) => {
  const dynamoDbOps = [];
  if (this.checkRemovedByTTL(event)) {
    const endTimeStamp = await findActivityEnd();
    if (endTimeStamp === null) {
      // add SLA Violation, since the activity was not terminated
      dynamoDbOps.push(makeInsertOp(event));
    } else {
      // update SLA Violation (if present): active becomes storicized
      dynamoDbOps.push(makeUpdateOp(event, endTimeStamp));
    }
  }

  return dynamoDbOps;
};

exports.checkRemovedByTTL = (kinesisEvent) => {
  // reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html
  if (
    kinesisEvent != null &&
    kinesisEvent.eventName === "REMOVE" &&
    kinesisEvent.userIdentity != null &&
    kinesisEvent.userIdentity.type === "Service" &&
    kinesisEvent.userIdentity.principalId === "dynamodb.amazonaws.com"
  ) {
    return true;
  }
  return false;
};

exports.mapEvents = async (events) => {
  let ops = [];
  for (let i = 0; i < events.length; i++) {
    const dynamoDbOps = await mapPayload(events[i]); // we are adding an array, not a single element
    ops = ops.concat(dynamoDbOps);
  }
  return ops;
};
