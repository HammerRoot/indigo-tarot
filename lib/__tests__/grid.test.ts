import { describe, expect, it } from "vitest";
import { gridClassFor } from "@/lib/utils";

// 规格 O1：结果页动态 grid 类名失效
// Tailwind 扫描源码时看不到 `grid-cols-5` / `grid-cols-7` 字面量 → 类不生成，
// 因此映射表必须包含字面量字符串。
describe("O1 gridClassFor 字面量映射", () => {
  it("已知数量返回字面量类名", () => {
    expect(gridClassFor(1)).toBe("grid-cols-1");
    expect(gridClassFor(3)).toBe("grid-cols-3");
    expect(gridClassFor(4)).toBe("grid-cols-4");
    expect(gridClassFor(5)).toBe("grid-cols-5");
    expect(gridClassFor(7)).toBe("grid-cols-7");
  });

  it("未知数量回退 grid-cols-1", () => {
    expect(gridClassFor(0)).toBe("grid-cols-1");
    expect(gridClassFor(2)).toBe("grid-cols-1");
    expect(gridClassFor(6)).toBe("grid-cols-1");
    expect(gridClassFor(9)).toBe("grid-cols-1");
  });
});
