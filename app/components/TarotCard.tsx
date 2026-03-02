"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";
import Image from "next/image";
import styles from "./TarotCard.module.less";

interface TarotCardProps {
  card: TarotCardType;
  isRevealed?: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
}

// 卡牌背面组件
const CardBack = () => (
  <div className={styles.cardBack}>
    <div className={styles.cardBackContent}>
      <div className={styles.icon}>🌟</div>
      <div className={styles.text}>TAROT</div>
    </div>
  </div>
);

// 卡牌正面组件
const CardFront = ({ 
  card, 
  isReversed, 
  imageError, 
  setImageError, 
  cardSizes, 
  size, 
  isRevealed 
}: { 
  card: TarotCardType;
  isReversed: boolean;
  imageError: boolean;
  setImageError: (error: boolean) => void;
  cardSizes: Record<string, { width: number; height: number }>;
  size: "sm" | "md" | "lg";
  isRevealed: boolean;
}) => (
    <div className={`${styles.cardFront} ${isReversed ? styles.reversed : ''}`}>
      {!imageError && card.image ? (
        <div className={styles.cardImage}>
          <Image
            src={card.image}
            alt={card.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            priority={isRevealed}
            sizes={`${cardSizes[size].width}px`}
            loading={isRevealed ? "eager" : "lazy"}
          />

          {/* 逆位指示器 - 仅边框效果 */}
          {isReversed && isRevealed && (
            <div className={styles.reversedIndicator}></div>
          )}
        </div>
      ) : (
        // 占位符设计或图片加载失败
        <div className={styles.placeholder}>
          {/* 卡牌标题 */}
          <div className={styles.placeholderHeader}>
            <div className={styles.arcana}>
              {card.arcana === "major" ? "大阿尔卡纳" : "小阿尔卡纳"}
            </div>
            {card.number !== undefined && (
              <div className={styles.number}>
                {card.number}
              </div>
            )}
          </div>

          {/* 中央图标 */}
          <div className={styles.placeholderCenter}>
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
          </div>

          {/* 卡牌名称 */}
          <div className={styles.placeholderFooter}>
            <div className={styles.cardName}>
              {card.name}
            </div>
          </div>

          {/* 逆位指示器 - 仅边框效果 */}
          {isReversed && isRevealed && (
            <div className={styles.reversedIndicator}></div>
          )}
        </div>
      )}
    </div>
);

export const TarotCard = memo(function TarotCard({
  card,
  isRevealed = false,
  isReversed = false,
  onClick,
  size = "md",
  showDetails = false,
}: TarotCardProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: styles.cardSmall,
    md: styles.cardMedium,
    lg: styles.cardLarge,
  };

  const cardSizes = {
    sm: { width: 96, height: 144 },
    md: { width: 128, height: 192 },
    lg: { width: 160, height: 240 },
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} ${styles.cardContainer}`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className={`${styles.cardInner} ${isRevealed ? styles.revealed : ''}`}
        animate={{ rotateY: isRevealed ? 180 : 0 }}
      >
        {/* 背面 */}
        <CardBack />

        {/* 正面 */}
        <CardFront 
            card={card}
            isReversed={isReversed}
            imageError={imageError}
            setImageError={setImageError}
            cardSizes={cardSizes}
            size={size}
            isRevealed={isRevealed}
          />
      </motion.div>

      {/* 卡牌详细信息（可选） */}
      {showDetails && isRevealed && (
        <motion.div
          className={styles.cardDetails}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3>{card.name}</h3>
          <p>
            {isReversed ? card.meaningReversed : card.meaningUpright}
          </p>
          <div className={styles.keywords}>
            <strong>关键词：</strong>
            {(isReversed ? card.keywordsReversed : card.keywordsUpright).join(
              "、",
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
});
