import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import { SelectionFill } from "@/lib/drawFlow";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import DrawPage from "@/app/draw/page";

const SPREAD = {
  id: "past-present-future",
  name: "时间之流",
  description: "经典三牌阵",
  cardCount: 3,
  positions: ["过去", "现在", "未来"],
  category: [],
};

function fill(cardIndex: number): SelectionFill {
  return { cardIndex, card: tarotCards[cardIndex], reversed: false };
}

function setupStore(selectedSlots: (SelectionFill | null)[] = [null, null, null]) {
  useTarotStore.setState({
    question: "猫咪想说什么",
    recommendedSpread: SPREAD,
    selectedSlots,
    drawnCards: [],
    cardReversals: [],
  });
}

describe("G10 选牌情况页(/draw)", () => {
  beforeEach(() => {
    setupStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    pushMock.mockClear();
  });

  it("未完成选牌:展示 3 个空槽位 + 开始选牌按钮,仅聚焦空位高亮可点击", () => {
    render(<DrawPage />);
    expect(screen.getByText("开始选牌")).toBeInTheDocument();
    expect(screen.queryByText(/开始解析/)).toBeNull();
    expect(document.querySelectorAll('[data-slot]').length).toBe(3);
    expect(document.querySelectorAll('[data-empty-slot]').length).toBe(3);
    // 聚焦空位(0)可点击,其余空位不可点击
    expect(document.querySelector('[data-empty-slot="0"]')?.getAttribute("role")).toBe("button");
    expect(document.querySelector('[data-empty-slot="1"]')?.getAttribute("role")).toBeNull();
    // 动态含义结合问题
    expect(screen.getByText("「猫咪想说」的起点")).toBeInTheDocument();
  });

  it("点击底部「开始选牌」→ 跳转选牌子页 /draw/select", () => {
    render(<DrawPage />);
    fireEvent.click(screen.getByText("开始选牌"));
    expect(pushMock).toHaveBeenCalledWith("/draw/select");
  });

  it("点击聚焦空位(第 1 位)与「开始选牌」效果一致", () => {
    render(<DrawPage />);
    fireEvent.click(document.querySelector('[data-empty-slot="0"]')!);
    expect(pushMock).toHaveBeenCalledWith("/draw/select");
  });

  it("非聚焦空位不可点击(点击不跳转)", () => {
    render(<DrawPage />);
    fireEvent.click(document.querySelector('[data-empty-slot="1"]')!);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("部分已选:展示已填槽位,聚焦下一个空位(高亮且可点击)", () => {
    setupStore([fill(7), null, null]);
    render(<DrawPage />);
    // 槽位 0 已填充,牌面即 tarotCards[7]
    expect(document.querySelector('[data-filled-card="0"]')).not.toBeNull();
    expect(document.querySelector('[data-filled-card="0"] img')?.getAttribute("alt")).toBe(tarotCards[7].name);
    // 聚焦下一位(索引 1)为空槽且可点击
    expect(document.querySelector('[data-empty-slot="1"]')?.getAttribute("role")).toBe("button");
    expect(document.querySelector('[data-empty-slot="0"]')).toBeNull();
    fireEvent.click(document.querySelector('[data-empty-slot="1"]')!);
    expect(pushMock).toHaveBeenCalledWith("/draw/select");
  });

  it("完成选牌:仅「开始解析」,点击写入 store 并跳转结果页", () => {
    setupStore([fill(7), fill(20), fill(33)]);
    render(<DrawPage />);
    expect(screen.getByText(/开始解析/)).toBeInTheDocument();
    expect(screen.queryByText("开始选牌")).toBeNull();
    expect(document.querySelectorAll('[data-filled-card]').length).toBe(3);
    fireEvent.click(screen.getByText(/开始解析/));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const { drawnCards, cardReversals } = useTarotStore.getState();
    expect(drawnCards.length).toBe(3);
    expect(drawnCards[0].id).toBe(tarotCards[7].id);
    expect(drawnCards[1].id).toBe(tarotCards[20].id);
    expect(drawnCards[2].id).toBe(tarotCards[33].id);
    expect(cardReversals.length).toBe(3);
    expect(pushMock).toHaveBeenCalledWith("/result");
  });
});