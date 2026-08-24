"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import { GridCard } from "@/app/components/GridCard";
import {
  FLIP_DURATION_MS,
  buildPositionMeanings,
  firstEmptySlot,
  pickedIndexesFromSlots,
  randomReversal,
} from "@/lib/drawFlow";

// 选牌子页(规格 G10,路由 /draw/select):排列剩余牌供选择
// - 仅排列剩余张数(78 - 已选)的牌,13×6 平铺网格
// - 不展示空位与已选牌;顶部标注当前选牌位置(第一个未选槽位)的含义
// - 点击一张 → 原位翻牌 → 自动写入该槽位并返回情况页;可关闭(返回)不改变已选
export default function SelectPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    selectedSlots,
    setSelectedSlots,
  } = useTarotStore();

  const [flipIndex, setFlipIndex] = useState<number | null>(null);
  const [flipReversed, setFlipReversed] = useState(false);
  const [animPhase, setAnimPhase] = useState<"idle" | "flipping">("idle");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  // 无问题或未进入牌阵 → 回到首页/情况页
  useEffect(() => {
    if (!question) {
      router.replace("/");
      return;
    }
    if (!recommendedSpread) {
      router.replace("/draw");
    }
  }, [question, recommendedSpread, router]);

  const meanings = useMemo(
    () =>
      recommendedSpread
        ? buildPositionMeanings(question, recommendedSpread.positions)
        : [],
    [question, recommendedSpread],
  );

  // 当前选牌位置(第一个未选槽位);若已全满则不应停留于此 */
  const focus = useMemo(() => firstEmptySlot(selectedSlots), [selectedSlots]);
  // 已选牌索引(从牌堆中减去)
  const pickedIndexes = useMemo(() => pickedIndexesFromSlots(selectedSlots), [selectedSlots]);
  // 剩余牌(78 - 已选)
  const remainingCards = useMemo(
    () =>
      tarotCards
        .map((card, index) => ({ card, index }))
        .filter(({ index }) => !pickedIndexes.includes(index)),
    [pickedIndexes],
  );

  // 若已无待选空位 → 回到情况页(防止直接访问)
  useEffect(() => {
    if (focus === null) {
      router.replace("/draw");
    }
  }, [focus, router]);

  const closeSelect = useCallback(() => {
    router.push("/draw");
  }, [router]);

  // 点击牌背即选中:原位翻牌;翻牌完成后写入该槽位并自动返回情况页
  const handleCardSelect = useCallback(
    (index: number) => {
      if (animPhase !== "idle" || focus === null) return;
      const card = tarotCards[index];
      if (!card || pickedIndexes.includes(index)) return;

      const reversed = randomReversal();
      setFlipIndex(index);
      setFlipReversed(reversed);
      setAnimPhase("flipping");

      const id = window.setTimeout(() => {
        const fresh = useTarotStore.getState().selectedSlots;
        const next = fresh.map((s, i) =>
          i === focus
            ? { cardIndex: index, card, reversed }
            : s,
        );
        setSelectedSlots(next);
        router.push("/draw");
      }, FLIP_DURATION_MS);
      timersRef.current.push(id);
    },
    [animPhase, focus, pickedIndexes, setSelectedSlots, router],
  );

  if (!recommendedSpread || focus === null) {
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
        {/* 关闭(返回)按钮 */}
        <motion.button
          onClick={closeSelect}
          className="fixed top-6 left-6 mystical-button p-3"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="关闭选牌"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="max-w-3xl mx-auto pt-20">
          <div className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              为「{recommendedSpread.positions[focus]}」选一张牌
            </h2>
            <div className="mystical-card p-3 max-w-xl mx-auto mt-3">
              <p className="text-sm text-purple-600 font-semibold">
                {meanings[focus]}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              剩 {remainingCards.length} 张 · 点击牌背即选 · 选完自动返回
            </p>
          </div>

          {/* 平铺牌堆:13 列 × 6 行(剩余张数);已选牌已被减去 */}
          <div className="mx-auto max-w-3xl">
            <div
              className="grid gap-1.5 md:gap-2"
              style={{ gridTemplateColumns: "repeat(8, minmax(0, 1fr))" }}
            >
              {remainingCards.map(({ card, index }) => (
                <GridCard
                  key={card.id}
                  card={card}
                  index={index}
                  isFlipped={flipIndex === index}
                  isReversed={flipIndex === index && flipReversed}
                  isHidden={false}
                  onClick={handleCardSelect}
                  registerRef={() => undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}