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
    const params = {
      DelaySeconds: 10,
      MessageBody: body,
      QueueUrl: process.env.SEARCH_SLA_VIOLATIONS_QUEUE_URL || "queue",
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
    // {
    //   DelaySeconds: 10,
    //   MessageBody: '{"startTimestamp":"2023-01-27T13:43:06.615351611Z","entityName_type_relatedEntityId":"sla##SEND_AMR##NPKT-QHPH-UJTZ-202301-Y-1","sla_relatedEntityId":"NPKT-QHPH-UJTZ-202301-Y-1","alarmTTL":"2023-01-31T13:43:06.615Z","slaExpiration":"2023-01-31T13:43:06.615Z","id":"04_AMR##NPKT-QHPH-UJTZ-202301-Y-1##0","active_sla_entityName_type":"SEND_AMR","type":"SEND_AMR"}',
    //   QueueUrl: 'https://sqs.eu-south-1.amazonaws.com/558518206506/pn-progression-sensor-queue',
    //   MessageAttributes: {
    //     entityName_type_relatedEntityId: {
    //       DataType: 'String',
    //       StringValue: 'sla##SEND_AMR##NPKT-QHPH-UJTZ-202301-Y-1'
    //     },
    //     id: {
    //       DataType: 'String',
    //       StringValue: '04_AMR##NPKT-QHPH-UJTZ-202301-Y-1##0'
    //     }
    //   }
    // }
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
