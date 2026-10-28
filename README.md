# AI 简历

在浏览器里编辑结构化简历，实时看 A4 预览，并导出一页 PDF。评分、润色和超页精简通过本机的 DeepSeek 接口完成，密钥不会进入前端包。草稿和版本记录只存在当前浏览器的 localStorage。

## 启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

在 `.env.local` 填写：

- `DEEPSEEK_API_KEY`：DeepSeek 密钥
- `DEEPSEEK_MODEL`：默认 `deepseek-chat`
- `DEEPSEEK_BASE_URL`：默认 `https://api.deepseek.com`
- `CHROME_PATH`：可选。导出 PDF 会依次查找本机 Google Chrome、Edge 和 Chromium

改完环境变量后需要重启 `npm run dev`。

## 使用

- 左侧改内容，右侧是同一份 A4 版式。
- 「智能一页」先压缩间距、行高、页边距和字号。仍放不下时，才让模型缩短表述，并先保存一份可恢复的版本。
- 「AI 润色」先给出对照。若出现原文没有的数字、公司、学校、项目或时间，不能采用。
- 「导出 PDF」下载一页、文字可选中的 PDF。macOS 上优先使用黑体（Heiti SC），避免苹方导出后复制顺序错乱。找不到 Chrome 时，会打开浏览器打印对话框。
