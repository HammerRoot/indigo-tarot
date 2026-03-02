"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemoizedFn } from "ahooks";
import { useTarotStore } from "@/lib/store";
import { generateTarotReadingStream } from "@/lib/deepseek";
import { ResultTarotCard } from "@/app/components/ResultTarotCard";
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer";
import { imageCache } from "@/lib/imageCache";
import { MysticalBg, MysticalCard, MysticalButton } from "@/app/components/ui";
import styles from "./page.module.less";

export default function ResultPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    drawnCards,
    cardReversals,
    apiKey,
    resetSession,
    setApiUsage,
  } = useTarotStore();

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [coreAdvice, setCoreAdvice] = useState("");
  const [analysisContent, setAnalysisContent] = useState("");
  const [showCards, setShowCards] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(-1);

  // 使用 useRef 防止重复调用
  const hasStartedAnalysis = useRef(false);

  const startAnalysis = useMemoizedFn(() => {
    // 防止重复调用
    if (hasStartedAnalysis.current) return;
    hasStartedAnalysis.current = true;

    setShowAnalysis(true);
    setIsStreaming(true);

    generateTarotReadingStream(
      question!,
      drawnCards,
      {
        onContent: (content) => {
          setStreamingContent((prev) => {
            const newContent = prev + content;

            // 提取核心建议（💡 符号后的内容）
            const adviceMatch = newContent.match(
              /## 💡 核心建议\s*\n\n([^\n]+)/,
            );
            if (adviceMatch) {
              setCoreAdvice(adviceMatch[1]);
            }

            // 提取分析内容（🔮 符号后到 💡 符号前的内容）
            const analysisMatch = newContent.match(
              /## 🔮 深度解析过程([\s\S]*?)(?=## 💡|$)/,
            );
            if (analysisMatch) {
              setAnalysisContent(analysisMatch[1]);
            }

            // 检测当前解析的牌面并自动滚动
            const cardMatches = newContent.match(/### 牌面 (\d+)/g);
            if (cardMatches) {
              const latestCardMatch = cardMatches[cardMatches.length - 1];
              const cardNumber = parseInt(
                latestCardMatch.match(/\d+/)?.[0] || "0",
                10,
              );
              if (cardNumber > 0 && cardNumber <= drawnCards.length) {
                const newIndex = cardNumber - 1;
                if (newIndex !== currentCardIndex) {
                  setCurrentCardIndex(newIndex);
                  // 滚动到对应的牌面位置
                  setTimeout(() => {
                    const cardElement = document.getElementById(
                      `card-${newIndex}`,
                    );
                    if (cardElement) {
                      cardElement.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                        inline: "center",
                      });
                    }
                  }, 500);
                }
              }
            }

            return newContent;
          });
        },
        onComplete: () => {
          setIsStreaming(false);
          setStreamComplete(true);
        },
        onError: (error) => {
          setIsStreaming(false);
          console.error("Stream error:", error);
          setStreamingContent("解析过程中遇到错误，请稍后重试。");
        },
        onMeta: (meta) => {
          setApiUsage(meta.remainingCalls, meta.usingSystemKey);
        },
      },
      apiKey || undefined,
      cardReversals,
    );
  });

  const handleStartNew = () => {
    resetSession();
    router.push("/");
  };

  const handleShare = async () => {
    const shareText = `我的塔罗占卜结果\n\n问题：${question}\n\n${coreAdvice || "正在解析中..."}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "我的塔罗占卜结果",
          text: shareText,
          url: window.location.origin,
        });
      } catch (error) {
        console.log("分享失败:", error);
      }
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert("结果已复制到剪贴板");
      });
    }
  };

  // 检查必要数据并开始解析
  useEffect(() => {
    if (
      !question ||
      !recommendedSpread ||
      !drawnCards.length ||
      !cardReversals.length
    ) {
      router.push("/");
      return;
    }

    // 预加载图片
    const imageUrls = drawnCards.map((card) => card.image).filter(Boolean);

    imageCache.preloadBatch(imageUrls).catch(console.warn);

    // 立即显示卡牌，并立即分析
    setShowCards(true);
    if (!hasStartedAnalysis.current) {
      startAnalysis();
    }
  }, [
    question,
    recommendedSpread,
    drawnCards,
    cardReversals,
    router,
    startAnalysis,
  ]);

  if (!question || !recommendedSpread || !drawnCards.length) {
    return (
      <MysticalBg className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p className={styles.text}>正在加载结果...</p>
        </div>
      </MysticalBg>
    );
  }

  return (
    <MysticalBg className={styles.container}>
      <main className={styles.main}>
        {/* 顶部导航 */}
        <div className={styles.navigation}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <MysticalButton
              onClick={() => router.push("/")}
              className={styles.navButton}
            >
              <ArrowLeft className="w-5 h-5" />
            </MysticalButton>
          </motion.div>

          <div className={styles.navButtons}>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MysticalButton
                onClick={handleShare}
                className={styles.navButton}
              >
                <Share2 className="w-5 h-5" />
              </MysticalButton>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <MysticalButton
                onClick={handleStartNew}
                className={styles.navButton}
              >
                <RotateCcw className="w-5 h-5" />
              </MysticalButton>
            </motion.div>
          </div>
        </div>

        <div className={styles.contentContainer}>
          {/* 1. 你的问题 */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={styles.section}
          >
            <MysticalCard className={styles.questionSection}>
              <div className={styles.sectionTitle}>
                <h1>你的问题</h1>
              </div>
              <div className={styles.questionBox}>
                <p>&quot;{question}&quot;</p>
              </div>
            </MysticalCard>
          </motion.section>

          {/* 2. 抽牌结果 */}
          <AnimatePresence>
            {showCards && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className={styles.section}
              >
                <MysticalCard className={styles.cardsSection}>
                  <div className={styles.sectionTitle}>
                    <h2>抽牌结果</h2>
                  </div>
                  <div className={styles.spreadInfo}>
                    <div className={styles.spreadBox}>
                      <h3>{recommendedSpread.name}</h3>
                      <p>{recommendedSpread.description}</p>
                    </div>
                  </div>

                  {/* 牌阵布局 - 使用Grid布局 */}
                  <div className={styles.cardsContainer}>
                    <div
                      className={`${styles.cardsGrid} ${
                        drawnCards.length > 4 ? styles[`cols-${drawnCards.length}`] : ''
                      } ${drawnCards.length > 4 ? styles.multiRow : ''}`}
                    >
                      {drawnCards.map((card, index) => {
                        const isHighlighted = currentCardIndex === index;
                        const isSpecial5 = drawnCards.length === 5 && index === 4;
                        const isSpecial7 = drawnCards.length === 7 && index >= 4;
                        
                        return (
                          <motion.div
                            key={card.id}
                            className={`${styles.cardItem} ${
                              isHighlighted ? styles.highlighted : ''
                            } ${
                              isSpecial5 ? styles.special5 : isSpecial7 ? styles.special7 : ''
                            }`}
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{
                              opacity: 1,
                              scale: isHighlighted ? 1.05 : 1,
                              y: 0,
                            }}
                            transition={{ delay: index * 0.2 }}
                            id={`card-${index}`}
                          >
                            <ResultTarotCard
                              card={card}
                              index={index}
                              isReversed={cardReversals[index] || false}
                            />
                            {/* 牌面标注 */}
                            <div className={styles.cardAnnotation}>
                              <p className={styles.cardName}>
                                {cardReversals[index] && (
                                  <span className={styles.reversed}>(逆)</span>
                                )}
                                {card.name}
                              </p>
                              <p className={styles.cardPosition}>
                                {recommendedSpread.positions[index]}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </MysticalCard>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 3. AI思考过程 */}
          <AnimatePresence>
            {showAnalysis && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className={styles.section}
              >
                <MysticalCard className={styles.analysisSection}>
                  <div className={styles.sectionTitle}>
                    <div>
                      <h2>🤖 AI深度解析</h2>
                      {isStreaming && (
                        <p className={styles.sectionSubtitle}>
                          正在思考分析中...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className={styles.analysisBox}>
                    <div className={styles.analysisContent}>
                      <MarkdownRenderer
                        content={analysisContent || streamingContent}
                        className={styles.analysisContent}
                      />
                      {isStreaming && (
                        <motion.span
                          className={styles.cursor}
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </div>
                  </div>
                </MysticalCard>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 4. 核心建议 */}
          <AnimatePresence>
            {(coreAdvice || streamComplete) && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className={styles.section}
              >
                <MysticalCard className={styles.adviceSection}>
                  <div className={styles.sectionTitle}>
                    <h2>核心建议</h2>
                  </div>
                  <div className={styles.adviceBox}>
                    <p>{coreAdvice || "正在生成核心建议..."}</p>
                  </div>
                </MysticalCard>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 底部操作 */}
          {streamComplete && (
            <motion.div
              className={styles.bottomActions}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className={styles.actionsContainer}>
                <motion.button
                  onClick={() => router.push("/")}
                  className={styles.homeButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  返回首页
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </MysticalBg>
  );
}
