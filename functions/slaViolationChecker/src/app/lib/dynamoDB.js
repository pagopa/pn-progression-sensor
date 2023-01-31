const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.REGION,
});

/**
 * checks wheter the activity is ended or is still running
 * @returns {Promise<string>} returns the ISO timestamp of the ended searched activity, or null if the activity is still running
 */
exports.findActivityEnd = async (iun, id, type) => {
  const tableName = "pn-Timelines";

  // 1. get IUN directly and build timelineElementId from event id
  const params = {
    TableName: tableName,
  };
  let altSortKey = null;

  // instead of performing a query with filter, we can construct the partition and the sort key and perform a GetItem (eventually two)
  switch (type) {
    case "VALIDATION":
      // type VALIDATION:
      // - INSERT in pn-Timelines di un record con category REQUEST_ACCEPTED indica la terminazione di una “attività di validazione”
      // - INSERT in pn-Timelines di un record con category REQUEST_REFUSED indica la terminazione di una “attività di validazione”:
      const timelineBaseValidation = id.split("##")[1];
      const timeLineIdAccepted = timelineBaseValidation + "_request_accepted";
      const timeLineIdRefused = timelineBaseValidation + "_request_refused";
      params.Key = {
        iun: iun,
        timeLineElementId: timeLineIdAccepted,
      };
      altSortKey = timeLineIdRefused;
      break;
    case "REFINEMENT":
      // type REFINEMENT:
      // - INSERT in pn-Timelines di un record con category REFINEMENT indica la fine di una “attività di consegna” per uno dei destinatari della notifica
      // - INSERT in pn-Timelines di un record con category NOTIFICATION_VIEWED indica la fine di una “attività di consegna” per uno dei destinatari della notifica
      const timelineBaseRefinement = id.replace("01_REFIN##", "");
      const timeLineIdRefinement = timelineBaseRefinement.replace(
        "##",
        "_refinement_"
      );
      const timeLineIdNotificationViewed = timelineBaseRefinement.replace(
        "##",
        "_notification_viewed_"
      );
      params.Key = {
        iun: iun,
        timeLineElementId: timeLineIdRefinement,
      };
      altSortKey = timeLineIdNotificationViewed;
      break;
    case "SEND_PEC":
      // SEND_PEC:
      // - INSERT in pn-Timelines di un record con category SEND_DIGITAL_FEEDBACK indica la fine di una “attività di invio PEC”
      const timeLineIdSendDigitalFeedback = id
        .replace("02_PEC__##", "")
        .replace("send_digital_domicile", "send_digital_feedback");
      params.Key = {
        iun: iun,
        timeLineElementId: timeLineIdSendDigitalFeedback,
      };
      break;
    case "SEND_PAPER_AR_890":
      // SEND_PAPER_AR_890
      // - INSERT in pn-Timelines di un record con category SEND_ANALOG_FEEDBACK indica la fine di un’attività di “invio cartaceo con ritorno”
      const timelineIdPaperAR890 = id
        .replace("03_PAPER##", "")
        .replace("send_analog_domicile", "send_analog_feedback"); // SEE: SEND_SIMPLE_REGISTERED_LETTER
      params.Key = {
        iun: iun,
        timeLineElementId: timelineIdPaperAR890,
      };
      break;
    case "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS": // TO BE DEFINED: NOT IMPLEMENTED YET!!! always returns null
      // SEND_AMR (AL MOMENTO NON VIENE CHIUSA: codice mancante)
      // - INSERT in pn-Timelines di un record con category SEND_SIMPLE_REGISTERED_LETTER_PROGRESS con attributo “registeredLetterCode“ valorizzato indica la fine di un’attività di “invio cartaceo Avviso Mancato Recapito”
      return null;
    //break;
    default:
      // nothing...
      return null;
  }

  const dynamoDB = DynamoDBDocumentClient.from(client);

  try {
    // we perform a GetItem and, in case we also have an alternative sort key, we perform a second GetItem
    // in case the first one did not produce a result
    let response = await dynamoDB.send(new GetCommand(params));
    if (response.Item == null && altSortKey !== null) {
      params.Key.timeLineElementId = altSortKey; // query with the alternative sort key
      response = await dynamoDB.send(new GetCommand(params));
    }
    // 2. extract and return endTimestamp
    return response.Item?.timestamp || null;
  } catch (error) {
    /* istanbul ignore next */
    console.log("ERROR during GetItem: ", error);
    /* istanbul ignore next */
    return null;
  }
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
      "SET #endTimestamp = :eT REMOVE #active_sla_entityName_type",
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

  const dynamoDB = DynamoDBDocumentClient.from(client);

  for (let i = 0; i < events.length; i++) {
    if (events[i].opType == "INSERT") {
      const params = this.makeInsertCommandFromEvent(events[i]);
      try {
        // db operation
        await dynamoDB.send(new PutCommand(params));
        summary.insertions++;
        console.log(
          "SLA Violation insertion performed: ",
          JSON.stringify(params)
        );
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
        const data = await dynamoDB.send(new UpdateCommand(params));
        if (data) {
          summary.updates++;
          console.log(
            "SLA Violation storicization performed: ",
            JSON.stringify(params)
          );
          console.log("UpdateItem response: ", data);
        }
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
