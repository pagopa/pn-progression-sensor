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

  it("should test initTtlSlaTimes with default values", () => {
    const { initTtlSlaTimes } = require("../app/lib/utils");

    const ttlSlaTimes = initTtlSlaTimes();

    expect(ttlSlaTimes.ALARM_TTL_VALIDATION).to.eq(0.5);
    expect(ttlSlaTimes.ALARM_TTL_REFINEMENT).to.eq(110);
    expect(ttlSlaTimes.ALARM_TTL_SEND_PEC).to.eq(2);
    expect(ttlSlaTimes.ALARM_TTL_SEND_PAPER_AR_890).to.eq(100);
    expect(ttlSlaTimes.ALARM_TTL_SEND_AMR).to.eq(2);
    expect(ttlSlaTimes.SLA_EXPIRATION_VALIDATION).to.eq(1);
    expect(ttlSlaTimes.SLA_EXPIRATION_REFINEMENT).to.eq(120);
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_PEC).to.eq(2);
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_PAPER_AR_890).to.eq(100);
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_AMR).to.eq(2);
    expect(ttlSlaTimes.INVOICING_TTL_DAYS).to.eq(365);
  });

  it("should test initTtlSlaTimes with values from env variables", () => {
    // set the environment variables
    process.env.ALARM_TTL_VALIDATION = 1;
    process.env.ALARM_TTL_REFINEMENT = 2;
    process.env.ALARM_TTL_SEND_PEC = 3;
    process.env.ALARM_TTL_SEND_PAPER_AR_890 = 4;
    process.env.ALARM_TTL_SEND_AMR = 5;
    process.env.SLA_EXPIRATION_VALIDATION = 6;
    process.env.SLA_EXPIRATION_REFINEMENT = 7;
    process.env.SLA_EXPIRATION_SEND_PEC = 8;
    process.env.SLA_EXPIRATION_SEND_PAPER_AR_890 = 9;
    process.env.SLA_EXPIRATION_SEND_AMR = 10;
    process.env.INVOICING_TTL_DAYS = 0;

    const { initTtlSlaTimes } = require("../app/lib/utils");

    const ttlSlaTimes = initTtlSlaTimes();

    expect(ttlSlaTimes.ALARM_TTL_VALIDATION).to.eq(1);
    expect(ttlSlaTimes.ALARM_TTL_REFINEMENT).to.eq(2);
    expect(ttlSlaTimes.ALARM_TTL_SEND_PEC).to.eq(3);
    expect(ttlSlaTimes.ALARM_TTL_SEND_PAPER_AR_890).to.eq(4);
    expect(ttlSlaTimes.ALARM_TTL_SEND_AMR).to.eq(5);
    expect(ttlSlaTimes.SLA_EXPIRATION_VALIDATION).to.eq(6);
    expect(ttlSlaTimes.SLA_EXPIRATION_REFINEMENT).to.eq(7);
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_PEC).to.eq(8);
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_PAPER_AR_890).to.eq(9);
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_AMR).to.eq(10);
    expect(ttlSlaTimes.INVOICING_TTL_DAYS).to.eq(0);

    // unset the environment variables
    delete process.env.ALARM_TTL_VALIDATION;
    delete process.env.ALARM_TTL_REFINEMENT;
    delete process.env.ALARM_TTL_SEND_PEC;
    delete process.env.ALARM_TTL_SEND_PAPER_AR_890;
    delete process.env.ALARM_TTL_SEND_AMR;
    delete process.env.SLA_EXPIRATION_VALIDATION;
    delete process.env.SLA_EXPIRATION_REFINEMENT;
    delete process.env.SLA_EXPIRATION_SEND_PEC;
    delete process.env.SLA_EXPIRATION_SEND_PAPER_AR_890;
    delete process.env.SLA_EXPIRATION_SEND_AMR;
    delete process.env.INVOICING_TTL_DAYS;
  });

  it("should get initTtlSlaTimes with NaN with text values from env variables", () => {
    // set the environment variables
    process.env.ALARM_TTL_VALIDATION = "a";
    process.env.ALARM_TTL_REFINEMENT = "b";
    process.env.ALARM_TTL_SEND_PEC = "c";
    process.env.ALARM_TTL_SEND_PAPER_AR_890 = "d";
    process.env.ALARM_TTL_SEND_AMR = "e";
    process.env.SLA_EXPIRATION_VALIDATION = "f";
    process.env.SLA_EXPIRATION_REFINEMENT = "g";
    process.env.SLA_EXPIRATION_SEND_PEC = "h";
    process.env.SLA_EXPIRATION_SEND_PAPER_AR_890 = "i";
    process.env.SLA_EXPIRATION_SEND_AMR = "j";
    process.env.INVOICING_TTL_DAYS = "k";

    const { initTtlSlaTimes } = require("../app/lib/utils");

    const ttlSlaTimes = initTtlSlaTimes();

    expect(ttlSlaTimes.ALARM_TTL_VALIDATION).to.be.NaN;
    expect(ttlSlaTimes.ALARM_TTL_REFINEMENT).to.be.NaN;
    expect(ttlSlaTimes.ALARM_TTL_SEND_PEC).to.be.NaN;
    expect(ttlSlaTimes.ALARM_TTL_SEND_PAPER_AR_890).to.be.NaN;
    expect(ttlSlaTimes.ALARM_TTL_SEND_AMR).to.be.NaN;
    expect(ttlSlaTimes.SLA_EXPIRATION_VALIDATION).to.be.NaN;
    expect(ttlSlaTimes.SLA_EXPIRATION_REFINEMENT).to.be.NaN;
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_PEC).to.be.NaN;
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_PAPER_AR_890).to.be.NaN;
    expect(ttlSlaTimes.SLA_EXPIRATION_SEND_AMR).to.be.NaN;
    expect(ttlSlaTimes.INVOICING_TTL_DAYS).to.be.NaN;

    // unset the environment variables
    delete process.env.ALARM_TTL_VALIDATION;
    delete process.env.ALARM_TTL_REFINEMENT;
    delete process.env.ALARM_TTL_SEND_PEC;
    delete process.env.ALARM_TTL_SEND_PAPER_AR_890;
    delete process.env.ALARM_TTL_SEND_AMR;
    delete process.env.SLA_EXPIRATION_VALIDATION;
    delete process.env.SLA_EXPIRATION_REFINEMENT;
    delete process.env.SLA_EXPIRATION_SEND_PEC;
    delete process.env.SLA_EXPIRATION_SEND_PAPER_AR_890;
    delete process.env.SLA_EXPIRATION_SEND_AMR;
    delete process.env.INVOICING_TTL_DAYS;
  });
});
