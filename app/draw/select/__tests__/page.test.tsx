import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import { SelectionFill, FLIP_DURATION_MS } from "@/lib/drawFlow";

const { pushMock, replaceMock } = vi.hoisted(() => ({ pushMock: vi.fn(), replaceMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

import SelectPage from "@/app/draw/select/page";

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
  });
}

describe("G10 选牌子页(/draw/select)", () => {
  beforeEach(() => {
    setupStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("排列剩余 78 张牌;标注当前选牌位置含义;不展示空位与已选牌", () => {
    render(<SelectPage />);
    expect(document.querySelectorAll('[data-card-back="true"]').length).toBe(78);
    // 一行 8 张网格(替换 13 列)
    const grid = document.querySelector('[data-card-back="true"]')!.parentElement!;
    expect(grid.getAttribute("style") ?? "").toContain("repeat(8, minmax(0, 1fr))");
    expect(screen.getByText("为「过去」选一张牌")).toBeInTheDocument();
    expect(screen.getByText("「猫咪想说」的起点")).toBeInTheDocument();
    // 不展示空位/已选牌相关结构
    expect(document.querySelector('[data-slot]')).toBeNull();
    expect(document.querySelector('[data-empty-slot]')).toBeNull();
    expect(document.querySelector('[data-filled-card]')).toBeNull();
  });

  it("关闭按钮 → 返回情况页 /draw", () => {
    render(<SelectPage />);
    fireEvent.click(screen.getByLabelText("关闭选牌"));
    expect(pushMock).toHaveBeenCalledWith("/draw");
  });

  it("已选牌从牌堆中减去:仅排列剩余张数,并切换为下一位含义", () => {
    setupStore([fill(7), null, null]);
    render(<SelectPage />);
    expect(document.querySelectorAll('[data-card-back="true"]').length).toBe(77);
    expect(document.querySelector('[data-card-back="true"][data-index="7"]')).toBeNull();
    expect(screen.getByText("为「现在」选一张牌")).toBeInTheDocument();
  });

  it("点击牌背 → 原位翻牌 → 翻牌完成后写入槽位并自动返回 /draw", () => {
    render(<SelectPage />);
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );
    // 原位翻牌:该牌面(图片)被挂载
    expect(
      document.querySelector('[data-card-back="true"][data-index="7"] img')
    ).not.toBeNull();
    // 翻牌完成 → 写入第 1 位并返回
    act(() => {
      vi.advanceTimersByTime(FLIP_DURATION_MS);
    });
    const { selectedSlots } = useTarotStore.getState();
    expect(selectedSlots[0]?.cardIndex).toBe(7);
    expect(selectedSlots[0]?.card.id).toBe(tarotCards[7].id);
    expect(pushMock).toHaveBeenCalledWith("/draw");
  });

  it("若已全满(直接访问)则回退到情况页", () => {
    setupStore([fill(7), fill(20), fill(33)]);
    render(<SelectPage />);
    expect(replaceMock).toHaveBeenCalledWith("/draw");
  });
});