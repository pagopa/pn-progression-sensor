const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

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
    const params = {
      DelaySeconds: 10,
      MessageBody: body,
      QueueUrl: process.env.SEARCH_SLA_VIOLATIONS_QUEUE_URL,
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
    //console.log("send message params: ", params);
    const command = new SendMessageCommand(params);

    try {
      const data = await client.send(command);
      if (data && data.MessageId) {
        response.correctlySentViolations++;
      } else {
        response.problemsSendingViolations++;
      }
    } catch (error) {
      /* istanbul ignore next */
      response.problemsSendingViolations++;
      /* istanbul ignore next */
      console.error("problem sending violations to queue: ", error);
    }
  } // for end

  return response;
};
