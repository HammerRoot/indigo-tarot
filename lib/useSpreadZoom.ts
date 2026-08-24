"use client";

import { useCallback, useRef, useState } from "react";

// 牌桌整桌缩放(规格 G6)
// 桌面:滚轮以指针为中心缩放 + 拖拽平移
// 移动:双指捏合缩放 + 单指拖拽平移
// 拖拽与点击通过位移阈值(>5px)区分:拖拽时抑制牌点击,保证盲选点击准确。
// 初始视图自动 fit:进入牌桌后调用 fitToContent() 使全部 78 张可见并居中。
// 注意:不直接返回 ref 对象(React Compiler 规则禁止渲染期访问 ref),
// 改用 register*Ref 回调由 React 在挂载时注册。

export interface SpreadZoom {
  scale: number;
  x: number;
  y: number;
  /** ref 回调:绑定到牌桌视口容器(裁剪边界) */
  registerViewportRef: (node: HTMLDivElement | null) => void;
  /** ref 回调:绑定到牌桌内容层(被 transform 的网格) */
  registerContentRef: (node: HTMLDivElement | null) => void;
  /** 拖拽期间应抑制牌点击 */
  ignoreClick: () => boolean;
  /** 自动 fit:计算缩放使内容完整可见并居中 */
  fitToContent: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onWheel: (e: React.WheelEvent) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD = 5;
const FIT_PADDING = 0.92; // fit 时留边距

interface PointerInfo {
  x: number;
  y: number;
}

export function useSpreadZoom(initialScale = 1): SpreadZoom {
  const [scale, setScale] = useState(initialScale);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const registerViewportRef = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
  }, []);
  const registerContentRef = useCallback((node: HTMLDivElement | null) => {
    contentRef.current = node;
  }, []);

  // 活动指针(支持双指)
  const pointersRef = useRef(new Map<number, PointerInfo>());
  const lastSingleRef = useRef<PointerInfo | null>(null);
  const movedRef = useRef(false);
  const shouldIgnoreClickRef = useRef(false);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);

  // 自动 fit:内容完整可见并居中
  const fitToContent = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    // offsetWidth/offsetHeight 为布局尺寸,不受 transform 影响
    const cw = content.offsetWidth;
    const ch = content.offsetHeight;
    if (cw === 0 || ch === 0) return;
    const fit = Math.min(vw / cw, vh / ch) * FIT_PADDING;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit));
    setScale(next);
    setX((vw - cw * next) / 2);
    setY((vh - ch * next) / 2);
  }, []);

  const updateFromPointers = useCallback(() => {
    const pts = [...pointersRef.current.values()];
    if (pts.length === 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const rect = viewportRef.current?.getBoundingClientRect();
      const cx = rect ? midX - rect.left : midX;
      const cy = rect ? midY - rect.top : midY;
      if (!pinchStartRef.current) {
        pinchStartRef.current = { dist, scale };
      } else if (dist > 0) {
        const ratio = dist / pinchStartRef.current.dist;
        const nextScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, pinchStartRef.current.scale * ratio),
        );
        setScale((prev) => {
          setX((ox) => cx - (cx - ox) * (nextScale / prev));
          setY((oy) => cy - (cy - oy) * (nextScale / prev));
          return nextScale;
        });
      }
      movedRef.current = true;
      shouldIgnoreClickRef.current = true;
    } else if (pts.length === 1) {
      const [p] = pts;
      if (lastSingleRef.current) {
        const dx = p.x - lastSingleRef.current.x;
        const dy = p.y - lastSingleRef.current.y;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
          movedRef.current = true;
        }
        if (movedRef.current) {
          setX((prev) => prev + dx);
          setY((prev) => prev + dy);
        }
      }
      lastSingleRef.current = p;
    }
  }, [scale]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;
    shouldIgnoreClickRef.current = false;
    lastSingleRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
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

  // 桌面滚轮:以指针位置为中心缩放
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setScale((prev) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev * factor));
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setX((ox) => px - (px - ox) * (next / prev));
      setY((oy) => py - (py - oy) * (next / prev));
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    setScale(initialScale);
    setX(0);
    setY(0);
  }, [initialScale]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(MAX_SCALE, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(MIN_SCALE, prev / 1.2));
  }, []);

  const ignoreClick = useCallback(() => shouldIgnoreClickRef.current, []);

  return {
    scale,
    x,
    y,
    registerViewportRef,
    registerContentRef,
    ignoreClick,
    fitToContent,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onWheel,
    resetView,
    zoomIn,
    zoomOut,
  };
}
