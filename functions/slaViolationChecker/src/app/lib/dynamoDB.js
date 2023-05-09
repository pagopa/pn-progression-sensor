const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { dateTimeStringToYearAndMonth } = require("./utils");

const client = new DynamoDBClient({
  region: process.env.REGION,
});

const sepChar = ".";

exports.closingElementIdFromIDAndType = (id, type) => {
  const returnCouple = {
    mainTimelineElementId: null,
    alternativeTimelineElementId: null,
  };

  switch (type) {
    case "VALIDATION": // id: 00_VALID##WEUD-XHKG-ZHDN-202301-W-1 -> REQUEST_ACCEPTED.IUN_WEUD-XHKG-ZHDN-202301-W-1 and REQUEST_REFUSED.IUN_WEUD-XHKG-ZHDN-202301-W-1
      // type VALIDATION:
      // - INSERT in pn-Timelines of a record with category REQUEST_ACCEPTED: VALIDATION activity end
      // - INSERT in pn-Timelines of a record with category REQUEST_REFUSED: VALIDATION activity end
      const timelineBaseValidation = id.split("##")[1]; // IUN remains
      const timeLineIdAccepted =
        "REQUEST_ACCEPTED" + sepChar + "IUN_" + timelineBaseValidation;
      const timeLineIdRefused =
        "REQUEST_REFUSED" + sepChar + "IUN_" + timelineBaseValidation;
      returnCouple.mainTimelineElementId = timeLineIdAccepted;
      returnCouple.alternativeTimelineElementId = timeLineIdRefused;
      break;
    case "REFINEMENT": // id: 01_REFIN##REKD-NZRJ-NWQJ-202302-M-1##0 -> REFINEMENT.IUN_REKD-NZRJ-NWQJ-202302-M-1.RECINDEX_0 and NOTIFICATION_VIEWED.IUN_REKD-NZRJ-NWQJ-202302-M-1.RECINDEX_0
      // type REFINEMENT:
      // - INSERT in pn-Timelines of a record with category REFINEMENT: DELIVERY activity end for one of the recipients
      // - INSERT in pn-Timelines of a record with category NOTIFICATION_VIEWED: DELIVERY activity end for one of the recipients
      const timelineBaseRefinement = id
        .replace("01_REFIN##", "IUN_")
        .replace("##", sepChar + "RECINDEX_");
      const timeLineIdRefinement =
        "REFINEMENT" + sepChar + timelineBaseRefinement;
      const timeLineIdNotificationViewed =
        "NOTIFICATION_VIEWED" + sepChar + timelineBaseRefinement;
      returnCouple.mainTimelineElementId = timeLineIdRefinement;
      returnCouple.alternativeTimelineElementId = timeLineIdNotificationViewed;
      break;
    case "SEND_PEC": // id: 02_PEC__##SEND_DIGITAL.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0.SOURCE_SPECIAL.REPEAT_false.ATTEMPT_0 -> SEND_DIGITAL_FEEDBACK.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0.SOURCE_SPECIAL.ATTEMPT_0
      // SEND_PEC:
      // - INSERT in pn-Timelines of a record with category SEND_DIGITAL_FEEDBACK: SEND PEC activity end
      const timeLineIdSendDigitalFeedback = id
        .replace("02_PEC__##", "")
        .replace("SEND_DIGITAL", "SEND_DIGITAL_FEEDBACK")
        .replace(".REPEAT_false", "")
        .replace(".REPEAT_true", "");
      returnCouple.mainTimelineElementId = timeLineIdSendDigitalFeedback;
      returnCouple.alternativeTimelineElementId = null;
      break;
    case "SEND_PAPER_AR_890": // id: 03_PAPER##SEND_ANALOG_DOMICILE.IUN_DNQZ-QUQN-202302-W-1.RECINDEX_1.ATTEMPT_1 -> SEND_ANALOG_FEEDBACK.IUN_DNQZ-QUQN-202302-W-1.RECINDEX_1.ATTEMPT_1
      // SEND_PAPER_AR_890
      // - INSERT in pn-Timelines of a record with category SEND_ANALOG_FEEDBACK: SEND PAPER AR activity end
      const timelineIdPaperAR890 = id
        .replace("03_PAPER##", "")
        .replace("SEND_ANALOG_DOMICILE", "SEND_ANALOG_FEEDBACK");
      returnCouple.mainTimelineElementId = timelineIdPaperAR890;
      returnCouple.alternativeTimelineElementId = null;
      break;
    /* istanbul ignore next */
    case "SEND_AMR": // id: 04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1 -> SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_1 (we always look for IDX_1)
      // - INSERT in pn-Timelines of a record with category SEND_SIMPLE_REGISTERED_LETTER_PROGRESS with “registeredLetterCode“ attribute: SEND PAPER ARM activity end
      const timelineBaseAMR = id
        .replace("04_AMR##", "IUN_")
        .replace("##", sepChar + "RECINDEX_");
      returnCouple.mainTimelineElementId =
        "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS" +
        sepChar +
        timelineBaseAMR +
        sepChar +
        "IDX_1";
      returnCouple.alternativeTimelineElementId = null;
      break;
    /* istanbul ignore next */
    default:
      returnCouple.mainTimelineElementId = null;
      returnCouple.alternativeTimelineElementId = null;
      break;
  }
  return returnCouple;
};

