import { FIT_BASE } from "./fit";
import { normalizeResume } from "./normalize";
import type { DraftBundle, FitBundle, FitState, HistoryEntry, Resume } from "./types";

const DRAFT_KEY = "resume.draft.v1";
const FIT_KEY = "resume.fit.v1";
const HISTORY_KEY = "resume.history.v1";
const HISTORY_LIMIT = 30;

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isFitState(value: unknown): value is FitState {
  if (!value || typeof value !== "object") return false;
  const fit = value as FitState;
  return (
    typeof fit.sectionGap === "number" &&
    typeof fit.lineHeight === "number" &&
    typeof fit.marginMm === "number" &&
    typeof fit.fontSize === "number"
  );
}

export function resumeFingerprint(resume: Resume) {
  const text = JSON.stringify(resume);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) + hash + text.charCodeAt(index);
    hash |= 0;
  }
  return (hash >>> 0).toString(16);
}

export function parseStoredDraft(raw: unknown): DraftBundle | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if ("zh" in record) {
    const en = record.en == null ? null : normalizeResume(record.en);
    return {
      active: record.active === "en" && en ? "en" : "zh",
      zh: normalizeResume(record.zh),
      en,
      enBasedOn: typeof record.enBasedOn === "string" ? record.enBasedOn : null,
    };
  }
  if ("basics" in record) {
    return { active: "zh", zh: normalizeResume(raw), en: null, enBasedOn: null };
  }
  return null;
}

export function parseStoredFit(raw: unknown): FitBundle {
  if (isFitState(raw)) return { zh: raw, en: { ...FIT_BASE } };
  if (raw && typeof raw === "object" && "zh" in raw) {
    const record = raw as { zh?: unknown; en?: unknown };
    return {
      zh: isFitState(record.zh) ? record.zh : { ...FIT_BASE },
      en: isFitState(record.en) ? record.en : { ...FIT_BASE },
    };
  }
  return { zh: { ...FIT_BASE }, en: { ...FIT_BASE } };
}

export function loadDraftBundle(): DraftBundle | null {
  return parseStoredDraft(readJson<unknown>(DRAFT_KEY));
}

export function saveDraftBundle(draft: DraftBundle) {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadFitBundle(): FitBundle {
  return parseStoredFit(readJson<unknown>(FIT_KEY));
}

export function saveFitBundle(fits: FitBundle) {
  window.localStorage.setItem(FIT_KEY, JSON.stringify(fits));
}

export function loadHistory(): HistoryEntry[] {
  const history = readJson<HistoryEntry[]>(HISTORY_KEY);
  return Array.isArray(history) ? history.slice(0, HISTORY_LIMIT) : [];
}

export function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function createHistoryId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hist-${Date.now()}`;
}

export { FIT_BASE };
