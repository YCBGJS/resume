import { describe, expect, it } from "vitest";
import {
  EMERGENCY_FONT,
  FIT_BASE,
  READABLE_FLOOR,
  nextFitStep,
} from "./fit";

describe("nextFitStep", () => {
  it("先只压缩区块间距", () => {
    const next = nextFitStep(FIT_BASE, false);
    expect(next).toEqual({ ...FIT_BASE, sectionGap: FIT_BASE.sectionGap - 4 });
  });

  it("间距到下限后才降行高", () => {
    const atGapFloor = { ...FIT_BASE, sectionGap: READABLE_FLOOR.sectionGap };
    const next = nextFitStep(atGapFloor, false);
    expect(next?.sectionGap).toBe(READABLE_FLOOR.sectionGap);
    expect(next?.lineHeight).toBeCloseTo(FIT_BASE.lineHeight - 0.1);
  });

  it("行高到下限后才降页边距", () => {
    const state = {
      ...FIT_BASE,
      sectionGap: READABLE_FLOOR.sectionGap,
      lineHeight: READABLE_FLOOR.lineHeight,
    };
    const next = nextFitStep(state, false);
    expect(next?.lineHeight).toBe(READABLE_FLOOR.lineHeight);
    expect(next?.marginMm).toBe(FIT_BASE.marginMm - 2);
  });

  it("边距到下限后才降字号，并停在可读下限", () => {
    const state = {
      sectionGap: READABLE_FLOOR.sectionGap,
      lineHeight: READABLE_FLOOR.lineHeight,
      marginMm: READABLE_FLOOR.marginMm,
      fontSize: 10,
    };
    const next = nextFitStep(state, false);
    expect(next?.fontSize).toBe(9.5);
    expect(nextFitStep({ ...state, fontSize: 9.5 }, false)).toBeNull();
  });

  it("允许紧急压缩时把字号降到基准的 80%", () => {
    const floor = {
      sectionGap: READABLE_FLOOR.sectionGap,
      lineHeight: READABLE_FLOOR.lineHeight,
      marginMm: READABLE_FLOOR.marginMm,
      fontSize: READABLE_FLOOR.fontSize,
    };
    expect(nextFitStep(floor, false)).toBeNull();
    expect(nextFitStep(floor, true)?.fontSize).toBe(EMERGENCY_FONT);
    expect(nextFitStep({ ...floor, fontSize: EMERGENCY_FONT }, true)).toBeNull();
  });
});
