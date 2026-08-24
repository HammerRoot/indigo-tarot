"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore, recommendSpread } from "@/lib/store";
import { SpreadSlots } from "@/app/components/SpreadSlots";
import {
  SelectionFill,
  buildPositionMeanings,
  firstEmptySlot,
} from "@/lib/drawFlow";

// 选牌情况页(规格 G10):状态机仅为两态——未完成选牌 / 完成选牌
// - 展示已选牌(填充槽位)与待选空位(虚线占位)
// - 未完成:仅高亮一个待选空位(按顺序),该空位与底部"开始选牌"可点击 → 跳转选牌子页 /draw/select
// - 完成:仅"开始解析"主按钮 → 跳转结果页
export default function DrawPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    selectedSlots,
    setRecommendedSpread,
    setSelectedSlots,
    setDrawnCards,
    setCardReversals,
  } = useTarotStore();

  const [showFullScreenLoading, setShowFullScreenLoading] = useState(false);

  // 控制全屏加载时的滚动禁用
  useEffect(() => {
    if (showFullScreenLoading) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showFullScreenLoading]);

  // 无问题回首页;推荐牌阵
  useEffect(() => {
    if (!question) {
      router.push("/");
      return;
    }
    if (!recommendedSpread) {
      const spread = recommendSpread(question);
      setRecommendedSpread(spread);
    }
  }, [question, recommendedSpread, setRecommendedSpread, router]);

  // 槽位数量与牌阵不一致(或首次进入)时补全为空位数组
  useEffect(() => {
    if (recommendedSpread && selectedSlots.length !== recommendedSpread.cardCount) {
      setSelectedSlots(Array(recommendedSpread.cardCount).fill(null));
    }
  }, [recommendedSpread, selectedSlots.length, setSelectedSlots]);

  const cardCount = recommendedSpread?.cardCount ?? 0;
  const meanings = useMemo(
    () =>
      recommendedSpread
        ? buildPositionMeanings(question, recommendedSpread.positions)
        : [],
    [question, recommendedSpread],
  );

  // 状态机:focus 为第一个未选空位;为 null 即「完成选牌」
  const focusSlot = useMemo(() => firstEmptySlot(selectedSlots), [selectedSlots]);
  const isComplete = focusSlot === null;
  const filledCount = useMemo(
    () => selectedSlots.filter((s) => s !== null).length,
    [selectedSlots],
  );

  // 进入选牌子页(点击"开始选牌"或聚焦空位,效果一致)
  const goSelect = useCallback(() => {
    if (isComplete) return;
    router.push("/draw/select");
  }, [isComplete, router]);

  // 完成选牌 → 写入结果数据并进入解析
  const handleAnalyze = useCallback(() => {
    const fills = selectedSlots.filter((s): s is SelectionFill => s !== null);
    if (fills.length !== cardCount) return;
    setDrawnCards(fills.map((f) => f.card));
    setCardReversals(fills.map((f) => f.reversed));
    setShowFullScreenLoading(true);
    window.setTimeout(() => {
      setShowFullScreenLoading(false);
      router.push("/result");
    }, 500);
  }, [selectedSlots, cardCount, setDrawnCards, setCardReversals, router]);

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
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                {recommendedSpread.name}
              </h1>
              <div className="mystical-card p-4 max-w-2xl mx-auto">
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  &quot;{question}&quot;
                </p>
              </div>
            </div>

            {/* 选牌进度 */}
            <p className="text-sm text-purple-600 font-semibold mb-4">
              {isComplete
                ? `已完成选牌 ${filledCount} / ${cardCount} 张`
                : `已选 ${filledCount} / ${cardCount} 张 · 请选择第 ${focusSlot! + 1} 位「${recommendedSpread.positions[focusSlot!]}」`
              }
            </p>

            {/* 牌阵槽位:聚焦空位高亮且可点击,其余不可点 */}
            <SpreadSlots
              positions={recommendedSpread.positions}
              meanings={meanings}
              fills={selectedSlots}
              focusSlot={focusSlot}
              onSlotClick={goSelect}
            />

            {/* 底部主按钮 */}
            <div className="mt-10 pb-4">
              {isComplete ? (
                <motion.button
                  onClick={handleAnalyze}
                  className="mystical-button px-12 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  🔮 开始解析
                </motion.button>
              ) : (
                <motion.button
                  onClick={goSelect}
                  className="mystical-button px-12 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  开始选牌
                </motion.button>
              )}
              <p className="text-xs text-gray-500 mt-3">
                {isComplete
                  ? "牌阵已就位,让塔罗为你解读"
                  : "点击高亮空位或「开始选牌」进入选牌页"
              }
            </p>
            </div>
          </div>
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
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                  🚀 即将开始AI解析
                </h3>
                <p className="text-lg text-purple-200 mb-6 max-w-md mx-auto">
                  准备进入解析页面,实时观看AI思考过程...
                </p>
                <div className="flex justify-center space-x-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-yellow-300 rounded-full"
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
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