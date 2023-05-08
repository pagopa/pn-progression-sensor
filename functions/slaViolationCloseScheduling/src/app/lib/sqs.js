const { SQSClient, SendMessageBatchCommand } = require("@aws-sdk/client-sqs");
const crypto = require("crypto");

const client = new SQSClient({ region: process.env.REGION });

exports.addActiveSLAToQueue = async (violations) => {
  const response = {
    receivedViolations: 0,
    correctlySentViolations: 0,
    problemsSendingViolations: 0,
    skippedViolations: 0,
  };

  if (violations == null || !Array.isArray(violations)) {
    return response;
  }

  response.receivedViolations = violations.length;
  let allEntries = [];

  for (const singleViolation of violations) {
    if (
      singleViolation.entityName_type_relatedEntityId === undefined ||
      singleViolation.id === undefined
    ) {
      response.skippedViolations++;
      continue; // we skip this violation
    }
    let body = "";
    try {
      body = JSON.stringify(singleViolation);
    } catch (error) {
      /* istanbul ignore next */
      response.skippedViolations++;
      /* istanbul ignore next */
      continue;
    }
    if (
      typeof process.env.SEARCH_SLA_VIOLATIONS_QUEUE_URL === "undefined" ||
      process.env.SEARCH_SLA_VIOLATIONS_QUEUE_URL.length < 1
    ) {
      /* istanbul ignore next */
      throw "missing SQS Queue URL";
    }

    const entry = {
      MessageBody: body,
      Id: crypto.randomUUID(),
      // only the primary key
      MessageAttributes: {
        entityName_type_relatedEntityId: {
          DataType: "String",
          StringValue: singleViolation.entityName_type_relatedEntityId,
        },
        id: {
          DataType: "String",
          StringValue: singleViolation.id,
        },
      },
    };
    allEntries.push(entry);
  } // for end

  for (let i = 0; i < allEntries.length; i += 10) {
    const batchEntries = allEntries.slice(i, i + 10);
    const params = {
      Entries: batchEntries,
      QueueUrl: process.env.SEARCH_SLA_VIOLATIONS_QUEUE_URL,
    };

    //console.log("send message params: ", params);
    const command = new SendMessageBatchCommand(params);

    try {
      const data = await client.send(command);
      if (data && data.Successful) {
        response.correctlySentViolations += data.Successful.length;
      } else {
        response.problemsSendingViolations += batchEntries.length;
      }
    } catch (error) {
      /* istanbul ignore next */
      response.problemsSendingViolations += batchEntries.length;
      /* istanbul ignore next */
      console.error("error sending violations to queue: ", error);
    }
  } // for end
  return response;
};
