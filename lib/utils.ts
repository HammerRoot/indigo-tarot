import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// 牌阵 grid 列数字面量映射（规格 O1）
// Tailwind 通过扫描源码中的字面量类名生成样式，动态拼接 `grid-cols-${n}`
// 源码中不存在完整类名 → 类不生成。因此必须用字面量映射表。
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  7: "grid-cols-7",
};

/** 按牌数返回 grid 列类名；未知数量回退 grid-cols-1（不抛错） */
export function gridClassFor(count: number): string {
  return GRID_COLS[count] ?? "grid-cols-1";
}
