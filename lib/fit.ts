import type { FitState } from "./types";

export const FIT_BASE: FitState = {
  sectionGap: 16,
  lineHeight: 1.45,
  marginMm: 14,
  fontSize: 11,
};

export const READABLE_FLOOR = {
  sectionGap: 4,
  lineHeight: 1.15,
  marginMm: 8,
  fontSize: 9.5,
} as const;

export const EMERGENCY_FONT = 8.8;

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function nextFitStep(state: FitState, allowEmergency: boolean): FitState | null {
  if (state.sectionGap > READABLE_FLOOR.sectionGap) {
    return {
      ...state,
      sectionGap: Math.max(READABLE_FLOOR.sectionGap, state.sectionGap - 4),
    };
  }
  if (state.lineHeight > READABLE_FLOOR.lineHeight + 0.001) {
    return {
      ...state,
      lineHeight: Math.max(READABLE_FLOOR.lineHeight, roundTo(state.lineHeight - 0.1, 2)),
    };
  }
  if (state.marginMm > READABLE_FLOOR.marginMm) {
    return {
      ...state,
      marginMm: Math.max(READABLE_FLOOR.marginMm, state.marginMm - 2),
    };
  }
  if (state.fontSize > READABLE_FLOOR.fontSize + 0.01) {
    return {
      ...state,
      fontSize: Math.max(READABLE_FLOOR.fontSize, roundTo(state.fontSize - 0.5, 1)),
    };
  }
  if (allowEmergency && state.fontSize > EMERGENCY_FONT + 0.01) {
    return { ...state, fontSize: EMERGENCY_FONT };
  }
  return null;
}

export function fitLadder(start: FitState, allowEmergency: boolean): FitState[] {
  const steps = [start];
  let cursor = start;
  for (let index = 0; index < 40; index += 1) {
    const next = nextFitStep(cursor, allowEmergency);
    if (!next) break;
    steps.push(next);
    cursor = next;
  }
  return steps;
}

export function contentFits(frameHeight: number, contentHeight: number) {
  return contentHeight <= frameHeight + 1;
}
