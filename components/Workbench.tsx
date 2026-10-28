"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { EditorForm } from "@/components/EditorForm";
import { PreviewBoundary } from "@/components/PreviewBoundary";
import { ResumeSheet } from "@/components/ResumeSheet";
import { FIT_BASE, contentFits, nextFitStep } from "@/lib/fit";
import { scopeLabel, type PolishScope } from "@/lib/polish";
import { sampleResume } from "@/lib/sample";
import {
  createHistoryId,
  loadDraftBundle,
  loadFitBundle,
  loadHistory,
  pushHistory,
  resumeFingerprint,
  saveDraftBundle,
  saveFitBundle,
} from "@/lib/storage";
import type { DraftBundle, FactIssue, FitBundle, FitState, HistoryEntry, Resume, ResumeLocale, ScoreResult } from "@/lib/types";

type PolishResult = {
  resume: Resume;
  issues: FactIssue[];
  before: string[];
  after: string[];
};

type TranslateResult = {
  resume: Resume;
  issues: FactIssue[];
  sourceName: string;
  englishName: string;
  before: string[];
  after: string[];
};

export function Workbench() {
  const [draft, setDraft] = useState<DraftBundle>(
    () => loadDraftBundle() ?? { active: "zh", zh: sampleResume, en: null, enBasedOn: null },
  );
  const [fits, setFits] = useState<FitBundle>(() => loadFitBundle());
  const locale: ResumeLocale = draft.active === "en" && draft.en ? "en" : "zh";
  const resume = locale === "en" && draft.en ? draft.en : draft.zh;
  const fit = fits[locale];
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [overflow, setOverflow] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState("deepseek-chat");
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showPolish, setShowPolish] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [translateResult, setTranslateResult] = useState<TranslateResult | null>(null);
  const frameRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const skipFitReset = useRef(false);
  const [editorWidth, setEditorWidth] = useState<number | null>(loadEditorWidth);

  useEffect(() => {
    fetch("/api/ai/status")
      .then((response) => response.json())
      .then((data: { configured?: boolean; model?: string }) => {
        setConfigured(Boolean(data.configured));
        if (data.model) setModel(data.model);
      })
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    saveDraftBundle(draft);
  }, [draft]);

  useEffect(() => {
    saveFitBundle(fits);
  }, [fits]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const inner = innerRef.current;
    const host = previewHostRef.current;
    const stage = stageRef.current;
    if (!frame || !inner || !host || !stage) return;

    const fitPreview = () => {
      const sheetWidth = frame.offsetWidth;
      const sheetHeight = frame.offsetHeight;
      const hostWidth = host.clientWidth;
      const hostHeight = host.clientHeight;
      if (sheetWidth > 0 && sheetHeight > 0 && hostWidth > 0 && hostHeight > 0) {
        const scale = Math.min(hostWidth / sheetWidth, hostHeight / sheetHeight);
        stage.style.width = `${sheetWidth * scale}px`;
        stage.style.height = `${sheetHeight * scale}px`;
        frame.style.transform = `scale(${scale})`;
        frame.style.transformOrigin = "top left";
      }
      setOverflow(!contentFits(frame.clientHeight, inner.scrollHeight));
    };

    fitPreview();
    const observer = new ResizeObserver(fitPreview);
    observer.observe(host);
    return () => observer.disconnect();
  }, [resume, fit, editorWidth]);

  function setResume(next: Resume) {
    const active = localeRef.current;
    setDraft((prev) => (active === "en" ? { ...prev, en: next } : { ...prev, zh: next }));
  }

  function setFit(next: FitState) {
    const active = localeRef.current;
    setFits((prev) => ({ ...prev, [active]: next }));
  }

  function editResume(next: Resume) {
    if (!skipFitReset.current) setFit(FIT_BASE);
    setResume(next);
  }

  function remember(label: string, snapshot = resume, snapshotFit = fit, snapshotLocale: ResumeLocale = locale) {
    const entry: HistoryEntry = {
      type: "resume",
      id: createHistoryId(),
      at: new Date().toISOString(),
      label,
      locale: snapshotLocale,
      resume: snapshot,
      fit: snapshotFit,
    };
    setHistory(pushHistory(entry));
  }

  async function readError(response: Response) {
    const data = (await response.json().catch(() => ({}))) as { error?: string; fallback?: string };
    return data;
  }

  async function exportPdf() {
    setBusy("pdf");
    setNotice(null);
    try {
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, fit, locale }),
      });
      if (response.status === 503) {
        await printFallback();
        setNotice("本机没有可用的 Chrome，已改用浏览器打印。在打印对话框里选择「存储为 PDF」。");
        return;
      }
      if (!response.ok) {
        const data = await readError(response);
        throw new Error(data.error || "导出失败");
      }
      const fitHeader = response.headers.get("X-Resume-Fit");
      if (fitHeader) {
        skipFitReset.current = true;
        setFit(JSON.parse(decodeURIComponent(fitHeader)) as FitState);
        skipFitReset.current = false;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${resume.basics.name || "resume"}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导出失败");
    } finally {
      setBusy(null);
    }
  }

  async function printFallback() {
    const response = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume, fit, locale }),
    });
    const html = await response.text();
    const iframe = document.createElement("iframe");
    iframe.setAttribute("style", "position:fixed;left:-10000px;width:210mm;height:297mm;");
    document.body.appendChild(iframe);
    iframe.srcdoc = html;
    await new Promise<void>((resolve) => {
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => {
          iframe.remove();
          resolve();
        }, 800);
      };
    });
  }

  function tighten(allowEmergency: boolean) {
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return fit;
    let current = allowEmergency ? fit : FIT_BASE;
    applyFit(inner, current);
    for (let index = 0; index < 40 && !contentFits(frame.clientHeight, inner.scrollHeight); index += 1) {
      const next = nextFitStep(current, allowEmergency);
      if (!next) break;
      current = next;
      applyFit(inner, current);
    }
    return current;
  }

  async function smartFit() {
    setBusy("fit");
    setNotice(null);
    try {
      const frame = frameRef.current;
      const inner = innerRef.current;
      if (!frame || !inner) return;
      let currentResume = resume;
      let currentFit = tighten(false);
      if (contentFits(frame.clientHeight, inner.scrollHeight)) {
        skipFitReset.current = true;
        setFit(currentFit);
        skipFitReset.current = false;
        const unchanged =
          currentFit.sectionGap === FIT_BASE.sectionGap &&
          currentFit.lineHeight === FIT_BASE.lineHeight &&
          currentFit.marginMm === FIT_BASE.marginMm &&
          currentFit.fontSize === FIT_BASE.fontSize;
        setNotice(unchanged ? "当前内容已经可以放进一页。" : "已通过压缩间距和字号放进一页。");
        return;
      }

      remember("智能一页前", currentResume, fit);
      for (let pass = 0; pass < 2; pass += 1) {
        const response = await fetch("/api/ai/condense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: currentResume, aggressive: pass === 1 }),
        });
        const data = (await response.json()) as { resume?: Resume; issues?: FactIssue[]; error?: string };
        if (!response.ok) throw new Error(data.error || "精简失败");
        if (data.issues && data.issues.length > 0) {
          setNotice(`精简结果没有采用：${data.issues.map((issue) => issue.detail).join("；")}`);
          break;
        }
        if (!data.resume) throw new Error("精简结果为空");
        currentResume = data.resume;
        skipFitReset.current = true;
        flushSync(() => {
          setResume(currentResume);
          setFit(FIT_BASE);
        });
        skipFitReset.current = false;
        currentFit = tighten(false);
        if (contentFits(frame.clientHeight, inner.scrollHeight)) {
          skipFitReset.current = true;
          setFit(currentFit);
          skipFitReset.current = false;
          setNotice("已精简表述，并压缩到一页。可在版本记录里回到精简前。");
          return;
        }
      }

      currentFit = tighten(true);
      skipFitReset.current = true;
      setFit(currentFit);
      skipFitReset.current = false;
      const stillOver = !contentFits(frame.clientHeight, inner.scrollHeight);
      setNotice(
        stillOver
          ? "已经缩到最小字号，仍然超过一页。请删掉一些条目。"
          : "已缩到最小字号才放进一页，建议再删掉一些次要内容。",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "智能一页失败");
    } finally {
      setBusy(null);
    }
  }

  async function scoreResume() {
    setBusy("score");
    setNotice(null);
    try {
      const response = await fetch("/api/ai/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const data = (await response.json()) as { score?: ScoreResult; error?: string };
      if (!response.ok || !data.score) throw new Error(data.error || "评分失败");
      setScore(data.score);
      setShowScore(true);
      setHistory(
        pushHistory({
          type: "score",
          id: createHistoryId(),
          at: new Date().toISOString(),
          label: `AI 评分 ${data.score.overall}`,
          locale,
          resume,
          score: data.score,
        }),
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "评分失败");
    } finally {
      setBusy(null);
    }
  }

  function commitEditorWidth(width: number) {
    const rounded = Math.round(width);
    setEditorWidth(rounded);
    window.localStorage.setItem(SPLIT_KEY, String(rounded));
  }

  function startSplitDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    const handle = event.currentTarget;
    const container = handle.parentElement;
    const editor = handle.previousElementSibling;
    if (!container || !(editor instanceof HTMLElement)) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startWidth = editor.getBoundingClientRect().width;

    const move = (nextEvent: PointerEvent) => {
      const width = clampEditorWidth(startWidth + nextEvent.clientX - startX, container.getBoundingClientRect().width);
      container.style.gridTemplateColumns = `${width}px 8px minmax(0, 1fr)`;
      handle.setAttribute("aria-valuenow", String(Math.round(width)));
    };
    const stop = (nextEvent: PointerEvent) => {
      const width = clampEditorWidth(startWidth + nextEvent.clientX - startX, container.getBoundingClientRect().width);
      commitEditorWidth(width);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", stop);
      handle.removeEventListener("pointercancel", stop);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
  }

  function nudgeSplit(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const delta = event.key === "ArrowRight" ? 24 : -24;
    const current = editorWidth ?? event.currentTarget.previousElementSibling?.getBoundingClientRect().width ?? 0;
    commitEditorWidth(clampEditorWidth(current + delta, container.getBoundingClientRect().width));
  }

  function restore(entry: HistoryEntry) {
    if (entry.type !== "resume") {
      setScore(entry.score);
      setShowScore(true);
      setShowVersions(false);
      return;
    }
    const nextLocale: ResumeLocale = entry.locale === "en" ? "en" : "zh";
    skipFitReset.current = true;
    localeRef.current = nextLocale;
    setDraft((prev) =>
      nextLocale === "en" ? { ...prev, active: "en", en: entry.resume } : { ...prev, active: "zh", zh: entry.resume },
    );
    setFits((prev) => ({ ...prev, [nextLocale]: entry.fit }));
    skipFitReset.current = false;
    setShowVersions(false);
    setNotice(`已恢复「${entry.label}」。`);
  }

  const englishStale = Boolean(draft.en && draft.enBasedOn !== resumeFingerprint(draft.zh));

  async function generateEnglish() {
    if (draft.en && !window.confirm("重新生成会在对照确认后替换当前英文版。继续？")) return;
    setBusy("translate");
    setNotice(null);
    try {
      const response = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: draft.zh }),
      });
      const data = (await response.json()) as TranslateResult & { error?: string };
      if (!response.ok || !data.resume) throw new Error(data.error || "翻译失败");
      setTranslateResult(data);
      setShowTranslate(true);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "翻译失败");
    } finally {
      setBusy(null);
    }
  }

  function adoptEnglish(next: Resume) {
    if (draft.en) remember("生成英文版前", draft.en, fits.en, "en");
    else remember("生成英文版前", draft.zh, fits.zh, "zh");
    skipFitReset.current = true;
    localeRef.current = "en";
    setDraft((prev) => ({
      ...prev,
      active: "en",
      en: next,
      enBasedOn: resumeFingerprint(prev.zh),
    }));
    setFits((prev) => ({ ...prev, en: FIT_BASE }));
    skipFitReset.current = false;
    setShowTranslate(false);
    setNotice("已采用英文版。中文原稿还在，可以随时切换。");
  }

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-stone-300 bg-[#f7f4ee] px-4 py-3">
        <div className="mr-auto">
          <strong className="text-base">AI 简历</strong>
          <p className="text-xs text-stone-500">
            {configured === null
              ? "正在检查模型配置"
              : configured
                ? `DeepSeek · ${model}`
                : "未配置 DEEPSEEK_API_KEY"}
          </p>
        </div>
        <div className="flex overflow-hidden rounded border border-stone-300 text-sm">
          <button
            type="button"
            disabled={busy !== null}
            aria-pressed={locale === "zh"}
            className={`px-3 py-1.5 ${locale === "zh" ? "bg-[#1f3a5f] text-white" : "bg-white text-stone-700"}`}
            onClick={() => {
              localeRef.current = "zh";
              setDraft((prev) => ({ ...prev, active: "zh" }));
            }}
          >
            中文
          </button>
          <button
            type="button"
            disabled={busy !== null || !draft.en}
            aria-pressed={locale === "en"}
            className={`px-3 py-1.5 ${locale === "en" ? "bg-[#1f3a5f] text-white" : "bg-white text-stone-700"} disabled:text-stone-400`}
            onClick={() => {
              if (!draft.en) return;
              localeRef.current = "en";
              setDraft((prev) => ({ ...prev, active: "en" }));
            }}
          >
            {englishStale ? "English · 基于较早的中文内容" : "English"}
          </button>
        </div>
        <ToolbarButton disabled={busy !== null} onClick={exportPdf}>
          {busy === "pdf" ? "正在导出" : "导出 PDF"}
        </ToolbarButton>
        <ToolbarButton disabled={busy !== null} onClick={smartFit}>
          {busy === "fit" ? "正在压缩" : "智能一页"}
        </ToolbarButton>
        <ToolbarButton disabled={busy !== null} onClick={generateEnglish}>
          {busy === "translate" ? "正在翻译" : draft.en ? "重新生成" : "生成英文版"}
        </ToolbarButton>
        <ToolbarButton disabled={busy !== null} onClick={scoreResume}>
          {busy === "score" ? "正在评分" : "AI 评分"}
        </ToolbarButton>
        <ToolbarButton disabled={busy !== null} onClick={() => setShowPolish(true)}>
          AI 润色
        </ToolbarButton>
        <ToolbarButton disabled={busy !== null} onClick={() => setShowVersions(true)}>
          版本记录
        </ToolbarButton>
        <ToolbarButton disabled={busy !== null} onClick={() => remember("手动保存")}>
          保存版本
        </ToolbarButton>
      </header>
      {notice ? (
        <div data-notice className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">{notice}</div>
      ) : null}
      <div
        className="grid min-h-0 flex-1"
        style={{ gridTemplateColumns: editorWidth == null ? "1fr 8px 1fr" : `${editorWidth}px 8px minmax(0, 1fr)` }}
      >
        <aside className="min-h-0 min-w-0 overflow-y-auto bg-[#f7f4ee] px-4 py-4">
          <EditorForm resume={resume} onChange={editResume} />
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="调整编辑区和预览宽度"
          aria-valuemin={280}
          aria-valuenow={editorWidth == null ? undefined : Math.round(editorWidth)}
          tabIndex={0}
          className="cursor-col-resize bg-stone-300 hover:bg-[#1f3a5f] focus:bg-[#1f3a5f]"
          onPointerDown={startSplitDrag}
          onKeyDown={nudgeSplit}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#e7e2d8]">
          <div className="flex shrink-0 items-center justify-between px-4 py-2 text-sm text-stone-600">
            <span>A4 预览</span>
            <span data-page-status>{overflow ? "当前超出一页" : "当前可以放进一页"}</span>
          </div>
          <div ref={previewHostRef} className="flex min-h-0 flex-1 items-center justify-center">
            <div ref={stageRef} data-preview-stage className="relative overflow-hidden shadow-lg">
              <div className="absolute top-0 left-0">
                <PreviewBoundary>
                  <ResumeSheet resume={resume} fit={fit} locale={locale} frameRef={frameRef} innerRef={innerRef} />
                </PreviewBoundary>
              </div>
            </div>
          </div>
        </main>
      </div>
      {showScore && score ? <ScorePanel score={score} onClose={() => setShowScore(false)} /> : null}
      {showVersions ? (
        <VersionDrawer history={history} onClose={() => setShowVersions(false)} onRestore={restore} />
      ) : null}
      {showTranslate && translateResult ? (
        <TranslateDialog
          result={translateResult}
          onClose={() => setShowTranslate(false)}
          onAdopt={adoptEnglish}
        />
      ) : null}
      {showPolish ? (
        <PolishDialog
          resume={resume}
          busy={busy === "polish"}
          onClose={() => setShowPolish(false)}
          onAdopt={(next) => {
            remember("采用润色前");
            skipFitReset.current = true;
            setResume(next);
            setFit(FIT_BASE);
            skipFitReset.current = false;
            setShowPolish(false);
            setNotice("已采用润色，并记下采用前的版本。");
          }}
          setBusy={setBusy}
          setNotice={setNotice}
        />
      ) : null}
    </div>
  );
}

