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
    ];
    for (const file of [...walk("app"), ...walk("lib")]) {
      const content = readSource(file);
      for (const p of patterns) {
        expect(content, `${file} 不应包含 ${p}`).not.toMatch(p);
      }
    }
  });
});
