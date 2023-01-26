const { expect } = require("chai");
const { twoNumbersFromIUN, controlLetterFromIUN } = require("../app/lib/utils");

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
});