const SPLIT_KEY = "resume.split.v2";
const MIN_EDITOR = 280;
const MIN_PREVIEW = 320;

function loadEditorWidth(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SPLIT_KEY);
  const saved = Number(raw);
  if (!raw || !Number.isFinite(saved)) return null;
  return Math.min(Math.max(saved, MIN_EDITOR), 960);
}

function clampEditorWidth(width: number, containerWidth: number) {
  const max = Math.max(MIN_EDITOR, containerWidth - MIN_PREVIEW - 8);
  return Math.min(Math.max(width, MIN_EDITOR), max);
}

function applyFit(inner: HTMLElement, fit: FitState) {
  inner.style.setProperty("--section-gap", `${fit.sectionGap}px`);
  inner.style.setProperty("--lh", String(fit.lineHeight));
  inner.style.setProperty("--margin", `${fit.marginMm}mm`);
  inner.style.setProperty("--fs", `${fit.fontSize}px`);
}

function ToolbarButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded bg-[#1f3a5f] px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:bg-stone-400"
    >
      {children}
    </button>
  );
}

function ScorePanel({ score, onClose }: { score: ScoreResult; onClose: () => void }) {
  return (
    <aside className="fixed top-0 right-0 z-20 flex h-full w-[380px] flex-col border-l border-stone-300 bg-white shadow-xl">
      <PanelHeader title={`评分 ${score.overall} · ${score.grade}`} onClose={onClose} />
      <div className="space-y-4 overflow-y-auto p-4 text-sm">
        {score.dimensions.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between font-medium">
              <span>{item.name}</span>
              <span>{item.score}</span>
            </div>
            <p className="text-stone-600">{item.comment}</p>
          </div>
        ))}
        {score.strengths.length > 0 ? (
          <div>
            <h3 className="font-medium">优势</h3>
            <ul className="list-disc pl-5 text-stone-700">
              {score.strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {score.suggestions.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-medium">改进建议</h3>
            {score.suggestions.map((item) => (
              <div key={`${item.before}-${item.after}`} className="rounded border border-stone-200 p-2">
                <p className="text-stone-500">{item.before}</p>
                <p className="mt-1">{item.after}</p>
                <p className="mt-1 text-xs text-stone-500">{item.reason}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function VersionDrawer({
  history,
  onClose,
  onRestore,
}: {
  history: HistoryEntry[];
  onClose: () => void;
  onRestore: (entry: HistoryEntry) => void;
}) {
  return (
    <aside className="fixed top-0 right-0 z-20 flex h-full w-[380px] flex-col border-l border-stone-300 bg-white shadow-xl">
      <PanelHeader title="版本记录" onClose={onClose} />
      <div className="space-y-2 overflow-y-auto p-4">
        {history.length === 0 ? <p className="text-sm text-stone-500">还没有版本。保存、润色或智能一页后会出现在这里。</p> : null}
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="block w-full rounded border border-stone-200 px-3 py-2 text-left text-sm hover:bg-stone-50"
            onClick={() => onRestore(entry)}
          >
            <span className="font-medium">{entry.label}</span>
            <span className="mt-1 block text-xs text-stone-500">
              {new Date(entry.at).toLocaleString()} · {entry.locale === "en" ? "English" : "中文"} ·{" "}
              {entry.type === "resume" ? "恢复内容" : "查看评分"}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function TranslateDialog({
  result,
  onClose,
  onAdopt,
}: {
  result: TranslateResult;
  onClose: () => void;
  onAdopt: (resume: Resume) => void;
}) {
  const [name, setName] = useState(result.englishName);
  const blocked = result.issues.length > 0;
  const after = result.after.map((line, index) => (index === 0 ? name.trim() || line : line));

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-6">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <PanelHeader title="英文版对照" onClose={onClose} />
        <div className="space-y-3 overflow-y-auto p-4 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">姓名 · {result.sourceName || "未填写"}</span>
            <input
              className="w-full rounded border border-stone-300 px-2 py-1.5"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <CompareColumn title="中文" lines={result.before} />
            <CompareColumn title="English" lines={after} />
          </div>
          {blocked ? (
            <ul className="list-disc pl-5 text-red-700">
              {result.issues.map((issue) => (
                <li key={issue.detail}>{issue.detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-200 px-4 py-3">
          <button type="button" className="px-3 py-1.5 text-sm" onClick={onClose}>
            放弃
          </button>
          <button
            type="button"
            disabled={blocked}
            className="rounded bg-[#1f3a5f] px-3 py-1.5 text-sm text-white disabled:bg-stone-400"
            onClick={() => onAdopt({ ...result.resume, basics: { ...result.resume.basics, name: name.trim() || result.englishName } })}
          >
            采用
          </button>
        </div>
      </div>
    </div>
  );
}

function PolishDialog({
  resume,
  busy,
  onClose,
  onAdopt,
  setBusy,
  setNotice,
}: {
  resume: Resume;
  busy: boolean;
  onClose: () => void;
  onAdopt: (resume: Resume) => void;
  setBusy: (value: string | null) => void;
  setNotice: (value: string | null) => void;
}) {
  const options = polishOptions(resume);
  const [scopeKey, setScopeKey] = useState(options[0]?.key ?? "summary");
  const [instruction, setInstruction] = useState("");
  const [result, setResult] = useState<PolishResult | null>(null);

  async function run() {
    const scope = options.find((item) => item.key === scopeKey)?.scope ?? { type: "summary" as const };
    setBusy("polish");
    setResult(null);
    try {
      const response = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume, scope, instruction }),
      });
      const data = (await response.json()) as PolishResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "润色失败");
      setResult(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "润色失败");
    } finally {
      setBusy(null);
    }
  }

  const blocked = (result?.issues.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/30 p-6">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        <PanelHeader title="AI 润色" onClose={onClose} />
        <div className="space-y-3 overflow-y-auto p-4 text-sm">
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">范围</span>
            <select
              className="w-full rounded border border-stone-300 px-2 py-1.5"
              value={scopeKey}
              onChange={(event) => {
                setScopeKey(event.target.value);
                setResult(null);
              }}
            >
              {options.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-stone-500">补充要求，可留空</span>
            <input
              className="w-full rounded border border-stone-300 px-2 py-1.5"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={busy}
            className="rounded bg-[#1f3a5f] px-3 py-1.5 text-white disabled:bg-stone-400"
            onClick={run}
          >
            {busy ? "正在润色" : "生成对照"}
          </button>
          {result ? (
            <div className="grid gap-3 md:grid-cols-2">
              <CompareColumn title="原文" lines={result.before} />
              <CompareColumn title="润色" lines={result.after} />
            </div>
          ) : null}
          {blocked ? (
            <ul className="list-disc pl-5 text-red-700">
              {result?.issues.map((issue) => (
                <li key={issue.detail}>{issue.detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-stone-200 px-4 py-3">
          <button type="button" className="px-3 py-1.5 text-sm" onClick={onClose}>
            放弃
          </button>
          <button
            type="button"
            disabled={!result || blocked}
            className="rounded bg-[#1f3a5f] px-3 py-1.5 text-sm text-white disabled:bg-stone-400"
            onClick={() => result && onAdopt(result.resume)}
          >
            采用
          </button>
        </div>
      </div>
    </div>
  );
}

function polishOptions(resume: Resume) {
  return [
    { key: "summary", label: scopeLabel(resume, { type: "summary" }), scope: { type: "summary" } as PolishScope },
    ...resume.experience.map((item) => ({
      key: `experience:${item.id}`,
      label: `经历 · ${item.company || "未命名"}`,
      scope: { type: "experience", id: item.id } as PolishScope,
    })),
    ...resume.projects.map((item) => ({
      key: `project:${item.id}`,
      label: `项目 · ${item.name || "未命名"}`,
      scope: { type: "project", id: item.id } as PolishScope,
    })),
    { key: "all", label: "整份简历", scope: { type: "all" } as PolishScope },
  ];
}

function CompareColumn({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded border border-stone-200 p-3">
      <h3 className="mb-2 font-medium">{title}</h3>
      {lines.length === 0 ? <p className="text-stone-400">空</p> : null}
      <ul className="space-y-2">
        {lines.map((line, index) => (
          <li key={`${line}-${index}`}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
      <h2 className="font-medium">{title}</h2>
      <button type="button" onClick={onClose} className="text-sm text-stone-500">
        关闭
      </button>
    </div>
  );
}
