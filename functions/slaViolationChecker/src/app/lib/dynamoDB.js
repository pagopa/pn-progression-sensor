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
  const returnSearchArray = [];

  switch (type) {
    case "VALIDATION": {
      // id: 00_VALID##WEUD-XHKG-ZHDN-202301-W-1 -> REQUEST_ACCEPTED.IUN_WEUD-XHKG-ZHDN-202301-W-1,
      // REQUEST_REFUSED.IUN_WEUD-XHKG-ZHDN-202301-W-1 and NOTIFICATION_CANCELLED.IUN_WEUD-XHKG-ZHDN-202301-W-1
      //
      // type VALIDATION:
      // - INSERT in pn-Timelines of a record with category REQUEST_ACCEPTED: VALIDATION activity end
      // - INSERT in pn-Timelines of a record with category REQUEST_REFUSED: VALIDATION activity end
      // - INSERT in pn-Timelines of a record with category NOTIFICATION_CANCELLED: VALIDATION activity end
      const timelineBaseValidation = id.split("##")[1]; // IUN remains
      const timeLineIdAccepted =
        "REQUEST_ACCEPTED" + sepChar + "IUN_" + timelineBaseValidation;
      const timeLineIdRefused =
        "REQUEST_REFUSED" + sepChar + "IUN_" + timelineBaseValidation;
      const timeLineIdCancelled =
        "NOTIFICATION_CANCELLED" + sepChar + "IUN_" + timelineBaseValidation;
      returnSearchArray.push(timeLineIdAccepted);
      returnSearchArray.push(timeLineIdRefused);
      returnSearchArray.push(timeLineIdCancelled);
      break;
    }
    case "REFINEMENT": {
      // id: 01_REFIN##REKD-NZRJ-NWQJ-202302-M-1##0 -> REFINEMENT.IUN_REKD-NZRJ-NWQJ-202302-M-1.RECINDEX_0,
      // NOTIFICATION_VIEWED.IUN_REKD-NZRJ-NWQJ-202302-M-1.RECINDEX_0 and and NOTIFICATION_CANCELLED.IUN_WEUD-XHKG-ZHDN-202301-W-1 (NO RECINDEX)
      //
      // type REFINEMENT:
      // - INSERT in pn-Timelines of a record with category REFINEMENT: DELIVERY activity end for one of the recipients
      // - INSERT in pn-Timelines of a record with category NOTIFICATION_VIEWED: DELIVERY activity end for one of the recipients
      // - INSERT in pn-Timelines of a record with category NOTIFICATION_CANCELLED (no recipients): DELIVERY activity end for one of the recipients
      const timelineBaseRefinement = id
        .replace("01_REFIN##", "IUN_")
        .replace("##", sepChar + "RECINDEX_");
      const timeLineIdRefinement =
        "REFINEMENT" + sepChar + timelineBaseRefinement;
      const timeLineIdNotificationViewed =
        "NOTIFICATION_VIEWED" + sepChar + timelineBaseRefinement;
      const timelineBaseRefinementCancelled =
        "NOTIFICATION_CANCELLED" + sepChar + "IUN_" + id.split("##")[1]; // IUN remains
      returnSearchArray.push(timeLineIdRefinement);
      returnSearchArray.push(timeLineIdNotificationViewed);
      returnSearchArray.push(timelineBaseRefinementCancelled);
      // we will search, for multiple refinement (one for recidx), for the same notification cancelled element in timeline (that doesn't have recidx)
      break;
    }
    case "SEND_PEC": {
      // id: 02_PEC__##SEND_DIGITAL.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0.SOURCE_SPECIAL.REPEAT_false.ATTEMPT_0 -> SEND_DIGITAL_FEEDBACK.IUN_AWMX-HXYK-YDAH-202302-P-1.RECINDEX_0.SOURCE_SPECIAL.REPEAT_false.ATTEMPT_0
      //
      // SEND_PEC:
      // - INSERT in pn-Timelines of a record with category SEND_DIGITAL_FEEDBACK: SEND PEC activity end
      const timeLineIdSendDigitalFeedback = id
        .replace("02_PEC__##", "")
        .replace("SEND_DIGITAL", "SEND_DIGITAL_FEEDBACK");
      returnSearchArray.push(timeLineIdSendDigitalFeedback);

      // PN-8703 - SEND_PEC SLA also closed by NOTIFICATION_VIEWED
      let timeLineIdNotificationViewedSendDigitalFeedback =
        timeLineIdSendDigitalFeedback.replace(
          // we start with "02_..." already removed and "SEND_DIGITAL_FEEDBACK" already replaced
          "SEND_DIGITAL_FEEDBACK",
          "NOTIFICATION_VIEWED"
        );
      // remove everything after RECINDEX_* (included)
      timeLineIdNotificationViewedSendDigitalFeedback =
        timeLineIdNotificationViewedSendDigitalFeedback.replace(
          /(\.RECINDEX_\d+)(\..*)$/,
          "$1"
        );
      returnSearchArray.push(timeLineIdNotificationViewedSendDigitalFeedback);
      break;
    }
    case "SEND_PAPER_AR_890": {
      // id: 03_PAPER##SEND_ANALOG_DOMICILE.IUN_DNQZ-QUQN-202302-W-1.RECINDEX_1.ATTEMPT_1 -> SEND_ANALOG_FEEDBACK.IUN_DNQZ-QUQN-202302-W-1.RECINDEX_1.ATTEMPT_1
      //
      // SEND_PAPER_AR_890
      // - INSERT in pn-Timelines of a record with category SEND_ANALOG_FEEDBACK: SEND PAPER AR activity end
      const timelineIdPaperAR890 = id
        .replace("03_PAPER##", "")
        .replace("SEND_ANALOG_DOMICILE", "SEND_ANALOG_FEEDBACK");
      returnSearchArray.push(timelineIdPaperAR890);
      break;
    }
    /* istanbul ignore next */
    case "SEND_AMR": {
      // id: 04_AMR##XLDW-MQYJ-WUKA-202302-A-1##1 -> SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_1 (we always start with IDX_1, and
      // in the receiving function we eventually search for other IDXs)
      //
      // - INSERT in pn-Timelines of a record with category SEND_SIMPLE_REGISTERED_LETTER_PROGRESS with “registeredLetterCode“ attribute: SEND PAPER ARM activity end
      const timelineBaseAMR = id
        .replace("04_AMR##", "IUN_")
        .replace("##", sepChar + "RECINDEX_");
      const timelineIdPaperAMR =
        "SEND_SIMPLE_REGISTERED_LETTER_PROGRESS" +
        sepChar +
        timelineBaseAMR +
        sepChar +
        "IDX_1";
      returnSearchArray.push(timelineIdPaperAMR);
      break;
    }
    /* istanbul ignore next */
    default:
      break;
  }
  return returnSearchArray;
};

