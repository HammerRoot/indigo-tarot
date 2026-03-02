"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";
import Image from "next/image";
import styles from "./ResultTarotCard.module.less";

interface ResultTarotCardProps {
  card: TarotCardType;
  index: number;
  isReversed?: boolean;
}

export const ResultTarotCard = memo(function ResultTarotCard({
  card,
  index,
  isReversed = false,
}: ResultTarotCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      className={styles.cardContainer}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.1 }}
    >
      {/* 塔罗牌显示 */}
      <div className={`${styles.card} ${isReversed ? styles.reversed : ''}`}>
        {!imageError && card.image ? (
          <div className={styles.cardImage}>
            <Image
              src={card.image}
              alt={card.name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              sizes="160px"
              loading="eager"
              priority={index === 0}
            />

            {/* 逆位指示器 - 仅边框效果 */}
            {isReversed && (
              <div className={styles.reversedIndicator}></div>
            )}

            {/* 悬停时显示卡片名称 */}
            <div className={`${styles.hoverOverlay} ${isReversed ? styles.reversed : ''}`}>
              <div className={styles.overlayGradient}>
                <div className={styles.overlayText}>
                  <h3>
                    {card.name}
                  </h3>
                  <p>
                    {(isReversed ? card.keywordsReversed : card.keywordsUpright)
                      .slice(0, 2)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 占位符设计
          <div className={styles.placeholder}>
            <div className={styles.placeholderIcon}>
              <span>
                {card.arcana === "major"
                  ? "✨"
                  : card.suit === "wands"
                    ? "🔥"
                    : card.suit === "cups"
                      ? "💧"
                      : card.suit === "swords"
                        ? "⚔️"
                        : card.suit === "pentacles"
                          ? "💰"
                          : "🌟"}
              </span>
            </div>
            <h3 className={styles.placeholderTitle}>
              {card.name}
            </h3>
            <p className={styles.placeholderKeywords}>
              {(isReversed ? card.keywordsReversed : card.keywordsUpright)
                .slice(0, 2)
                .join(" · ")}
            </p>

            {/* 逆位指示器 - 仅边框效果 */}
            {isReversed && (
              <div className={styles.reversedIndicator}></div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
