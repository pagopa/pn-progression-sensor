exports.mapEvents = (events) => {
  // ...
  console.log("mapEvents, events: ", events);

  let ops = [];
  // ...
  return ops;
};

exports.checkRemovebyTTL = (kinesisEvent) => {
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
