"use client";

import { CardImage } from "@/app/components/CardImage";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";

// 塔罗牌牌面(规格 G8):扇形牌正面 / 飞入克隆 / 槽位填充共用
// - 有图用图(WebT tarot 图片),无图回退为牌名占位
// - 逆位时叠加琥珀色描边(与 G6 原实现一致)
export function CardFace({
  card,
  reversed = false,
  className = "",
}: {
  card: TarotCardType;
  reversed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-b from-amber-50 to-purple-50 ${className}`}
    >
      {card.image ? (
        <CardImage card={card} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-purple-800 text-[10px] md:text-xs font-bold text-center p-1 leading-tight">
          {card.name}
        </div>
      )}
      {reversed && (
        <div className="absolute inset-0 rounded-lg border-2 border-amber-400 shadow-lg" />
      )}
    </div>
  );
}