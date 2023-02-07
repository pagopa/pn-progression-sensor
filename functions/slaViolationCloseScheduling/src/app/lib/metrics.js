const {
  CloudWatchClient,
  PutMetricDataCommand,
} = require("@aws-sdk/client-cloudwatch");
const { isValidType } = require("./utils");

const namespace = "OER";
const metricName = "pn-activeSLAViolations";

const client = new CloudWatchClient({ region: process.env.REGION });

exports.putMetricDataForType = async (value, type) => {
  if (!isValidType(type)) {
    console.error("wrong type passed: ", type);
    return false;
  }
  if (typeof value !== "number" || value < 1) {
    console.error("wrong metric input value: ", value);
    return false;
  }

  const input = {
    MetricData: [
      {
        MetricName: metricName,
        Dimensions: [
          {
            Name: type,
            Value: value,
          },
        ],
        //Unit: "None",
        Value: value,
      },
    ],
    Namespace: namespace,
  };
  const command = new PutMetricDataCommand(input);

  try {
    await client.send(command);
    return true;
  } catch (error) {
    /* istanbul ignore next */
    console.error("problem publishing metric, for input: ", input);
    /* istanbul ignore next */
    return false;
  }
};
