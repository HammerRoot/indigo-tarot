"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemoizedFn } from "ahooks";
import { useTarotStore } from "@/lib/store";
import { generateTarotReadingStream } from "@/lib/deepseek";
import { ResultTarotCard } from "@/app/components/ResultTarotCard";
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer";
import { imageCache } from "@/lib/imageCache";
import { parseStreamContent, stripAdviceSection } from "@/lib/stream-parse";

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
  const [showCards, setShowCards] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  // 使用 useRef 防止重复调用
  const hasStartedAnalysis = useRef(false);
  // 记录已滚动到的牌面索引，防止重复触发滚动
  const lastScrolledCardIndex = useRef<number | null>(null);

  // 派生解析结果：流式内容为唯一状态源，解析为纯函数（规格 O3）
  const parsed = useMemo(
    () => parseStreamContent(streamingContent),
    [streamingContent],
  );

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
          // updater 内零副作用，仅拼接累积内容（解析由 useMemo 派生）
          setStreamingContent((prev) => prev + content);
        },
        onComplete: () => {
          setIsStreaming(false);
          setStreamComplete(true);
        },
        onError: (error) => {
          setIsStreaming(false);
          console.error("Stream error:", error);
          setStreamingContent(
            error === "trial_used"
              ? "免费试用已用完。请返回首页，点击右上角 ⚙️ 设置你的 DeepSeek API Key 后继续占卜。"
              : error === "quota_exhausted"
                ? "系统免费额度已达每日上限。请返回首页，点击右上角 ⚙️ 设置你的 DeepSeek API Key 后继续占卜。"
                : "解析过程中遇到错误，请稍后重试。",
          );
        },
        onMeta: (meta) => {
          setApiUsage(meta.remainingCalls, meta.usingSystemKey, meta.trialUsed);
        },
      },
      apiKey || undefined,
      cardReversals,
    );
  });

  // 解析到新牌面时自动滚动到对应位置（防重复，保留 500ms 延迟）
  useEffect(() => {
    const index = parsed.currentCardIndex;
    if (
      index === null ||
      index === lastScrolledCardIndex.current ||
      index >= drawnCards.length
    ) {
      return;
    }
    lastScrolledCardIndex.current = index;
    const timer = setTimeout(() => {
      const cardElement = document.getElementById(`card-${index}`);
      cardElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [parsed.currentCardIndex, drawnCards.length]);

  const handleStartNew = () => {
    resetSession();
    router.push("/");
  };

  const handleShare = async () => {
    const shareText = `我的塔罗占卜结果\n\n问题：${question}\n\n${parsed.coreAdvice || "正在解析中..."}`;

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
          {/* 1. 你的问题 */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mystical-card p-6 md:p-8"
          >
            <div className="flex items-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                你的问题
              </h1>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <p className="text-gray-700 text-lg md:text-xl leading-relaxed font-medium">
                &quot;{question}&quot;
              </p>
            </div>
          </motion.section>

          {/* 2. 抽牌结果 */}
          <AnimatePresence>
            {showCards && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="mystical-card p-6 md:p-8"
              >
                <div className="flex items-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                    抽牌结果
                  </h2>
                </div>
                <div className="mb-6">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="font-bold text-purple-800 mb-2">
                      {recommendedSpread.name}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {recommendedSpread.description}
                    </p>
                  </div>
                </div>

                {/* 牌阵布局 - 使用Grid布局 */}
                <div className="max-w-5xl mx-auto">
                  <div
                    className={`grid gap-4 justify-items-center ${
                      drawnCards.length > 4
                        ? `grid-cols-${drawnCards.length}`
                        : "grid-cols-4"
                    } ${drawnCards.length > 4 ? "grid-rows-2" : ""}`}
                  >
                    {drawnCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        className={`flex flex-col items-center transition-all duration-500 ${
                          parsed.currentCardIndex === index
                            ? "ring-4 ring-purple-400 ring-opacity-50 rounded-xl p-4 bg-purple-50/30"
                            : ""
                        } ${
                          // 特殊布局调整
                          drawnCards.length === 5 && index === 4
                            ? "col-start-2"
                            : drawnCards.length === 7 && index >= 4
                              ? "col-start-2"
                              : ""
                        }`}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{
                          opacity: 1,
                          scale: parsed.currentCardIndex === index ? 1.05 : 1,
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
                        <div className="mt-3 text-center max-w-[120px]">
                          <p className="text-sm font-semibold text-gray-800">
                            {cardReversals[index] && (
                              <span className="text-amber-600">(逆)</span>
                            )}
                            {card.name}
                          </p>
                          <p className="text-xs text-purple-600 font-medium mt-1">
                            {recommendedSpread.positions[index]}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
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
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                      🤖 AI深度解析
                    </h2>
                    {isStreaming && (
                      <p className="text-green-600 text-sm font-medium">
                        正在思考分析中...
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 md:p-8">
                  <div className="text-gray-700 text-base md:text-lg leading-relaxed">
                    <MarkdownRenderer
                      content={
                        parsed.analysis ??
                        stripAdviceSection(streamingContent)
                      }
                      className="text-gray-700"
                    />
                    {isStreaming && (
                      <motion.span
                        className="inline-block w-2 h-5 bg-purple-500 ml-1"
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 4. 核心建议 */}
          <AnimatePresence>
            {(parsed.coreAdvice || streamComplete) && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="mystical-card p-6 md:p-8"
              >
                <div className="flex items-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                    核心建议
                  </h2>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50 border border-yellow-200 rounded-xl p-6">
                  {parsed.coreAdvice ? (
                    // Markdown 渲染：AI 输出的 **粗体**/换行正常展示（规格 R3）
                    <MarkdownRenderer content={parsed.coreAdvice} />
                  ) : (
                    <p className="text-gray-800 text-lg md:text-xl font-semibold leading-relaxed">
                      正在生成核心建议...
                    </p>
                  )}
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
