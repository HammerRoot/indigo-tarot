import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import {
  SelectionFill,
  FLIP_DURATION_MS,
  SHUFFLE_DURATION_MS,
} from "@/lib/drawFlow";

const { pushMock, replaceMock, reducedMotionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  // 默认 true：跳过洗牌动画，使多数用例可直接交互；
  // 「洗牌期间不可点击」用例单独置 false。
  reducedMotionMock: { value: true },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => reducedMotionMock.value };
});

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

/** 点一张牌并推进翻牌动画，返回后处于「揭示浮层已弹出」状态 */
function pickCard(cardIndex: number) {
  fireEvent.click(
    document.querySelector(`[data-card-back="true"][data-index="${cardIndex}"]`)!,
  );
  act(() => {
    vi.advanceTimersByTime(FLIP_DURATION_MS);
  });
}

const overlay = () => screen.queryByTestId("card-modal-overlay");

describe("G17 选牌子页(/draw/select)：连续选满 + 揭示浮层 + 棋盘填满", () => {
  beforeEach(() => {
    setupStore();
    reducedMotionMock.value = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("A1 洗牌期间不可点击；推进 SHUFFLE_DURATION_MS 后恢复可点", () => {
    reducedMotionMock.value = false;
    render(<SelectPage />);

    // 洗牌动画进行中：点击不落定
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );
    expect(useTarotStore.getState().selectedSlots[0]).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SHUFFLE_DURATION_MS);
    });

    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
  });

  it("A1b reduced-motion 开启时跳过洗牌，进场即可点击", () => {
    reducedMotionMock.value = true;
    render(<SelectPage />);
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
  });

  it("A2 网格 6 列，78 个牌位；顶部标注当前选牌位置含义", () => {
    render(<SelectPage />);
    expect(document.querySelectorAll('[data-grid-cell]').length).toBe(78);
    const grid = document.querySelector('[data-grid-cell]')!.parentElement!;
    expect(grid.getAttribute("style") ?? "").toContain(
      "repeat(6, minmax(0, 1fr))",
    );
    expect(screen.getByText("为「过去」选一张牌")).toBeInTheDocument();
    expect(screen.getByText("「猫咪想说」的起点")).toBeInTheDocument();
  });

  it("A3 棋盘填满：已选位变空坑，其余牌位在网格中的位置不变", () => {
    render(<SelectPage />);
    pickCard(7);
    act(() => {
      fireEvent.click(screen.getByText("继续"));
    });

    // 牌位总数恒为 78，但牌背少一张
    expect(document.querySelectorAll('[data-grid-cell]').length).toBe(78);
    expect(document.querySelectorAll('[data-card-back="true"]').length).toBe(77);
    expect(document.querySelector('[data-picked-hole="7"]')).not.toBeNull();
    expect(
      document.querySelector('[data-card-back="true"][data-index="7"]'),
    ).toBeNull();

    // 位置稳定：index 8 的牌仍在网格的第 9 个子位（未因选牌而位移）
    const grid = document.querySelector('[data-grid-cell]')!.parentElement!;
    expect(
      (grid.children[8] as HTMLElement).getAttribute("data-grid-cell"),
    ).toBe("8");
  });

  it("A4 常驻紧凑槽位条：显示进度与当前待选位", () => {
    render(<SelectPage />);
    const bar = document.querySelector('[data-compact-slots="true"]');
    expect(bar).not.toBeNull();
    expect(bar!.textContent).toContain("已选 0 / 3");

    pickCard(7);
    act(() => {
      fireEvent.click(screen.getByText("继续"));
    });
    expect(
      document.querySelector('[data-compact-slots="true"]')!.textContent,
    ).toContain("已选 1 / 3");
  });

  it("A5+A6 点击即落定并弹出揭示浮层（含牌位名、牌名、正逆位）", () => {
    render(<SelectPage />);
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );

    // 落定先于动画：点击瞬间即写入 store
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
    // 原位翻牌：该牌面已挂载
    expect(
      document.querySelector('[data-card-back="true"][data-index="7"] img'),
    ).not.toBeNull();

    // 翻牌完成 → 揭示浮层
    act(() => {
      vi.advanceTimersByTime(FLIP_DURATION_MS);
    });
    expect(overlay()).not.toBeNull();
    expect(screen.getByText("过去")).toBeInTheDocument();
    expect(screen.getByText(tarotCards[7].name)).toBeInTheDocument();
    expect(screen.getByText(/^(正位|逆位)$/)).toBeInTheDocument();
  });

  it("A7 三种收起方式均可关闭浮层，且不跳转", () => {
    // ① 点「继续」
    render(<SelectPage />);
    pickCard(7);
    act(() => {
      fireEvent.click(screen.getByText("继续"));
    });
    expect(overlay()).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();

    // ② 点浮层外（遮罩）
    pickCard(20);
    fireEvent.click(screen.getByTestId("card-modal-overlay"));
    expect(overlay()).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();

    // ③ ESC
    pickCard(33);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(overlay()).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();

    // 全程停留在子页
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("A7b 收起后状态推进：该位成空坑、紧凑槽位条 +1", () => {
    render(<SelectPage />);
    pickCard(7);
    expect(document.querySelector('[data-picked-hole="7"]')).toBeNull(); // 揭示中尚未成坑

    act(() => {
      fireEvent.click(screen.getByText("继续"));
    });
    expect(document.querySelector('[data-picked-hole="7"]')).not.toBeNull();
    expect(
      document.querySelector('[data-compact-slots="true"]')!.textContent,
    ).toContain("已选 1 / 3");
    // 顶部标题前移到下一位
    expect(screen.getByText("为「现在」选一张牌")).toBeInTheDocument();
  });

  it("A8 连续选满全程不跳转；选满后「完成选牌」→ /draw", () => {
    render(<SelectPage />);
    for (const idx of [7, 20, 33]) {
      pickCard(idx);
      act(() => {
        fireEvent.click(screen.getByText("继续"));
      });
    }

    // 三次选牌全程未离开子页
    expect(pushMock).not.toHaveBeenCalled();

    const { selectedSlots } = useTarotStore.getState();
    expect(selectedSlots.map((s) => s?.cardIndex)).toEqual([7, 20, 33]);

    fireEvent.click(screen.getByText("完成选牌"));
    expect(pushMock).toHaveBeenCalledWith("/draw");
  });

  it("A9 不可逆：空坑不可点，且 DOM 中不存在任何重选入口", () => {
    render(<SelectPage />);
    pickCard(7);
    act(() => {
      fireEvent.click(screen.getByText("继续"));
    });

    const before = useTarotStore.getState().selectedSlots[0]?.cardIndex;
    fireEvent.click(document.querySelector('[data-picked-hole="7"]')!);
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(before);

    expect(screen.queryByText(/换一张/)).toBeNull();
    expect(screen.queryByText(/重选/)).toBeNull();
    expect(screen.queryByText(/重新抽牌/)).toBeNull();
  });

  it("A10 防误触：翻牌中与揭示中点击其他牌均无效", () => {
    render(<SelectPage />);

    // ① 翻牌动画进行中（浮层尚未弹出）
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="9"]')!,
    );
    expect(useTarotStore.getState().selectedSlots[1]).toBeNull();
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);

    // ② 浮层已弹出：点其他牌同样无效，且浮层不被顶掉
    act(() => {
      vi.advanceTimersByTime(FLIP_DURATION_MS);
    });
    expect(overlay()).not.toBeNull();
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="9"]')!,
    );
    expect(useTarotStore.getState().selectedSlots[1]).toBeNull();
    expect(overlay()).not.toBeNull();
  });

  it("B2 文案收敛：已失效的「选完自动返回」不再出现", () => {
    render(<SelectPage />);
    expect(screen.queryByText(/选完自动返回/)).toBeNull();
    // 网格已不减去已选牌，「剩 N 张」的旧提示随之失效
    expect(screen.queryByText(/剩 \d+ 张/)).toBeNull();
  });

  it("A11 退出 ≠ 放弃：关闭按钮回 /draw 且已选保留", () => {
    render(<SelectPage />);
    pickCard(7);
    act(() => {
      fireEvent.click(screen.getByText("继续"));
    });
    fireEvent.click(screen.getByLabelText("关闭选牌"));
    expect(pushMock).toHaveBeenCalledWith("/draw");
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
  });

  it("若已全满（直接访问）则回退到情况页", () => {
    setupStore([fill(7), fill(20), fill(33)]);
    render(<SelectPage />);
    expect(replaceMock).toHaveBeenCalledWith("/draw");
  });
});
