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

const mapPayload = (event) => {
  const dynamoDbOps = [];
  if (this.checkRemovedByTTL(event)) {
    const op = makeInsertOp(event);
    dynamoDbOps.push(op);
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

exports.mapEvents = (events) => {
  let ops = [];
  for (let i = 0; i < events.length; i++) {
    const dynamoDbOps = mapPayload(events[i]);
    ops = ops.concat(dynamoDbOps);
  }
  return ops;
};
