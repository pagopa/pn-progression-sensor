const { expect } = require("chai");
const { extractSQSData } = require("../app/lib/sqs");

describe("test SQS extraction", () => {
  it("should be correctly extracted", () => {
    const eventObject = {
      Records: [
        { messageId: "aaa", body: JSON.stringify({ id: "aaaid" }) },
        { messageId: "bbb", body: JSON.stringify({ id: "bbbid" }) },
      ],
    };

    const extractedData = extractSQSData(eventObject);
    console.log("extracted data: ", extractedData);

    expect(extractedData.length).equal(2);
    expect(extractedData[0].messageId).equal("aaa");
    expect(extractedData[1].messageId).equal("bbb");
    expect(extractedData[0].dynamodb).to.be.not.null;
    expect(extractedData[0].dynamodb).to.be.not.undefined;
    expect(extractedData[1].dynamodb).to.be.not.null;
    expect(extractedData[1].dynamodb).to.be.not.undefined;
  });

  it("should be empty", () => {
    const eventObject = {};

    const extractedData = extractSQSData(eventObject);
    console.log("extracted data: ", extractedData);

    expect(extractedData.length).equal(0);

    const eventObjectNull = null;

    const extractedData2 = extractSQSData(eventObjectNull);
    console.log("extracted data: ", eventObjectNull);

    expect(extractedData2.length).equal(0);
  });
});
