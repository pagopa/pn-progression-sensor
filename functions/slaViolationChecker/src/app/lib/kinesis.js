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
