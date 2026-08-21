// AI 流式输出解析（规格 O3）
//
// 背景：prompt 要求 AI 输出 `## 🔮 深度解析过程` / `## 💡 核心建议` 标题，
// 但 DeepSeek 实际可能输出 `🔮 **深度解析过程**`（普通段落 + 粗体）。
// 因此标题匹配必须同时支持两种格式（# 前缀 或 **粗体**），否则提取失败
// 会导致解析区显示完整内容、核心建议区出现占位符（用户感知为"重复"）。

export interface StreamParseResult {
  /** 💡 节完整内容（到下一标题或结尾），多行建议不截断 */
  coreAdvice: string | null;
  /** 🔮 节至 💡 节前（不含 💡 节） */
  analysis: string | null;
  /** 最后一个 "### 牌面 N" 的 N-1（0 基）；未出现为 null */
  currentCardIndex: number | null;
}

// 匹配行首：可选 # 前缀（0-3 个，粗体标题无 #）+ emoji + 可选粗体星号 + 小节名
const ANALYSIS_HEADING = /^#{0,3}\s*🔮\s*\*{0,2}深度解析过程\*{0,2}/m;
const ADVICE_HEADING = /^#{0,3}\s*💡\s*\*{0,2}核心建议\*{0,2}/m;
// 下一个任意小节标题（# 标题或 emoji 粗体标题），用于截断 advice
const NEXT_HEADING = /^#{0,3}\s*(?:🔮|💡|✨|📌)\s*\*{0,2}\S+/m;
// 牌面检测（保留原逻辑）
const CARD_HEADING = /### 牌面 (\d+)/g;

/** 标题匹配后的正文起始位置：跳过标题行本身 */
function headingEnd(content: string, match: RegExpMatchArray): number {
  let idx = match.index! + match[0].length;
  while (idx < content.length && content[idx] === "\n") idx++;
  return idx;
}

export function parseStreamContent(content: string): StreamParseResult {
  const analysisHeading = content.match(ANALYSIS_HEADING);
  const adviceHeading = content.match(ADVICE_HEADING);

  let analysis: string | null = null;
  let coreAdvice: string | null = null;

  if (analysisHeading) {
    const start = headingEnd(content, analysisHeading);
    const end = adviceHeading ? adviceHeading.index! : content.length;
    const slice = content.slice(start, end).trim();
    analysis = slice || null;
  }

  if (adviceHeading) {
    const start = headingEnd(content, adviceHeading);
    // 在 advice 正文范围内查找下一个标题（排除标题本身）
    const after = content.slice(start);
    const next = after.match(NEXT_HEADING);
    const end = next ? start + next.index! : content.length;
    const slice = content.slice(start, end).trim();
    coreAdvice = slice || null;
  }

  // 取最后一个 "### 牌面 N"
  let currentCardIndex: number | null = null;
  const cardMatches = content.matchAll(CARD_HEADING);
  for (const m of cardMatches) {
    currentCardIndex = Number(m[1]) - 1;
  }

  return { coreAdvice, analysis, currentCardIndex };
}

/**
 * fallback：analysis 提取失败时使用完整内容，但剥离 💡 节之后的部分，
 * 避免解析区出现"核心建议"（杜绝重复展示）。
 */
export function stripAdviceSection(content: string): string {
  const adviceHeading = content.match(ADVICE_HEADING);
  if (!adviceHeading) return content;
  return content.slice(0, adviceHeading.index!).trim();
}
