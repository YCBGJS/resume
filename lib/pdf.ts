import { accessSync, constants } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";
import { fitLadder } from "@/lib/fit";
import { renderResumeHtml } from "@/lib/render-resume";
import type { FitState, Resume, ResumeLocale } from "@/lib/types";

const LAUNCH_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"];

let browserPromise: Promise<Browser> | null = null;

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export class ChromeMissingError extends Error {
  constructor() {
    super("没有找到可用的 Chrome。请安装 Google Chrome，或在 .env.local 设置 CHROME_PATH");
    this.name = "ChromeMissingError";
  }
}

async function getBrowser() {
  const executablePath = findChrome();
  if (!executablePath) throw new ChromeMissingError();
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({ executablePath, headless: true, args: LAUNCH_ARGS })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }
  const browser = await browserPromise;
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

export function countPdfPages(pdf: Buffer) {
  const text = pdf.toString("latin1");
  return text.match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

export async function renderPdf(resume: Resume, fit: FitState, locale: ResumeLocale = "zh") {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(renderResumeHtml(resume, fit, locale), { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    const chosen = await page.evaluate(
      (ladder) => {
        const frame = document.querySelector<HTMLElement>(".sheet");
        const inner = document.querySelector<HTMLElement>(".sheet-inner");
        if (!frame || !inner) return null;
        const apply = (step: { sectionGap: number; lineHeight: number; marginMm: number; fontSize: number }) => {
          inner.style.setProperty("--section-gap", `${step.sectionGap}px`);
          inner.style.setProperty("--lh", String(step.lineHeight));
          inner.style.setProperty("--margin", `${step.marginMm}mm`);
          inner.style.setProperty("--fs", `${step.fontSize}px`);
        };
        let matched: (typeof ladder)[number] | null = null;
        for (const step of ladder) {
          apply(step);
          if (inner.scrollHeight <= frame.clientHeight + 1) {
            matched = step;
            break;
          }
        }
        return matched;
      },
      fitLadder(fit, true),
    );

    if (!chosen) {
      throw new Error("内容在最小字号下仍超过一页，请删减条目后再导出");
    }

    await page.evaluate(() => {
      const frame = document.querySelector<HTMLElement>(".sheet");
      if (frame) frame.style.overflow = "hidden";
    });
    const pdf = Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
        preferCSSPageSize: true,
      }),
    );
    const pages = countPdfPages(pdf);
    if (pages !== 1) {
      throw new Error(`导出了 ${pages || "未知"} 页，已中止。请先使用智能一页或删减内容`);
    }
    return { pdf, fit: chosen, pages };
  } finally {
    await page.close();
  }
}
