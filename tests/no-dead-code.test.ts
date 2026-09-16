import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readSource(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf8");
}

// 规格 Y2：死代码清理
// 以下符号/文件均无调用方，删除后不得再出现（含注释与残留引用）。
describe("Y2 死代码清理静态契约", () => {
  it("非流式 callDeepSeek / generateTarotReading 已删除", () => {
    const src = readSource("lib/deepseek.ts");
    expect(src).not.toContain("callDeepSeek");
    expect(src).not.toContain("generateTarotReading(");
    // 流式函数名作为整体保留
    expect(src).toContain("generateTarotReadingStream");
    // DeepSeekResponse（仅非流式使用）已删除
    expect(src).not.toContain("DeepSeekResponse");
  });

  it("/api/deepseek 非流式路由文件已删除", () => {
    expect(existsSync(resolve(root, "app/api/deepseek/route.ts"))).toBe(false);
  });

  it("lib/useImagePreloader.ts 已删除", () => {
    expect(existsSync(resolve(root, "lib/useImagePreloader.ts"))).toBe(false);
  });

  it("store 中 currentReading / setCurrentReading 已删除", () => {
    const src = readSource("lib/store.ts");
    expect(src).not.toContain("currentReading");
    expect(src).not.toContain("setCurrentReading");
  });

  it("全库无死代码符号残留（TS/TSX 源码）", () => {
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          out.push(...walk(full));
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
          out.push(full);
        }
      }
      return out;
    };
    const patterns = [
      /callDeepSeek/,
      /generateTarotReading\(/,
      /useImagePreloader/,
      /currentReading/,
      /pickCardsByIndex/,
      /gridClassFor/,
    ];
    for (const file of [...walk("app"), ...walk("lib")]) {
      const content = readSource(file);
      for (const p of patterns) {
        expect(content, `${file} 不应包含 ${p}`).not.toMatch(p);
      }
    }
  });

  it("lib/pick.ts 已删除（选牌子页改用 pickedIndexesFromSlots）", () => {
    expect(existsSync(resolve(root, "lib/pick.ts"))).toBe(false);
  });

  it("gridClassFor 已删除（G11 起结果页改用 flex 换行，该函数无生产调用方）", () => {
    // O1 为它写过单测，G11 把结果页改成 flex 换行后它就只剩测试引用了——
    // 正是本契约禁止的那种「有测试、没调用方」的伪活代码。
    // 注意：这与 shuffle() 的处置相反（那个是接回生产调用方），依据是它还有用没有。
    expect(readSource("lib/utils.ts")).not.toContain("gridClassFor");
    expect(existsSync(resolve(root, "lib/__tests__/grid.test.ts"))).toBe(false);
  });

  it("变异测试的临时目录 __mutation__ 不得残留（N8 用它验证 Redis 分支测试有效性）", () => {
    // 验证「测试能否抓到 bug」时会在 lib/server/__mutation__/ 放刻意写坏的副本。
    // 那是临时脚手架，绝不能提交——本项目曾因线上 OOM 事故付出过代价，
    // 一个残留的坏 stats.ts 副本会是最恶劣的那种「看起来像正式代码」的陷阱。
    for (const dir of ["lib/server/__mutation__", "lib/__mutation__"]) {
      expect(existsSync(resolve(root, dir)), `${dir} 不应存在`).toBe(false);
    }
  });
});

// 规格 O4 收尾（2026-09-16 文档审查）：
// shuffle() 原本只在已删除的 store.getRandomCards 中调用，此后沦为死代码，
// 而 /api/suggested-questions 仍在用 O4 要消灭的有偏写法。本契约锁定收尾结果。
describe("O4 洗牌契约", () => {
  const walkSources = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        out.push(...walkSources(full));
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
        out.push(full);
      }
    }
    return out;
  };

  it("全库不再使用 sort(() => Math.random() - 0.5) 有偏洗牌", () => {
    const biased = /\.sort\(\s*\(\s*\)\s*=>\s*Math\.random\(\)\s*-\s*0\.5\s*\)/;
    for (const file of [...walkSources("app"), ...walkSources("lib")]) {
      // 去掉注释后再匹配：shuffle.ts 的说明性注释里正当地引用了这个反例
      const code = readSource(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(
        code,
        `${file} 应改用 lib/shuffle.ts，而非比较器不稳定的 sort 洗牌`,
      ).not.toMatch(biased);
    }
  });

  it("lib/shuffle.ts 有生产调用方（防止再次沦为死代码）", () => {
    const callers = walkSources("app").filter((f) =>
      /from\s+['"]@\/lib\/shuffle['"]/.test(readSource(f)),
    );
    expect(
      callers.length,
      "shuffle() 应至少被一个 app/ 下的非测试文件引用",
    ).toBeGreaterThan(0);
  });
});
