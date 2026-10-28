import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const base = process.env.APP_URL ?? "http://127.0.0.1:3010";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function countPages(buffer) {
  return buffer.toString("latin1").match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage();
page.setDefaultTimeout(60000);
const failures = [];

function check(name, ok, detail = "") {
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.log(`${ok ? "ok" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

try {
  await page.evaluateOnNewDocument(() => {
    localStorage.removeItem("resume.draft.v1");
    localStorage.removeItem("resume.fit.v1");
    localStorage.removeItem("resume.history.v1");
  });
  await page.goto(base, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("林知远"));
  check("打开示例简历", true);

  await page.locator("button::-p-text(保存版本)").click();
  await page.locator("button::-p-text(版本记录)").click();
  await page.waitForFunction(() => document.body.innerText.includes("手动保存"));
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.innerText.includes("手动保存"));
    button?.click();
  });
  await page.waitForFunction(() => document.querySelector(".sheet-name")?.textContent === "林知远");
  check("版本记录可以恢复", true);

  await page.evaluate(() => {
    const label = [...document.querySelectorAll("label")].find((node) => node.innerText.startsWith("姓名"));
    const input = label?.querySelector("input");
    if (!input) throw new Error("找不到姓名输入框");
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "测试姓名");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForFunction(() => document.querySelector(".sheet-name")?.textContent === "测试姓名");
  check("编辑姓名后预览同步", true);

  await page.locator("button::-p-text(版本记录)").click();
  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) => node.innerText.includes("手动保存"));
    button?.click();
  });
  await page.waitForFunction(() => document.querySelector(".sheet-name")?.textContent === "林知远");
  check("再次恢复后姓名回到保存时", true);

  const beforeFit = await page.evaluate(() => {
    const frame = document.querySelector(".sheet");
    const inner = document.querySelector(".sheet-inner");
    return {
      frame: frame?.clientHeight ?? 0,
      inner: inner?.scrollHeight ?? 0,
    };
  });
  console.log("fit-before", beforeFit);
  await page.locator("button::-p-text(智能一页)").click();
  await page.waitForSelector("[data-notice]");
  const fitNotice = await page.$eval("[data-notice]", (node) => node.textContent?.trim() ?? "");
  check(
    "智能一页会压缩超页内容",
    beforeFit.inner > beforeFit.frame && fitNotice.startsWith("已通过压缩"),
    `before ${beforeFit.inner}/${beforeFit.frame}; ${fitNotice}`,
  );

  await page.locator("button::-p-text(AI 评分)").click();
  await page.waitForFunction(() => document.body.innerText.includes("DEEPSEEK_API_KEY"));
  check("未配置密钥时评分给出提示", true);

  const pdfResponse = await page.evaluate(async () => {
    const response = await fetch("/api/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resume: JSON.parse(localStorage.getItem("resume.draft.v1") ?? "{}"),
        fit: JSON.parse(localStorage.getItem("resume.fit.v1") ?? "{}"),
      }),
    });
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, bytes: Array.from(bytes), type: response.headers.get("content-type") };
  });
  const pdf = Buffer.from(pdfResponse.bytes);
  if (pdfResponse.status !== 200) {
    console.log(pdf.toString("utf8").slice(0, 800));
  }
  await mkdir("tmp", { recursive: true });
  await writeFile("tmp/resume-check.pdf", pdf);
  const pages = countPages(pdf);
  check("导出 PDF 成功", pdfResponse.status === 200 && pdfResponse.type?.includes("pdf"), `status ${pdfResponse.status}`);
  check("PDF 只有一页", pages === 1, `pages ${pages}, bytes ${pdf.length}`);
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
  console.error(error);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} 项失败`);
  process.exit(1);
}
