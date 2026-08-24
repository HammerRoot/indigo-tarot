"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";
import { CardFace } from "@/app/components/CardFace";
import { FLIP_DURATION_MS } from "@/lib/drawFlow";

// 平铺网格中的单张牌(规格 G9)
// - 13 列 grid 单元格自适应:根节点 w-full + 2:3 卡牌比例
// - 内部 3D 翻转容器:点击选中后原位 rotateY(180°) 展示牌面
// - 牌背为渐变 + 描边 + 🌟 TAROT 图案;牌面延迟挂载(严格盲选)
// - isHidden:飞入动画期间隐藏原位牌(飞入克隆接管视觉)
interface GridCardProps {
  card: TarotCardType;
  index: number;
  isFlipped: boolean;
  isReversed: boolean;
  isHidden: boolean;
  onClick: (index: number) => void;
  registerRef: (index: number, node: HTMLDivElement | null) => void;
}

export const GridCard = memo(function GridCard({
  card,
  index,
  isFlipped,
  isReversed,
  isHidden,
  onClick,
  registerRef,
}: GridCardProps) {
  return (
    <div
      data-card-back="true"
      data-index={index}
      ref={(node) => registerRef(index, node)}
      onClick={() => onClick(index)}
      className={`relative w-full aspect-[2/3] cursor-pointer select-none transition-opacity duration-300 ${
        isHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label={`牌 ${index + 1}`}
    >
      <div className="absolute inset-0 perspective-1000">
        <motion.div
          className="relative w-full h-full transform-style-3d"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: FLIP_DURATION_MS / 1000, ease: "easeInOut" }}
        >
          {/* 牌背(渐变 + 描边 + 🌟 TAROT 图案) */}
          <div className="absolute inset-0 backface-hidden">
            <div className="w-full h-full bg-gradient-to-br from-purple-800 via-blue-900 to-purple-900 rounded-[3px] md:rounded-md border border-purple-300/80 shadow-sm flex items-center justify-center overflow-hidden">
              <div className="text-center text-white/80">
                <div className="text-lg md:text-2xl mb-1">🌟</div>
                <div className="text-xs font-medium tracking-wider">TAROT</div>
              </div>
            </div>
          </div>
          {/* 牌面(翻转后展示;未翻转时不挂载,保持严格盲选且不预加载图片) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180">
            {isFlipped && <CardFace card={card} reversed={isReversed} />}
          </div>
        </motion.div>
      </div>
    </div>
  );
});