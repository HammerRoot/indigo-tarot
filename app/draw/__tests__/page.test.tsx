import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import DrawPage from "@/app/draw/page";

function setupStore() {
  useTarotStore.setState({
    question: "测试问题",
    recommendedSpread: {
      id: "single-card",
      name: "单张牌指引",
      description: "最简单直接的指引",
      cardCount: 1,
      positions: ["核心指引"],
      category: [],
    },
    drawnCards: [],
    cardReversals: [],
  });
}

describe("G6 牌桌抽牌体验", () => {
  beforeEach(() => {
    setupStore();
  });

  it("选牌步骤渲染 78 张 CSS 牌背(非占位)", async () => {
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始抽牌"));
    // AnimatePresence mode="wait" 需等待 draw 步骤挂载
    await waitFor(() => {
      expect(document.querySelectorAll('[data-card-back="true"]').length).toBe(78);
    });
  });

  it("严格盲选:牌背无牌面图片/名称", async () => {
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始抽牌"));
    await waitFor(() => {
      expect(document.querySelectorAll('[data-card-back="true"]').length).toBe(78);
    });
    // 盲选:看不到牌面(无 alt=牌名 的图片)
    expect(document.querySelector('img[alt="愚者"]')).toBeNull();
  });

  it("点击第 N 张牌背 → 抽中的就是 tarotCards[N]", async () => {
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始抽牌"));
    await waitFor(() => {
      expect(document.querySelector('[data-card-back="true"][data-index="7"]')).not.toBeNull();
    });
    // 单张牌阵,点第 7 张(index=7 → tarotCards[7])
    fireEvent.click(document.querySelector('[data-card-back="true"][data-index="7"]')!);
    // 选满 1 张 → 进入 reveal 步骤,drawnCards[0] 应为 tarotCards[7]
    expect(useTarotStore.getState().drawnCards[0]?.id).toBe(tarotCards[7].id);
  });

  it("选满 cardCount 自动进入揭示步骤", async () => {
    useTarotStore.setState({
      recommendedSpread: {
        id: "decision-making",
        name: "选择之路",
        description: "五张牌阵",
        cardCount: 2,
        positions: ["现状", "选项A"],
        category: [],
      },
    });
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始抽牌"));
    await waitFor(() => {
      expect(document.querySelector('[data-card-back="true"][data-index="3"]')).not.toBeNull();
    });
    fireEvent.click(document.querySelector('[data-card-back="true"][data-index="3"]')!);
    fireEvent.click(document.querySelector('[data-card-back="true"][data-index="20"]')!);
    // 选满 2 张 → reveal 步骤出现(点击卡牌揭示结果);mode="wait" 需等待
    await waitFor(() => {
      expect(screen.getByText("点击卡牌揭示结果")).toBeInTheDocument();
    });
  });

  it("已选中的牌不可重复选择", async () => {
    useTarotStore.setState({
      recommendedSpread: {
        id: "decision-making",
        name: "选择之路",
        description: "五张牌阵",
        cardCount: 3,
        positions: ["现状", "选项A", "选项B"],
        category: [],
      },
    });
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始抽牌"));
    await waitFor(() => {
      expect(document.querySelector('[data-card-back="true"][data-index="5"]')).not.toBeNull();
    });
    const first = document.querySelector('[data-card-back="true"][data-index="5"]')!;
    fireEvent.click(first);
    // 再次点击同一张 → selectedCards 不变,不进入 reveal
    fireEvent.click(first);
    expect(screen.queryByText("点击卡牌揭示结果")).toBeNull();
    // 点另一张后共 2/3,未满
    fireEvent.click(document.querySelector('[data-card-back="true"][data-index="9"]')!);
    expect(screen.queryByText("点击卡牌揭示结果")).toBeNull();
  });

  it("牌桌提供缩放与重置控件", async () => {
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始抽牌"));
    // 缩放提示/控件存在(整桌缩放交互的可见入口)
    await waitFor(() => {
      expect(screen.getByTestId("spread-zoom-controls")).toBeInTheDocument();
    });
  });
});