/**
 * checks wheter the activity is ended or it is still running
 * @returns {Promise<string>} returns the ISO timestamp of the ended searched activity, or null if the activity is still running
 */
exports.findActivityEnd = async (iun, id, type) => {
  const tableName = "pn-Timelines";

  const maxIdxsInSendAmrSearch =
    parseInt(process.env.MAX_IDXS_IN_SEND_AMR_SEARCH) || 50;

  // 1. get IUN directly and build timelineElementId from event id
  const params = {
    TableName: tableName,
    Key: {
      iun: iun,
    },
  };

  // instead of performing a query with filter, we can construct the partition and the sort key and perform a GetItem (eventually two)
  const returnArray = this.closingElementIdFromIDAndType(id, type);
  if (returnArray === null || returnArray.length === 0) {
    // event not computed, directly return null
    return null;
  }

  // we need to perform a GetItem for each timelineElementId,
  // stopping when we first found a result, returning it
  for (let timelineElementID of returnArray) {
    params.Key.timelineElementId = timelineElementID;

    const dynamoDB = DynamoDBDocumentClient.from(client);

    try {
      let response = await dynamoDB.send(new GetCommand(params));

      if (response.Item == null) {
        // including undefined
        console.log(
          "Nothing found on GetItem with the sort key: " +
            params.Key.timelineElementId
        );
        // go to the next iteration
      } else {
        // found a result
        console.log(
          "Returned item timelineElementId: " + response.Item.timelineElementId
        );

        // extract and return endTimestamp
        //
        // when SEND_SIMPLE_REGISTERED_LETTER_PROGRESS is be present, we also need to check the presence of the
        // registeredLetterCode attribute (we no longer require that deliveryDetailCode is "CON080"), and only in that case return
        // the timestamp instead of null, only for SEND_AMR type
        if (type === "SEND_AMR") {
          // warning log in case we have registeredLetterCode but not deliveryDetailCode === "CON080"
          if (
            response.Item.details?.registeredLetterCode &&
            response.Item.details.deliveryDetailCode !== "CON080"
          ) {
            console.warn(
              "problem checking SEND_SIMPLE_REGISTERED_LETTER_PROGRESS: registeredLetterCode present but deliveryDetailCode not CON080: " +
                response.Item.details.deliveryDetailCode +
                ", item: " +
                JSON.stringify(response.Item)
            );
          }

          if (
            response.Item.details?.registeredLetterCode && // we're also excluding the empty string
            response.Item.timestamp // we no longer require that response.Item.details.deliveryDetailCode === "CON080"
          ) {
            return response.Item.timestamp;
          } else {
            // we must start a cicle incrementing the index until we find a idx where the registeredLetterCode is present, or until we don't find the element
            // we start from 2, because we already checked idx 1
            let idx = 2;
            let found = false;
            // in this point timelineElementID is something like SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_1:
            // we need to change it to SEND_SIMPLE_REGISTERED_LETTER_PROGRESS.IUN_XLDW-MQYJ-WUKA-202302-A-1.RECINDEX_1.IDX_ and then add the idx variable
            let partialTimelineElementID = timelineElementID.replace(
              "IDX_1",
              "IDX_"
            );
            while (!found && idx <= maxIdxsInSendAmrSearch) {
              // we stop at maxIdxsInSendAmrSearch, to avoid infinite loops
              params.Key.timelineElementId = partialTimelineElementID + idx;
              response = await dynamoDB.send(new GetCommand(params));
              if (response.Item == null) {
                // including undefined
                // we didn't find the element: we stop the search
                found = true;
              } else if (
                response.Item.details?.registeredLetterCode &&
                response.Item.timestamp
              ) {
                // we found the element and the registeredLetterCode is present: we return the timestamp
                return response.Item.timestamp;
              } else {
                // we continue the search
                idx++;
              }
            }
          }
        } else {
          // all other cases
          return response.Item.timestamp || null;
        }
        // we examined all the timelineElementId, but we didn't find any result
        return null;
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
  }

  // if we arrive here, we didn't find any result
  console.log("Nothing found for: " + JSON.stringify(returnArray));
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
