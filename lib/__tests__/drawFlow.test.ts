import { describe, expect, it } from "vitest";
import {
  buildPositionMeanings,
  extractQuestionTheme,
} from "@/lib/drawFlow";

describe("G8 extractQuestionTheme", () => {
  it("去除标点与疑问语气词,提取简短主题", () => {
    expect(extractQuestionTheme("猫咪想说什么？")).toBe("猫咪想说");
    expect(extractQuestionTheme("请问我的事业前景如何？")).toBe("我的事业前景");
    expect(extractQuestionTheme("我想问今年运势怎么样呢")).toBe("今年运势");
  });

  it("空串或纯符号回退为「你」", () => {
    expect(extractQuestionTheme("")).toBe("你");
    expect(extractQuestionTheme("？？？")).toBe("你");
  });

  it("超长问题截断(含省略号,总长 ≤ 13)", () => {
    const theme = extractQuestionTheme("这是一个非常非常非常非常非常非常非常非常非常非常长的问题吗");
    expect(theme.length).toBeLessThanOrEqual(13);
    expect(theme.endsWith("…")).toBe(true);
  });
});

describe("G8 buildPositionMeanings", () => {
  it("结合问题动态生成三牌阵含义(含诗意模板)", () => {
    const meanings = buildPositionMeanings("猫咪想说什么", ["过去", "现在", "未来"]);
    expect(meanings).toHaveLength(3);
    expect(meanings[0]).toContain("猫咪想说");
    expect(meanings[0]).toContain("起点");
    expect(meanings[1]).toContain("核心");
    expect(meanings[2]).toContain("方向");
  });

  it("单张牌阵给出核心指引", () => {
    const meanings = buildPositionMeanings("我今天运势如何", ["核心指引"]);
    expect(meanings).toHaveLength(1);
    expect(meanings[0]).toContain("核心指引");
    expect(meanings[0]).toContain("我今天运势");
  });

  it("超出模板数量的牌位回退为「主题 · 位置名」", () => {
    const positions = Array.from({ length: 10 }, (_, i) => `位${i}`);
    const meanings = buildPositionMeanings("问题", positions);
    expect(meanings).toHaveLength(10);
    expect(meanings[9]).toContain("位9");
  });
});