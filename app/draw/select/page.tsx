"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import { GridCard } from "@/app/components/GridCard";
import { CardModal } from "@/app/components/CardModal";
import { SpreadSlots } from "@/app/components/SpreadSlots";
import {
  FLIP_DURATION_MS,
  SHUFFLE_DURATION_MS,
  buildPositionMeanings,
  firstEmptySlot,
  pickedIndexesFromSlots,
  randomReversal,
} from "@/lib/drawFlow";

// 选牌子页(规格 G17 重写):洗牌进场 → 连续选满 → 一次返回
// - 洗牌动画结束后才可点击(reduced-motion 时跳过)
// - 点击即落定(立即写入 store,不可逆)→ 原位翻牌 → 揭示浮层(由用户收起)
// - 棋盘填满:78 个牌位位置全程不变,已选位渲染为空坑,不做重排
// - 选满后「完成选牌」回情况页;中途关闭 = 退出(进度保留在 store),不等于放弃
const GRID_COLUMNS = 6;

// 状态机:shuffling(不可点) → idle(可点) → flipping(原位翻牌) → revealing(揭示浮层)
type Phase = "shuffling" | "idle" | "flipping" | "revealing";

/**
 * 与牌组索引绑定的确定性伪随机(0–1)。
 * 用确定性函数而非 Math.random:子页会被服务端预渲染,渲染期取随机数会造成 hydration 不一致。
 */
function shuffleNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function SelectPage() {
  const router = useRouter();
  const { question, recommendedSpread, selectedSlots, setSelectedSlots } =
    useTarotStore();

  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(
    reducedMotion ? "idle" : "shuffling",
  );
  const [flipIndex, setFlipIndex] = useState<number | null>(null);
  const [flipReversed, setFlipReversed] = useState(false);
  // 揭示浮层对应的槽位(与 flipIndex 分离:牌组索引与槽位索引不是一回事)
  const [revealSlot, setRevealSlot] = useState<number | null>(null);
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

  // 仅首次进入时校验:直接访问一个已选满的子页 → 回退情况页。
  // 刻意用 ref 守卫而非以 focus 为依赖——否则选满最后一张会被立刻弹走,
  // 用户根本看不到揭示浮层、也点不到「完成选牌」。
  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    if (firstEmptySlot(useTarotStore.getState().selectedSlots) === null) {
      router.replace("/draw");
    }
  }, [router]);

  // 洗牌:动画结束后才放开点击
  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setTimeout(() => setPhase("idle"), SHUFFLE_DURATION_MS);
    timersRef.current.push(id);
    return () => window.clearTimeout(id);
  }, [reducedMotion]);

  const meanings = useMemo(
    () =>
      recommendedSpread
        ? buildPositionMeanings(question, recommendedSpread.positions)
        : [],
    [question, recommendedSpread],
  );

  // 当前待选位 = 第一个空槽位;为 null 即已选满
  const focus = useMemo(() => firstEmptySlot(selectedSlots), [selectedSlots]);
  const pickedIndexes = useMemo(
    () => pickedIndexesFromSlots(selectedSlots),
    [selectedSlots],
  );
  const filledCount = useMemo(
    () => selectedSlots.filter((s) => s !== null).length,
    [selectedSlots],
  );
  const isComplete = focus === null;

  const closeSelect = useCallback(() => router.push("/draw"), [router]);

  // 点击牌背即落定:先写 store(不可逆),再原位翻牌,翻毕弹出揭示浮层
  const handleCardSelect = useCallback(
    (index: number) => {
      if (phase !== "idle" || focus === null) return;
      const card = tarotCards[index];
      if (!card || pickedIndexes.includes(index)) return;

      const reversed = randomReversal();
      setSelectedSlots(
        selectedSlots.map((slot, i) =>
          i === focus ? { cardIndex: index, card, reversed } : slot,
        ),
      );
      setFlipIndex(index);
      setFlipReversed(reversed);
      setRevealSlot(focus);
      setPhase("flipping");

      const id = window.setTimeout(
        () => setPhase("revealing"),
        FLIP_DURATION_MS,
      );
      timersRef.current.push(id);
    },
    [phase, focus, pickedIndexes, selectedSlots, setSelectedSlots],
  );

  // 收起揭示浮层:留在子页,该位随后渲染为空坑
  const closeReveal = useCallback(() => {
    setFlipIndex(null);
    setRevealSlot(null);
    setPhase("idle");
  }, []);

  if (!recommendedSpread) {
    return (
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300"></div>
      </div>
    );
  }

  const isShuffling = phase === "shuffling";
  const revealedFill = revealSlot !== null ? selectedSlots[revealSlot] : null;

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 关闭(退出)按钮:进度保留在 store,退出 ≠ 放弃 */}
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
          {/* 常驻紧凑槽位条:用户全程无需离开子页即可掌握进度 */}
          <div data-compact-slots="true" className="text-center mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              {isComplete
                ? "牌阵已就位"
                : `为「${recommendedSpread.positions[focus]}」选一张牌`}
            </h2>
            {!isComplete && (
              <div className="mystical-card p-3 max-w-xl mx-auto mt-3">
                <p className="text-sm text-purple-600 font-semibold">
                  {meanings[focus]}
                </p>
              </div>
            )}
            <p className="text-sm text-purple-600 font-semibold mt-3">
              已选 {filledCount} / {recommendedSpread.cardCount}
              {isShuffling ? " · 洗牌中…" : ""}
            </p>
            <div className="mt-4">
              <SpreadSlots
                positions={recommendedSpread.positions}
                meanings={meanings}
                fills={selectedSlots}
                focusSlot={focus}
                compact
              />
            </div>
          </div>

          {/* 棋盘填满:78 个牌位位置全程不变,已选位渲染为空坑 */}
          <div
            data-grid-columns={GRID_COLUMNS}
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
            }}
          >
            {tarotCards.map((card, index) => {
              const picked = pickedIndexes.includes(index);
              // 翻牌/揭示期间该位仍以牌背(翻面)呈现,收起后才落成空坑
              const isActive = flipIndex === index && phase !== "idle";
              return (
                <motion.div
                  key={card.id}
                  data-grid-cell={index}
                  initial={
                    isShuffling
                      ? {
                          opacity: 0.15,
                          x: (shuffleNoise(index * 3) - 0.5) * 160,
                          y: (shuffleNoise(index * 3 + 1) - 0.5) * 160,
                          rotate: (shuffleNoise(index * 3 + 2) - 0.5) * 120,
                        }
                      : false
                  }
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                  transition={{
                    duration: SHUFFLE_DURATION_MS / 1000,
                    ease: "easeOut",
                  }}
                >
                  {picked && !isActive ? (
                    <div
                      data-picked-hole={index}
                      className="w-full aspect-[2/3] rounded-[3px] md:rounded-md border border-dashed border-purple-400/40 bg-purple-900/10"
                    />
                  ) : (
                    <GridCard
                      card={card}
                      index={index}
                      isFlipped={isActive}
                      isReversed={isActive && flipReversed}
                      isHidden={false}
                      onClick={handleCardSelect}
                      registerRef={() => undefined}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 选满后才出现;中途关闭走左上角,语义是「退出」而非「完成」 */}
          {isComplete && (
            <div className="mt-10 pb-4 text-center">
              <motion.button
                onClick={closeSelect}
                className="mystical-button px-12 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                完成选牌
              </motion.button>
            </div>
          )}
        </div>
      </main>

      {/* 揭示浮层:复用 CardModal(它已是 G15 唯一被许可传 sizes 的组件)。
          三种收起方式——「继续」按钮 / 点浮层外 / ESC,均由 CardModal 提供。

          刻意**不套 AnimatePresence**:其退场期间节点仍留在 DOM 里,浮层的按钮仍可点、
          且一层 fixed inset-0 仍盖着网格——对「点击即落定、连续选满 N 张」的流程而言,
          这等于每次收牌后多出一段点击死区。入场动画(弹簧缩放)由 CardModal 自身承担,
          它才是揭示感的来源;退场即时卸载。 */}
      {phase === "revealing" && revealSlot !== null && revealedFill && (
        <CardModal
          card={revealedFill.card}
          position={recommendedSpread.positions[revealSlot]}
          isReversed={revealedFill.reversed}
          onClose={closeReveal}
          actionLabel="继续"
        />
      )}
    </div>
  );
}
