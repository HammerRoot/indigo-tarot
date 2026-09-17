"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { CardImage } from "@/app/components/CardImage";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";

interface CardModalProps {
  card: TarotCardType;
  position: string;
  isReversed?: boolean;
  onClose: () => void;
}

// 牌放大模态(规格 G7):点击结果页牌面 → 居中放大展示,标注牌位/牌名/正逆位/关键词
export function CardModal({
  card,
  position,
  isReversed = false,
  onClose,
}: CardModalProps) {
  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const keywords = (isReversed ? card.keywordsReversed : card.keywordsUpright)
    .slice(0, 3)
    .join(" · ");

  return (
    <motion.div
      data-testid="card-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        data-testid="card-modal-content"
        className="relative flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 牌图(放大) */}
        <div
          className={`relative w-64 h-96 md:w-80 md:h-[30rem] rounded-2xl overflow-hidden border-2 shadow-2xl shadow-purple-900/50 ${
            isReversed ? "rotate-180" : ""
          }`}
        >
          {/* 唯一显式传 sizes 的位置：放大需要比缩略图更高的分辨率 */}
          <CardImage card={card} sizes="320px" priority />
          {isReversed && (
            <div className="absolute inset-0 border-4 border-amber-400/70 rounded-2xl z-10" />
          )}
        </div>

        {/* 牌位标注 */}
        <div className="mt-6 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs tracking-widest uppercase mb-3">
            {position}
          </span>
          <h3 className="text-white text-2xl font-bold mb-1">{card.name}</h3>
          <p className="text-white/60 text-sm mb-2">
            {isReversed ? "逆位" : "正位"}
          </p>
          <p className="text-gold/90 text-sm tracking-wide">{keywords}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