/**
 * checks wheter the activity is ended or is still running
 * @returns {Promise<string>} returns the ISO timestamp of the ended searched activity, or null if the activity is still running
 */
exports.findActivityEnd = async (iun, id, type) => {
  const tableName = "pn-Timelines";

  // 1. get IUN directly and build timelineElementId from event id
  const params = {
    TableName: tableName,
    Key: {
      iun: iun,
    },
  };

  // instead of performing a query with filter, we can construct the partition and the sort key and perform a GetItem (eventually two)
  const returnCouple = this.closingElementIdFromIDAndType(id, type);
  if (returnCouple.mainTimelineElementId === null) {
    // event not computed, directly return null
    return null;
  }
  params.Key.timelineElementId = returnCouple.mainTimelineElementId;
  const altSortKey = returnCouple.alternativeTimelineElementId;

  const dynamoDB = DynamoDBDocumentClient.from(client);

  try {
    // we perform a GetItem and, in case we also have an alternative sort key, we perform a second GetItem
    // in case the first one did not produce a result
    let response = await dynamoDB.send(new GetCommand(params));

    if (response.Item == null) {
      console.log(
        "Nothing found on GetItem with the sort key: " +
          params.Key.timelineElementId
      );
      if (altSortKey !== null) {
        console.log("GetItem with alternative sort key: " + altSortKey);

        params.Key.timelineElementId = altSortKey; // GetItem with the alternative sort key
        response = await dynamoDB.send(new GetCommand(params));

        if (response.Item == null) {
          console.log(
            "Nothing found on GetItem with the alternative sort key: " +
              params.Key.timelineElementId
          );
        }
      }
    }

    if (response.Item == null) {
      console.log("Nothing found on GetItem with the partition key: " + iun);
      return null;
    } else {
      console.log("Returned item: " + JSON.stringify(response.Item));
    }

    // 2. extract and return endTimestamp
    //
    // when SEND_SIMPLE_REGISTERED_LETTER_PROGRESS is be present, we also need to check the presence of the
    // registeredLetterCode attribute (we no longer require that deliveryDetailCode is "CON080"), and only in that case return
    // the timestamp instead of null, only for SEND_AMR type
    //
    // note: we only perform this for .IDX_1

    if (type === "SEND_AMR") {
      // warning log in case we have registeredLetterCode but not deliveryDetailCode === "CON080"
      if (
        response.Item.details &&
        response.Item.details.registeredLetterCode &&
        response.Item.details.deliveryDetailCode !== "CON080"
      ) {
        console.warn(
          "problem checking SEND_SIMPLE_REGISTERED_LETTER_PROGRESS: registeredLetterCode present but deliveryDetailCode not CON080: " +
            response.Item.details.deliveryDetailCode +
            ", item: " +
            JSON.stringify(response.Item)
        );
      }

      return response.Item.details && response.Item.details.registeredLetterCode // we no longer require that response.Item.details.deliveryDetailCode === "CON080"
        ? response.Item.timestamp || null
        : null;
    } else {
      // all other cases
      return response.Item.timestamp || null;
    }
  } catch (error) {
    /* istanbul ignore next */
    console.log(
      "ERROR during GetItem: ",
      error,
      ", params: ",
      JSON.stringify(params)
    );
    /* istanbul ignore next */
    throw error; // after logging, we rethrow the error, for the caller to catch it
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
  //  - set endTimeStamp (uppercase S)
  //  - type_endTimestampYearMonth (lowercase S)
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      entityName_type_relatedEntityId: event.entityName_type_relatedEntityId,
      id: event.id,
    },
    UpdateExpression:
      "SET #endTimeStamp = :eT, #type_endTimestampYearMonth = :eTYM REMOVE #active_sla_entityName_type",
    ExpressionAttributeNames: {
      "#endTimeStamp": "endTimeStamp",
      "#active_sla_entityName_type": "active_sla_entityName_type",
      "#type_endTimestampYearMonth": "type_endTimestampYearMonth",
    },
    ExpressionAttributeValues: {
      ":eT": event.endTimeStamp,
      ":eTYM":
        event.type + "##" + dateTimeStringToYearAndMonth(event.endTimeStamp),
    },
    // so it's an update that doesn't fall back to insert and doesn't try to remove a parameter previously removed
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
          console.log(
            "conditional insert exception detail: ",
            JSON.stringify(error)
          );
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
        } else {
          console.log("ERROR: UpdateItem response null!");
        }
      } catch (error) {
        /* istanbul ignore next */
        if (error.name == "ConditionalCheckFailedException") {
          console.log(
            "conditional update exception detail: ",
            JSON.stringify(error)
          );
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
