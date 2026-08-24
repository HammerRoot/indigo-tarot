// 抽牌交互模块(规格 G8/G10)纯逻辑与常量
// - 结合占卜问题动态生成牌位含义
// - 选牌进行中的槽位填充类型与辅助函数(情况页与选牌子页共享)
// - 动画时长常量:页面状态机与视觉动画共用同一时长,避免动画回调时序依赖

import type { TarotCard } from "./tarot-data";

// 3D 翻牌动画时长(ms):子页点击选中 → 原位翻转展示牌面 → 自动返回情况页
export const FLIP_DURATION_MS = 700;
// 逆位概率(与 G6 原实现一致:30%)
export const REVERSAL_PROBABILITY = 0.3;

/** 随机生成逆位状态(30% 概率)。抽离为纯模块函数,避免组件内调用 Math.random 触发 Compiler 纯净性规则 */
export function randomReversal(): boolean {
  return Math.random() < REVERSAL_PROBABILITY;
}

// 句末疑问短语:按长度优先循环剥离("猫咪想说什么" → "猫咪想说")
const TRAILING_QUESTION_WORDS = [
  "怎么样",
  "什么",
  "为什么",
  "怎样",
  "怎么",
  "如何",
  "吗",
  "呢",
  "吧",
  "啊",
  "么",
];

function stripTrailingQuestionWords(text: string): string {
  let current = text;
  let changed = true;
  while (changed && current) {
    changed = false;
    for (const word of TRAILING_QUESTION_WORDS) {
      if (current.endsWith(word)) {
        current = current.slice(0, -word.length);
        changed = true;
        break;
      }
    }
  }
  return current;
}

/**
 * 从问题中提取简短主题短语(用于动态牌位含义)。
 * 策略:去标点/疑问语气词,去除常见提问前缀,循环剥离句末疑问短语,超长截断。
 * 例:"猫咪想说什么？" → "猫咪想说"
 */
export function extractQuestionTheme(question: string): string {
  const cleaned = question
    .replace(/[，。！？、；：\"\"''（）()\[\]【】\\s?？!！,.;:]/g, "")
    .replace(/^(请问|我想知道|我想问|帮我看看|帮我|求|想|请)/, "");
  const theme = stripTrailingQuestionWords(cleaned);
  if (!theme) return "你";
  return theme.length > 12 ? `${theme.slice(0, 12)}…` : theme;
}

// 牌位含义诗意模板(按槽位索引),结合主题短语动态生成。
// 例(3 位):「主题」的起点 / 当前最想传达的核心 / 希望我明白后的方向
const POSITION_TEMPLATES: ReadonlyArray<(theme: string) => string> = [
  (t) => `「${t}」的起点`,
  () => "当前最想传达的核心",
  () => "希望我明白后的方向",
  (t) => `「${t}」背后的影响`,
  (t) => `「${t}」前行的指引`,
  () => "内心深处的力量",
  (t) => `「${t}」最终的建议`,
];

/**
 * 结合占卜问题动态生成每个牌位的含义文案。
 * - 单张牌阵:直接给出核心指引;
 * - 超出模板数量的牌位:回退为「主题 · 位置名」。
 */
export function buildPositionMeanings(
  question: string,
  positions: readonly string[],
): string[] {
  const theme = extractQuestionTheme(question);
  if (positions.length === 1) {
    return [`关于「${theme}」的核心指引`];
  }
  return positions.map((position, index) =>
    POSITION_TEMPLATES[index]
      ? POSITION_TEMPLATES[index](theme)
      : `「${theme}」· ${position}`,
  );
}

/** 选牌进行中某一槽位的填充记录(情况页与选牌子页共享) */
export interface SelectionFill {
  cardIndex: number;
  card: TarotCard;
  reversed: boolean;
}

/** 第一个未填充的槽位索引(按顺序依次高亮;全部填满返回 null) */
export function firstEmptySlot(
  slots: readonly (SelectionFill | null)[],
): number | null {
  for (let i = 0; i < slots.length; i += 1) {
    if (!slots[i]) return i;
  }
  return null;
}

/** 已选牌的牌组索引(供选牌子页减去已选牌) */
export function pickedIndexesFromSlots(
  slots: readonly (SelectionFill | null)[],
): number[] {
  const indexes: number[] = [];
  for (const s of slots) {
    if (s) indexes.push(s.cardIndex);
  }
  return indexes;
}