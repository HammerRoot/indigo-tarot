"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemoizedFn } from "ahooks";
import { useTarotStore } from "@/lib/store";
import { generateTarotReadingStream } from "@/lib/deepseek";
import { ResultTarotCard } from "@/app/components/ResultTarotCard";
import { imageCache } from "@/lib/imageCache";

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
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300 mx-auto mb-4"></div>
          <p className="text-gray-300">正在加载结果...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-8">
          <motion.button
            onClick={() => router.push("/")}
            className="mystical-button p-3"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="flex gap-3">
            <motion.button
              onClick={handleShare}
              className="mystical-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Share2 className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={handleStartNew}
              className="mystical-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* 1. 问题 */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-gradient-to-r from-purple-600 via-purple-500 to-purple-400 bg-clip-text mb-4">
              你的问题
            </h1>
            <div className="mystical-card p-6 md:p-8">
              <p className="text-gray-700 text-lg md:text-xl leading-relaxed font-medium">
                &quot;{question}&quot;
              </p>
            </div>
          </motion.section>

          {/* 2. 塔罗概览 */}
          <AnimatePresence>
            {showCards && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="mystical-card p-6 md:p-8"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 flex items-center justify-center gap-3">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                    {recommendedSpread.name}
                  </h2>
                  <p className="text-gray-600 text-lg leading-relaxed max-w-3xl mx-auto">
                    {recommendedSpread.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {drawnCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      className="text-center"
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      {/* 卡牌 */}
                      <div className="mb-4 flex justify-center">
                        <ResultTarotCard
                          card={card}
                          position={recommendedSpread.positions[index]}
                          index={index}
                          isReversed={cardReversals[index] || false}
                        />
                      </div>

                      {/* 卡牌信息 */}
                      <div className="bg-white/50 rounded-lg p-4 border border-purple-200">
                        <h3 className="font-bold text-gray-800 mb-2">
                          {card.name}
                          {cardReversals[index] && (
                            <span className="ml-2 text-amber-600 text-sm">
                              (逆位)
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap justify-center gap-1 text-xs">
                          {(cardReversals[index]
                            ? card.keywordsReversed
                            : card.keywordsUpright
                          )
                            .slice(0, 3)
                            .map((keyword, i) => (
                              <span
                                key={i}
                                className={`px-2 py-1 rounded-full ${
                                  cardReversals[index]
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {keyword}
                              </span>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                className="mystical-card p-6 md:p-8"
              >
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white text-lg">🤖</span>
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                      AI深度解析
                    </h2>
                    {isStreaming && (
                      <p className="text-purple-600 text-sm font-medium">
                        正在思考分析中...
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 md:p-8">
                  <div className="prose max-w-none">
                    <div className="text-gray-700 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                      {analysisContent || streamingContent}
                      {isStreaming && (
                        <motion.span
                          className="inline-block w-2 h-5 bg-purple-500 ml-1"
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </div>
                  </div>
                </div>
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
                className="text-center"
              >
                <div className="bg-gradient-to-r from-yellow-100 via-orange-100 to-yellow-100 border-2 border-yellow-300 rounded-xl p-6 md:p-8 shadow-lg">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mr-4">
                      <span className="text-white text-xl">💡</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                      核心建议
                    </h2>
                  </div>

                  <div className="bg-white/70 rounded-lg p-4 md:p-6">
                    <p className="text-gray-800 text-lg md:text-xl font-semibold leading-relaxed">
                      {coreAdvice || "正在生成核心建议..."}
                    </p>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 底部操作 */}
          {streamComplete && (
            <motion.div
              className="text-center pt-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="flex flex-col sm:flex-row justify-center">
                {/* <motion.button
                  onClick={handleStartNew}
                  className="mystical-button px-8 py-4 text-lg font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  再次占卜
                </motion.button> */}

                <motion.button
                  onClick={() => router.push("/")}
                  className="bg-white border-2 border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl px-8 py-4 text-lg font-bold transition-colors"
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
    </div>
  );
}
