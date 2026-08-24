"use client";

import { useCallback, useRef, useState } from "react";

// 扇形牌桌缩放(规格 G6 / 修复3)
// - 双指捏合缩放 + 桌面滚轮缩放(作用于扇形内容层)
// - 横向滑动交给原生 overflow-x 滚动(单指不拦截)
// - 拖拽/滑动移动超过阈值时抑制子元素 click,避免选牌误触
// 注意:不直接返回 ref 对象(React Compiler 规则禁止渲染期访问 ref),
// 用 registerViewportRef 回调由 React 在挂载时注册。

export interface SpreadZoom {
  scale: number;
  /** ref 回调:绑定到牌桌视口容器 */
  registerViewportRef: (node: HTMLDivElement | null) => void;
  /** 移动超过阈值(滑动浏览)时应抑制牌点击 */
  ignoreClick: () => boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onWheel: (e: React.WheelEvent) => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD = 5;

interface PointerInfo {
  x: number;
  y: number;
}

export function useSpreadZoom(initialScale = 1): SpreadZoom {
  const [scale, setScale] = useState(initialScale);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const registerViewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
  }, []);

  // 活动指针(支持双指)
  const pointersRef = useRef(new Map<number, PointerInfo>());
  const lastSingleRef = useRef<PointerInfo | null>(null);
  const movedRef = useRef(false);
  const shouldIgnoreClickRef = useRef(false);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  const updateFromPointers = useCallback(() => {
    const pts = [...pointersRef.current.values()];
    if (pts.length === 2) {
      // 双指捏合缩放(以扇形底部为锚,scale 作用于内容层)
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinchStartRef.current) {
        pinchStartRef.current = { dist, scale };
      } else if (dist > 0) {
        const ratio = dist / pinchStartRef.current.dist;
        setScale(
          Math.min(
            MAX_SCALE,
            Math.max(MIN_SCALE, pinchStartRef.current.scale * ratio),
          ),
        );
      }
      movedRef.current = true;
      shouldIgnoreClickRef.current = true;
    } else if (pts.length === 1) {
      // 单指:不拦截(横向滑动交给原生 overflow-x 滚动),仅标记移动抑制点击
      const [p] = pts;
      if (lastSingleRef.current) {
        const dx = p.x - lastSingleRef.current.x;
        const dy = p.y - lastSingleRef.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          movedRef.current = true;
          shouldIgnoreClickRef.current = true;
        }
      }
      lastSingleRef.current = p;
    }
  }, [scale]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // 不立即 setPointerCapture(会吞掉子元素的 click,导致选牌无反应)
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;
    shouldIgnoreClickRef.current = false;
    lastSingleRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // 单指滑动(超过阈值)时 capture,避免滚动途中触发子元素事件
      if (
        !movedRef.current &&
        pointersRef.current.size === 1 &&
        lastSingleRef.current
      ) {
        const dx = e.clientX - lastSingleRef.current.x;
        const dy = e.clientY - lastSingleRef.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }
      }
      updateFromPointers();
    },
    [updateFromPointers],
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    lastSingleRef.current = null;
    pinchStartRef.current = null;
  }, []);

  const onPointerCancel = useCallback(() => {
    pointersRef.current.clear();
    lastSingleRef.current = null;
    pinchStartRef.current = null;
  }, []);

  // 桌面滚轮缩放
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setScale((prev) =>
      Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor)),
    );
  }, []);

  const ignoreClick = useCallback(() => shouldIgnoreClickRef.current, []);

  return {
    scale,
    registerViewportRef,
    ignoreClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onWheel,
  };
}
