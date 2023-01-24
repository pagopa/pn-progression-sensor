// copied from activityStepManager
const { Buffer } = require("node:buffer");
const { gunzipSync } = require("node:zlib");

function myGunzip(buffer) {
  return gunzipSync(buffer);
}

function decodePayload(b64Str) {
  const payloadBuf = Buffer.from(b64Str, "base64");

  let parsedJson;
  try {
    parsedJson = JSON.parse(payloadBuf.toString("utf8"));
  } catch (err) {
    const uncompressedBuf = myGunzip(payloadBuf);
    parsedJson = JSON.parse(uncompressedBuf.toString("utf8"));
  }

  return parsedJson;
}

// DELETE intead of INSERT ()
function mustProcess(rec) {
  const allowedTables = ["pn-ProgressionSensorData"];
  //console.log("mustProcess, record: ", rec);
  //   {
  //     kinesisSeqNumber: '49637329937448784559035416658086603608349162186672701458',
  //     awsRegion: 'eu-south-1',
  //     eventID: '509b20a7-42f3-47af-b571-bfdb980d68f4',
  //     eventName: 'REMOVE',
  //     userIdentity: null,
  //     recordFormat: 'application/json',
  //     tableName: 'pn-ProgressionSensorData',
  //     dynamodb: {
  //       ApproximateCreationDateTime: 1674576197043,
  //       Keys: [Object],
  //       OldImage: [Object],
  //       SizeBytes: 480
  //     },
  //     eventSource: 'aws:dynamodb'
  //   }
  //
  // Keys: {
  //     id: { S: 'DELETE##01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted' },
  //     entityName_type_relatedEntityId: { S: 'step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1' }
  //   },
  //
  // OldImage: {
  //     startTimestamp: { S: '2023-01-24T15:06:12.470719211Z' },
  //     step_alarmTTL: { N: '1688396772' },
  //     entityName_type_relatedEntityId: { S: 'step##REFINEMENT##YZPN-ZTVQ-UTGU-202301-Y-1' },
  //     alarmTTLYearToMinute: { S: '2023-07-03T15:06' },
  //     alarmTTL: { S: '2023-07-03T15:06:12.470Z' },
  //     relatedEntityId: { S: 'YZPN-ZTVQ-UTGU-202301-Y-1' },
  //     slaExpiration: { S: '2023-07-17T15:06:12.470Z' },
  //     id: { S: 'DELETE##01_REFIN##YZPN-ZTVQ-UTGU-202301-Y-1##accepted' },
  //     type: { S: 'REFINEMENT' }
  //   },
  return allowedTables.indexOf(rec.tableName) > -1 && rec.eventName == "REMOVE";
}

exports.extractKinesisData = function (kinesisEvent) {
  //console.log("kinesis event: ", kinesisEvent);
  if (kinesisEvent == null || kinesisEvent.Records == null) {
    return [];
  }
  return kinesisEvent.Records.map((rec) => {
    const decodedPayload = decodePayload(rec.kinesis.data);
    return {
      kinesisSeqNumber: rec.kinesis.sequenceNumber,
      ...decodedPayload,
    };
  }).filter((rec) => {
    return mustProcess(rec);
  });
};
