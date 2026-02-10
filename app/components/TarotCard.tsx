"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";
import Image from "next/image";

interface TarotCardProps {
  card: TarotCardType;
  isRevealed?: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

export function TarotCard({
  card,
  isRevealed = false,
  isReversed = false,
  onClick,
  size = "md",
  showDetails = false,
}: TarotCardProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: "w-24 h-36",
    md: "w-32 h-48",
    lg: "w-40 h-60",
  };

  const cardSizes = {
    sm: { width: 96, height: 144 },
    md: { width: 128, height: 192 },
    lg: { width: 160, height: 240 },
  };

  // 生成卡牌背面
  const CardBack = ({ className }: { className?: string }) => (
    <div
      className={`${className} bg-gradient-to-br from-purple-800 via-blue-900 to-purple-900 rounded-lg border-2 border-purple-300 shadow-lg flex items-center justify-center`}
    >
      <div className="text-center text-white/80">
        <div className="text-2xl mb-2">🌟</div>
        <div className="text-xs font-medium">TAROT</div>
      </div>
    </div>
  );

  // 生成卡牌正面（使用占位符或实际图片）
  const CardFront = ({ className }: { className?: string }) => (
    <div
      className={`${className} bg-gradient-to-b from-amber-50 to-purple-50 rounded-lg border-2 border-purple-300 shadow-lg overflow-hidden relative ${
        isReversed ? "rotate-180" : ""
      }`}
    >
      {!imageError && card.image ? (
        <Image
          src={card.image}
          alt={card.name}
          width={cardSizes[size].width}
          height={cardSizes[size].height}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        // 占位符设计
        <div className="w-full h-full p-2 flex flex-col justify-between">
          {/* 卡牌标题 */}
          <div className="text-center">
            <div className="text-xs font-bold text-purple-800 uppercase">
              {card.arcana === "major" ? "大阿尔卡纳" : "小阿尔卡纳"}
            </div>
            {card.number !== undefined && (
              <div className="text-lg font-bold text-purple-900">
                {card.number}
              </div>
            )}
          </div>

          {/* 中央图标 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">
                {card.arcana === "major" 
                  ? "✨" 
                  : card.suit === "wands" ? "🔥"
                  : card.suit === "cups" ? "💧"
                  : card.suit === "swords" ? "⚔️"
                  : card.suit === "pentacles" ? "💰"
                  : "🌟"
                }
              </span>
            </div>
          </div>

          {/* 卡牌名称 */}
          <div className="text-center">
            <div className="text-xs font-semibold text-purple-900 leading-tight">
              {card.name}
            </div>
          </div>
        </div>
      )}
      
      {/* 逆位指示器 */}
      {isReversed && isRevealed && (
        <div className="absolute top-1 right-1 bg-red-500 text-white text-xs px-1 rounded">
          逆位
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      className={`${sizeClasses[size]} cursor-pointer perspective-1000`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d transition-transform duration-700"
        animate={{ rotateY: isRevealed ? 180 : 0 }}
      >
        {/* 背面 */}
        <div className="absolute inset-0 backface-hidden">
          <CardBack className="w-full h-full" />
        </div>

        {/* 正面 */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <CardFront className="w-full h-full" />
        </div>
      </motion.div>

      {/* 卡牌详细信息（可选） */}
      {showDetails && isRevealed && (
        <motion.div
          className="mt-4 p-3 bg-white rounded-lg shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="font-bold text-purple-900 mb-1">{card.name}</h3>
          <p className="text-sm text-gray-600 mb-2">
            {isReversed ? card.meaningReversed : card.meaningUpright}
          </p>
          <div className="text-xs text-purple-700">
            <strong>关键词：</strong>
            {(isReversed ? card.keywordsReversed : card.keywordsUpright).join("、")}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}