import { describe, expect, it } from "vitest";
import { pickCardsByIndex } from "@/lib/pick";
import { tarotCards } from "@/lib/tarot-data";

// 规格 G6:牌桌抽牌 - 按点击索引从真实牌中取牌
describe("G6 pickCardsByIndex", () => {
  it("按索引取牌一一对应", () => {
    const picked = pickCardsByIndex(tarotCards, [0, 1]);
    expect(picked[0].id).toBe(tarotCards[0].id);
    expect(picked[1].id).toBe(tarotCards[1].id);
  });

  it("保持点击顺序", () => {
    const picked = pickCardsByIndex(tarotCards, [5, 2, 10]);
    expect(picked.map((c) => c.id)).toEqual([
      tarotCards[5].id,
      tarotCards[2].id,
      tarotCards[10].id,
    ]);
  });

  it("重复索引去重（不重复取同一张牌）", () => {
    const picked = pickCardsByIndex(tarotCards, [1, 1, 2]);
    expect(picked.length).toBe(2);
    expect(picked.map((c) => c.id)).toEqual([tarotCards[1].id, tarotCards[2].id]);
  });

  it("边界:空数组返回空", () => {
    expect(pickCardsByIndex(tarotCards, [])).toEqual([]);
  });

  it("边界:索引越界被忽略", () => {
    const picked = pickCardsByIndex(tarotCards, [0, 999, -1, 77]);
    // 0 与 77 有效,999/-1 忽略
    expect(picked.map((c) => c.id)).toEqual([tarotCards[0].id, tarotCards[77].id]);
  });

  it("边界:count 超过 78 不会重复", () => {
    const all = pickCardsByIndex(tarotCards, Array.from({ length: 100 }, (_, i) => i % 78));
    expect(all.length).toBe(78);
    expect(new Set(all.map((c) => c.id)).size).toBe(78);
  });
});
