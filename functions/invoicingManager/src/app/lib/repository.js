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
    insertions: 0,
    errors: [],
  };

  for (const evt of events) {
    /* istanbul ignore else */
    if (evt.opType == "BULK_INSERT_INVOICES") {
      console.log("Save elements to invoicing table");
      const params = makeBulkInsertInvoicesCommandFromEvent(evt);
      try {
        const response = await ddbDocClient.send(new BatchWriteCommand(params));
        if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
          throw new Error(`DynamoDB did not process all invoice writes: ${JSON.stringify(response.UnprocessedItems)}`);
        } else {
          summary.insertions++;
        }
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
    if(response.UnprocessedKeys && Object.keys(response.UnprocessedKeys).length > 0) {
      throw new Error("DynamoDB did not process all timeline element keys");
    }

    if (response.Responses) {
      return response.Responses[TABLES.TIMELINES];
    }
    return null;
  } catch (e) {
    console.log("Get Timeline elements error " + iun, e);
    throw e;
  }
};

const TABLES = {
  NOTIFICATIONS: "pn-Notifications",
  TIMELINES: "pn-Timelines",
};

exports.TABLES = TABLES;
