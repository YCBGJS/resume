import type { PolishScope } from "@/lib/polish";
import type { Resume } from "@/lib/types";

const FACT_RULE =
  "不得新增原文没有的数字、公司、学校、项目名称或时间。可以删除空话和重复要点。已有数字必须原样保留，例如 50k 不能写成 50，1.5万不能写成 1.5。";

export function scoreMessages(resume: Resume) {
  return {
    system: `你是中文简历审阅人。只根据给定简历打分，不要编造经历。${FACT_RULE}
返回 JSON，不要写解释：
{"overall":0到100的整数,"grade":"A+|A|B|C|D|F","dimensions":[{"name":"完整度","score":0到100,"comment":"一句话"},{"name":"成果量化","score":0到100,"comment":"一句话"},{"name":"表达","score":0到100,"comment":"一句话"},{"name":"关键词","score":0到100,"comment":"一句话"},{"name":"一页可读性","score":0到100,"comment":"一句话"}],"strengths":["最多3条优势"],"suggestions":[{"before":"原文片段","after":"改写示例","reason":"原因"}]}
改写示例同样不得引入新事实。`,
    user: JSON.stringify(resume),
  };
}

export function polishMessages(resume: Resume, scope: PolishScope, instruction: string) {
  const shape =
    scope.type === "summary"
      ? '{"summary":"改写后的个人总结"}'
      : scope.type === "all"
        ? '{"resume":与输入相同结构的完整简历}'
        : '{"highlights":["改写后的要点"]}';
  return {
    system: `你是中文简历编辑。只润色表述，让句子更具体、更容易扫读。${FACT_RULE}
只返回 JSON：${shape}`,
    user: JSON.stringify({ scope, instruction, resume }),
  };
}

export function translateMessages(resume: Resume, issues?: { detail: string }[]) {
  const problems = issues?.length
    ? `上次译文没有通过校验，请按这些问题重译，不要保留有问题的写法：\n${issues.map((issue) => `- ${issue.detail}`).join("\n")}\n\n`
    : "";
  return {
    system: `你是英文简历译者。把给定中文简历译成可以直接投递的英文简历。只返回 JSON，不要写解释。
规则：
- 返回 {"resume":与输入相同结构的完整简历}。
- 保持 id、数组顺序和条数不变。
- 邮箱、电话、链接 URL、起止时间、公司、学校、项目名必须与原文逐字相同。
- 翻译职位、职称、个人总结、要点、学历、学历说明、技能组名、技能内容、城市和链接文字。
- 姓名按原文返回，不要翻译。
- 要点以过去式动词开头，不用 I、my、we。
- 不新增原文没有的公司、学校、项目、时间或数字。React、Kubernetes 这类技术名词保持英文。
- 数字必须保持量级。50k 不能写成 50。1.5万 写成 15,000。1亿 写成 100,000,000。`,
    user: `${problems}${JSON.stringify(resume)}`,
  };
}

export function condenseMessages(resume: Resume, aggressive: boolean) {
  return {
    system: `你是中文简历编辑。这份简历需要放进一页 A4。请缩短文字：删掉空话，合并重复，减少要点条数。${FACT_RULE}
${aggressive ? "这一轮要比原文明显更短，每条要点尽量不超过 40 个字。" : "优先缩短个人总结和最长的要点。"}
返回 JSON：{"resume":与输入相同结构的完整简历}`,
    user: JSON.stringify(resume),
  };
}
