const { expect } = require("chai");
const {
  twoNumbersFromIUN,
  controlLetterFromIUN,
  parseKinesisObjToJsonObj,
} = require("../app/lib/utils");

describe("test utils functions", () => {
  it("should get the correct controlLetterFromIUN", () => {
    let iun = "YLPM-JPQG-RZXZ-202301-Z-1";
    expect(controlLetterFromIUN(iun)).to.eq("Z");

    iun = "PNZT-XLZT-MLHQ-202301-X-1";
    expect(controlLetterFromIUN(iun)).to.eq("X");

    iun = "UDRA-TLXG-ZQRT-202301-E-1";
    expect(controlLetterFromIUN(iun)).to.eq("E");

    iun = "NQUJ-DXGQ-VEDK-202301-V-1";
    expect(controlLetterFromIUN(iun)).to.eq("V");

    iun = "WHGA-VMRH-QXUW-202301-A-1";
    expect(controlLetterFromIUN(iun)).to.eq("A");

    iun = "RPZN-MUTR-TMLZ-202301-H-1";
    expect(controlLetterFromIUN(iun)).to.eq("H");
  });

  it("should get the correct twoNumbersFromIUN", () => {
    let iun = "YLPM-JPQG-RZXZ-202301-Z-1";
    expect(twoNumbersFromIUN(iun)).to.eq("03");

    iun = "PNZT-XLZT-MLHQ-202301-X-1";
    expect(twoNumbersFromIUN(iun)).to.eq("01");

    iun = "UDRA-TLXG-ZQRT-202301-E-1";
    expect(twoNumbersFromIUN(iun)).to.eq("04");

    iun = "NQUJ-DXGQ-VEDK-202301-V-1";
    expect(twoNumbersFromIUN(iun)).to.eq("10");

    iun = "WHGA-VMRH-QXUW-202301-A-1";
    expect(twoNumbersFromIUN(iun)).to.eq("00");

    iun = "RPZN-MUTR-TMLZ-202301-H-1";
    expect(twoNumbersFromIUN(iun)).to.eq("07");
  });

  it("should parse kinesis obj", () => {
    const kinesisObj = {
      iun: {
        S: "abcd",
      },
      timelineElementId: {
        S: "notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1",
      },
      notificationSentAt: {
        S: "2023-01-20T14:48:00.000Z",
      },
      timestamp: {
        S: "2023-01-20T14:48:00.000Z",
      },
      paId: {
        S: "026e8c72-7944-4dcd-8668-f596447fec6d",
      },
      details: {
        M: {
          notificationCost: {
            N: 100,
          },
          recIndex: {
            N: 0,
          },
          aarKey: {
            S: "safestorage://PN_AAR-0002-YCUO-BZCH-9MKQ-EGKG",
          },
        },
      },
    };
    const parsedObj = parseKinesisObjToJsonObj(kinesisObj);
    expect(parsedObj).to.eql({
      iun: "abcd",
      timelineElementId:
        "notification_viewed_creation_request;IUN_XLDW-MQYJ-WUKA-202302-A-1;RECINDEX_1",
      notificationSentAt: "2023-01-20T14:48:00.000Z",
      timestamp: "2023-01-20T14:48:00.000Z",
      paId: "026e8c72-7944-4dcd-8668-f596447fec6d",
      details: {
        notificationCost: 100,
        recIndex: 0,
        aarKey: "safestorage://PN_AAR-0002-YCUO-BZCH-9MKQ-EGKG",
      },
    });
  });
});
