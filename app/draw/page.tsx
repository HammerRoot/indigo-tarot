"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useTarotStore, recommendSpread } from "@/lib/store";
import { useRouter } from "next/navigation";
import { TarotCard } from "@/app/components/TarotCard";

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
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 返回按钮 */}
        <motion.button
          onClick={() => router.push("/")}
          className="fixed top-6 left-6 mystical-button p-3"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="max-w-4xl mx-auto pt-20">
          {/* 步骤指示器 */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {["推荐牌阵", "选择卡牌", "揭示结果"].map((step, index) => {
                const steps = ["spread", "draw", "reveal"];
                const isActive = steps[index] === currentStep;
                const isCompleted = steps.indexOf(currentStep) > index;

                return (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all shadow-lg ${
                        isActive
                          ? "border-purple-500 bg-purple-500 text-white"
                          : isCompleted
                            ? "border-purple-300 bg-purple-300 text-white"
                            : "border-gray-300 bg-white text-gray-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`ml-3 text-sm font-semibold hidden sm:block ${
                        isActive
                          ? "text-purple-600"
                          : isCompleted
                            ? "text-purple-400"
                            : "text-gray-400"
                      }`}
                    >
                      {step}
                    </span>
                    {index < 2 && (
                      <div className="w-8 md:w-12 h-px bg-gray-300 mx-2 md:mx-4 hidden sm:block" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 问题显示 */}
          <div className="text-center mb-6">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mb-3">
              你的问题
            </h1>
            <div className="mystical-card p-4 max-w-2xl mx-auto">
              <p className="text-gray-700 text-base leading-relaxed">
                &quot;{question}&quot;
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* 步骤1: 推荐牌阵 */}
            {currentStep === "spread" && (
              <motion.div
                key="spread"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mystical-card p-8 text-center"
              >
                <div className="w-20 h-20 mx-auto mb-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
                  {recommendedSpread.name}
                </h2>
                <p className="text-gray-600 text-lg md:text-xl mb-8 leading-relaxed max-w-2xl mx-auto">
                  {recommendedSpread.description}
                </p>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-8">
                  <p className="text-base font-semibold text-gray-700 mb-4 text-center">
                    牌位含义：
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
                    {recommendedSpread.positions.map((position, index) => (
                      <span
                        key={index}
                        className="bg-white border border-purple-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 text-center"
                      >
                        {position}
                      </span>
                    ))}
                  </div>
                </div>
                <motion.button
                  onClick={handleStartDraw}
                  className="mystical-button px-10 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  开始抽牌
                </motion.button>
              </motion.div>
            )}

            {/* 步骤2: 选择卡牌 */}
            {currentStep === "draw" && (
              <motion.div
                key="draw"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
                  请选择 {recommendedSpread.cardCount} 张牌
                </h2>
                <div className="mystical-card p-4 inline-block mb-2">
                  <p className="text-purple-600 font-semibold text-lg">
                    已选择: {selectedCards.length} /{" "}
                    {recommendedSpread.cardCount}
                  </p>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 max-w-6xl mx-auto">
                  {Array.from({ length: 24 }, (_, index) => (
                    <motion.div
                      key={index}
                      className="relative flex justify-center"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <div
                        className={`w-16 h-24 sm:w-20 sm:h-30 md:w-24 md:h-36 bg-gradient-to-br from-purple-800 via-blue-900 to-purple-900 rounded-lg border-2 shadow-lg flex items-center justify-center cursor-pointer transition-all duration-200 ${
                          selectedCards.includes(index)
                            ? "border-yellow-400 shadow-yellow-400/50 scale-105"
                            : "border-purple-300 hover:border-purple-400 hover:scale-105"
                        }`}
                        onClick={() => handleCardSelect(index)}
                      >
                        <div className="text-center text-white/80">
                          <div className="text-lg md:text-2xl mb-1">🌟</div>
                          <div className="text-xs font-medium">TAROT</div>
                        </div>
                        {selectedCards.includes(index) && (
                          <motion.div
                            className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold"
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
                className="text-center"
              >
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                  点击卡牌揭示结果
                </h2>
                <div className="mystical-card p-4 inline-block mb-8">
                  <p className="text-purple-600 font-semibold text-lg">
                    已揭示: {revealedCards.length} / {drawnCards.length}
                  </p>
                </div>

                <div className="flex justify-center gap-6 flex-wrap">
                  {drawnCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      className="flex flex-col items-center"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.2 }}
                    >
                      {/* 牌位标签 */}
                      <motion.div
                        className="bg-white border border-purple-200 rounded-lg px-4 py-2 mb-4 shadow-sm"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.2 + 0.1 }}
                      >
                        <span className="text-sm font-semibold text-gray-700">
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
                          className="mt-3 text-center max-w-32"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                        >
                          <p className="text-xs text-gray-600 leading-relaxed">
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
                    className="mt-8 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <motion.button
                      onClick={handleContinue}
                      className="mystical-button px-8 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🔮 获取AI解读
                    </motion.button>
                    <p className="text-sm text-gray-500 mt-3">
                      点击按钮，让AI为你解读塔罗牌的奥秘
                    </p>
                  </motion.div>
                )}

                {isLoading && (
                  <motion.div
                    className="mt-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-300 mr-3"></div>
                      <span className="text-gray-600">
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
            className="fixed inset-0 bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-purple-800/95 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center">
              {/* 主要加载动画 */}
              <motion.div
                className="relative mb-8"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  className="w-32 h-32 border-4 border-yellow-300/30 border-t-yellow-300 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-4 w-24 h-24 border-4 border-purple-300/30 border-b-purple-300 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="text-4xl"
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
                className="text-center"
              >
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  🚀 即将开始AI解析
                </h3>
                <motion.p
                  className="text-lg text-purple-200 mb-6 max-w-md"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  准备进入解析页面，实时观看AI思考过程...
                </motion.p>

                {/* 加载点动画 */}
                <div className="flex justify-center space-x-2">
                  {[0, 1, 2].map((index) => (
                    <motion.div
                      key={index}
                      className="w-3 h-3 bg-yellow-300 rounded-full"
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
    </div>
  );
}
