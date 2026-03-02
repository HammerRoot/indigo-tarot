"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useTarotStore, recommendSpread } from "@/lib/store";
import { useRouter } from "next/navigation";
import { TarotCard } from "@/app/components/TarotCard";
import { MysticalBg, MysticalCard, MysticalButton } from "@/app/components/ui";
import styles from "./page.module.less";

export default function DrawPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    drawnCards,
    cardReversals,
    isLoading,
    setRecommendedSpread,
    setDrawnCards,
    setCardReversals,
    getRandomCards,
  } = useTarotStore();

  const [currentStep, setCurrentStep] = useState<"spread" | "draw" | "reveal">(
    "spread",
  );
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [revealedCards, setRevealedCards] = useState<number[]>([]);
  const [showFullScreenLoading, setShowFullScreenLoading] = useState(false);

  // 控制全屏加载时的滚动禁用
  useEffect(() => {
    if (showFullScreenLoading) {
      // 禁用页面滚动
      document.body.style.overflow = "hidden";
    } else {
      // 恢复页面滚动
      document.body.style.overflow = "unset";
    }

    // 清理函数：组件卸载时恢复滚动
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFullScreenLoading]);

  // 如果没有问题，返回首页
  useEffect(() => {
    if (!question) {
      router.push("/");
      return;
    }

    // 推荐牌阵
    if (!recommendedSpread) {
      const spread = recommendSpread(question);
      setRecommendedSpread(spread);
    }
  }, [question, recommendedSpread, setRecommendedSpread, router]);

  // 开始抽牌
  const handleStartDraw = () => {
    setCurrentStep("draw");
  };

  // 选择卡牌
  const handleCardSelect = (index: number) => {
    if (
      selectedCards.includes(index) ||
      !recommendedSpread ||
      selectedCards.length >= recommendedSpread.cardCount
    )
      return;

    const newSelected = [...selectedCards, index];
    setSelectedCards(newSelected);

    // 如果选够了卡牌，立即开始翻牌流程
    if (newSelected.length === recommendedSpread.cardCount) {
      // 立即进行抽牌
      const cards = getRandomCards(recommendedSpread.cardCount);
      // 生成逆位状态（30%概率逆位）
      const reversals = cards.map(() => Math.random() < 0.3);

      setDrawnCards(cards);
      setCardReversals(reversals);

      setCurrentStep("reveal");
    }
  };

  // 翻牌动画
  const handleRevealCard = (index: number) => {
    if (revealedCards.includes(index)) return;

    const newRevealed = [...revealedCards, index];
    setRevealedCards(newRevealed);
  };

  // 点击继续按钮
  const handleContinue = () => {
    if (!recommendedSpread || drawnCards.length === 0) return;

    // 显示短暂的过渡动画
    setShowFullScreenLoading(true);

    // 立即跳转到结果页面，不等待API
    setTimeout(() => {
      setShowFullScreenLoading(false);
      router.push("/result");
    }, 500);
  };

  if (!recommendedSpread) {
    return (
      <MysticalBg className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      </MysticalBg>
    );
  }

  return (
    <MysticalBg className={styles.container}>
      <main className={styles.main}>
        {/* 返回按钮 */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <MysticalButton
            onClick={() => router.push("/")}
            className={styles.backButton}
          >
            <ArrowLeft className="w-5 h-5" />
          </MysticalButton>
        </motion.div>

        <div className={styles.contentContainer}>
          {/* 步骤指示器 */}
          <div className={styles.stepIndicator}>
            <div className={styles.stepList}>
              {["推荐牌阵", "选择卡牌", "揭示结果"].map((step, index) => {
                const steps = ["spread", "draw", "reveal"];
                const isActive = steps[index] === currentStep;
                const isCompleted = steps.indexOf(currentStep) > index;
                const stepState = isActive ? 'active' : isCompleted ? 'completed' : 'inactive';

                return (
                  <div key={step} className={styles.stepItem}>
                    <div className={`${styles.stepCircle} ${styles[stepState]}`}>
                      {index + 1}
                    </div>
                    <span className={`${styles.stepLabel} ${styles[stepState]}`}>
                      {step}
                    </span>
                    {index < 2 && <div className={styles.stepConnector} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 问题显示 */}
          <div className={styles.questionSection}>
            <h1 className={styles.questionTitle}>
              你的问题
            </h1>
            <MysticalCard className={styles.questionCard}>
              <p className={styles.questionText}>
                &quot;{question}&quot;
              </p>
            </MysticalCard>
          </div>

          <AnimatePresence mode="wait">
            {/* 步骤1: 推荐牌阵 */}
            {currentStep === "spread" && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <MysticalCard className={styles.spreadCard}>
                  <div className={styles.spreadIcon}>
                    <Sparkles />
                  </div>
                  <h2 className={styles.spreadTitle}>
                    {recommendedSpread.name}
                  </h2>
                  <p className={styles.spreadDescription}>
                    {recommendedSpread.description}
                  </p>
                  <div className={styles.positionsInfo}>
                    <p className={styles.positionsTitle}>
                      牌位含义：
                    </p>
                    <div className={styles.positionsList}>
                      {recommendedSpread.positions.map((position, index) => (
                        <span key={index} className={styles.positionTag}>
                          {position}
                        </span>
                      ))}
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MysticalButton
                      onClick={handleStartDraw}
                      className={styles.startButton}
                    >
                      开始抽牌
                    </MysticalButton>
                  </motion.div>
                </MysticalCard>
              </motion.div>
            )}

            {/* 步骤2: 选择卡牌 */}
            {currentStep === "draw" && (
              <motion.div
                key="draw"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={styles.drawSection}
              >
                <h2 className={styles.drawTitle}>
                  请选择 {recommendedSpread.cardCount} 张牌
                </h2>
                <MysticalCard className={styles.drawProgress}>
                  <p className={styles.drawProgressText}>
                    已选择: {selectedCards.length} /{" "}
                    {recommendedSpread.cardCount}
                  </p>
                </MysticalCard>

                <div className={styles.cardGrid}>
                  {Array.from({ length: 24 }, (_, index) => (
                    <motion.div
                      key={index}
                      className={styles.cardSlot}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div
                        className={`${styles.cardBack} ${
                          selectedCards.includes(index) ? styles.selected : ''
                        }`}
                        onClick={() => handleCardSelect(index)}
                      >
                        <div className={styles.cardContent}>
                          <div className={styles.icon}>🌟</div>
                          <div className={styles.text}>TAROT</div>
                        </div>
                        {selectedCards.includes(index) && (
                          <motion.div
                            className={styles.selectionBadge}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                          >
                            ✓
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 步骤3: 揭示卡牌 */}
            {currentStep === "reveal" && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={styles.revealSection}
              >
                <h2 className={styles.revealTitle}>
                  点击卡牌揭示结果
                </h2>
                <MysticalCard className={styles.revealProgress}>
                  <p className={styles.revealProgressText}>
                    已揭示: {revealedCards.length} / {drawnCards.length}
                  </p>
                </MysticalCard>

                <div className={styles.revealCards}>
                  {drawnCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      className={styles.revealCardContainer}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      {/* 牌位标签 */}
                      <motion.div
                        className={styles.positionLabel}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2 + 0.1 }}
                      >
                        <span>
                          {recommendedSpread.positions[index]}
                        </span>
                      </motion.div>

                      {/* 塔罗牌组件 */}
                      <TarotCard
                        card={card}
                        size="lg"
                        isRevealed={revealedCards.includes(index)}
                        isReversed={cardReversals[index] || false}
                        showDetails={false}
                        onClick={() => handleRevealCard(index)}
                      />

                      {/* 卡牌提示 */}
                      {revealedCards.includes(index) && (
                        <motion.div
                          className={styles.cardHint}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <p>
                            {(cardReversals[index]
                              ? card.keywordsReversed
                              : card.keywordsUpright
                            )
                              .slice(0, 2)
                              .join("、")}
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* 继续按钮 - 全部卡牌揭示后显示 */}
                {revealedCards.length === drawnCards.length && !isLoading && (
                  <motion.div
                    className={styles.continueSection}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <MysticalButton
                        onClick={handleContinue}
                        className={styles.continueButton}
                      >
                        🔮 获取AI解读
                      </MysticalButton>
                    </motion.div>
                    <p className={styles.continueHint}>
                      点击按钮，让AI为你解读塔罗牌的奥秘
                    </p>
                  </motion.div>
                )}

                {isLoading && (
                  <motion.div
                    className={styles.loadingSection}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className={styles.loadingContent}>
                      <div className={styles.loadingSpinner}></div>
                      <span>
                        🤖 AI正在为你解读...
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 全屏加载效果 */}
      <AnimatePresence>
        {showFullScreenLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.fullScreenLoading}
          >
            <div className={styles.loadingContainer}>
              {/* 主要加载动画 */}
              <motion.div
                className={styles.loadingAnimation}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className={styles.outerSpinner}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className={styles.innerSpinner}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <div className={styles.centerIcon}>
                  <motion.div
                    className={styles.icon}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🔮
                  </motion.div>
                </div>
              </motion.div>

              {/* 加载文本 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className={styles.loadingText}
              >
                <h3 className={styles.loadingTitle}>
                  🚀 即将开始AI解析
                </h3>
                <motion.p
                  className={styles.loadingDescription}
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  准备进入解析页面，实时观看AI思考过程...
                </motion.p>

                {/* 加载点动画 */}
                <div className={styles.loadingDots}>
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      className={styles.loadingDot}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MysticalBg>
  );
}
