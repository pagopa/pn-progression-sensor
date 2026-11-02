const { ddbDocClient } = require("./ddbClient.js");
const {
  BatchGetCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");

function makeBulkInsertInvoicesCommandFromEvent(event) {
  const params = {
    RequestItems: {
      [process.env.INFORMAL_INVOICING_DYNAMODB_TABLE]: event.payload.map((p) => ({
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
    if (evt.opType == "BULK_INSERT_INVOICES") {
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

exports.getTimelineElements = async function (iun, timelineElementIds) {
  console.log("Getting timeline elements ", iun, timelineElementIds);
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
