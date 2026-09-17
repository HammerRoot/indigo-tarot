"use client";

import { motion } from "framer-motion";
import { CardFace } from "@/app/components/CardFace";
import { SelectionFill } from "@/lib/drawFlow";
import { cn } from "@/lib/utils";

// 牌阵槽位条(规格 G8/G10/G17):情况页与选牌子页共用
// - 未选中:虚线/半透明占位符;聚焦中的空位高亮放大,仅聚焦空位可点击(按顺序依次高亮一个)
// - 选中填充:完整牌面 + 金色发光以区分已选与未选(槽位入场填充)
// - 每个槽位下方:位置名(小字) + 结合问题动态生成的牌位含义
// - compact(规格 G17):选牌子页顶部的常驻进度条。**刻意不渲染含义**——
//   该页头已用大号卡片展示「当前待选位」的含义,此处再渲染一遍会让同一句话出现两次;
//   且 10px 的字号也不是给人读含义的尺寸。
interface SpreadSlotsProps {
  positions: readonly string[];
  meanings: readonly string[];
  fills: readonly (SelectionFill | null)[];
  focusSlot?: number | null;
  onSlotClick?: (index: number) => void;
  compact?: boolean;
}

export function SpreadSlots({
  positions,
  meanings,
  fills,
  focusSlot = null,
  onSlotClick,
  compact = false,
}: SpreadSlotsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-4 md:gap-6",
        compact ? "gap-3 md:gap-4" : "",
      )}
    >
      {positions.map((position, index) => {
        const fill = fills[index] ?? null;
        const isFocused = focusSlot === index && !fill;
        // 仅聚焦的空位可点击(按顺序依次高亮一个空位)
        const clickable = isFocused && !!onSlotClick;
        return (
          <div
            key={index}
            data-slot={index}
            className={cn(
              "flex flex-col items-center transition-all duration-300",
              isFocused ? "scale-110" : "",
            )}
          >
            {/* 槽位区域 */}
            <div
              className={cn(
                "relative rounded-xl flex items-center justify-center transition-all duration-300",
                compact ? "w-16 h-24" : "w-24 h-36",
              )}
            >
              {fill ? (
                <motion.div
                  data-filled-card={index}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative w-full h-full rounded-xl shadow-[0_0_18px_rgba(212,175,55,0.5)] ring-1 ring-yellow-300/80"
                >
                  <CardFace card={fill.card} reversed={fill.reversed} />
                </motion.div>
              ) : (
                <div
                  data-empty-slot={index}
                  role={clickable ? "button" : undefined}
                  onClick={clickable ? () => onSlotClick?.(index) : undefined}
                  className={cn(
                    "w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center bg-white/30",
                    clickable ? "cursor-pointer" : "cursor-default",
                    isFocused
                      ? "border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.35)] animate-pulse"
                      : "border-purple-300",
                  )}
                >
                  <span className={cn("text-purple-300", compact ? "text-lg" : "text-2xl")}>
                    ✦
                  </span>
                </div>
              )}
            </div>
            {/* 位置名 */}
            <div
              className={cn(
                "mt-2 font-semibold text-purple-600",
                compact ? "text-[10px]" : "text-xs",
              )}
            >
              {position}
            </div>
            {/* 动态牌位含义（compact 进度条不渲染，理由见文件头注释） */}
            {!compact && (
              <div className="text-gray-500 text-center leading-snug text-xs max-w-28">
                {meanings[index]}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}