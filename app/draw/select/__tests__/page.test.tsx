import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
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

// —— 观测辅助：只读「可观测结果」，不读实现细节（样式字符串 / 子元素下标 / 文案） ——

/** 网格中牌位的排列顺序（用于断言「位置不因选牌而位移」） */
function cellOrder(): (string | null)[] {
  return [...document.querySelectorAll("[data-grid-cell]")].map((el) =>
    el.getAttribute("data-grid-cell"),
  );
}

/** 紧凑槽位条的填充/空位结构（progress 的结构化表达，不依赖文案） */
function slotCounts() {
  const bar = document.querySelector('[data-compact-slots="true"]')!;
  return {
    filled: bar.querySelectorAll("[data-filled-card]").length,
    empty: bar.querySelectorAll("[data-empty-slot]").length,
  };
}

/** 页面上全部按钮的可读标识——「不存在重选入口」的可证伪正面形式 */
function buttonLabels(): string[] {
  return screen
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "");
}

function pickCard(cardIndex: number) {
  fireEvent.click(
    document.querySelector(`[data-card-back="true"][data-index="${cardIndex}"]`)!,
  );
  act(() => {
    vi.advanceTimersByTime(FLIP_DURATION_MS);
  });
}

const overlay = () => screen.queryByTestId("card-modal-overlay");

/** 收起揭示浮层。走遮罩而非「继续」按钮——本套用例不该依赖按钮文案 */
function dismissOverlay() {
  act(() => {
    fireEvent.click(screen.getByTestId("card-modal-overlay"));
  });
}

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
    const first = () =>
      document.querySelector('[data-card-back="true"][data-index="7"]')!;

    fireEvent.click(first());
    expect(useTarotStore.getState().selectedSlots[0]).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SHUFFLE_DURATION_MS);
    });

    fireEvent.click(first());
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

  it("A2 网格为 6 列、78 个牌位；顶部标注当前选牌位置含义", () => {
    render(<SelectPage />);
    // 列数是无法从 jsdom 布局观测的设计常量 → 以显式 DOM 契约声明（见 SPEC「DOM 契约」）
    const grid = document.querySelector("[data-grid-columns]")!;
    expect(grid.getAttribute("data-grid-columns")).toBe("6");
    expect(document.querySelectorAll("[data-grid-cell]").length).toBe(78);

    expect(screen.getByText("为「过去」选一张牌")).toBeInTheDocument();
    expect(screen.getByText("「猫咪想说」的起点")).toBeInTheDocument();
  });

  it("A3 棋盘填满：已选位变空坑，其余牌位排列顺序不变", () => {
    render(<SelectPage />);
    const before = cellOrder();
    expect(before).toHaveLength(78);

    pickCard(7);
    dismissOverlay();

    // 牌位总数不变，排列顺序逐个一致（不因选牌而位移）
    expect(cellOrder()).toEqual(before);
    // 该位已不是可选牌背，而是空坑
    expect(document.querySelector('[data-picked-hole="7"]')).not.toBeNull();
    expect(
      document.querySelector('[data-card-back="true"][data-index="7"]'),
    ).toBeNull();
  });

  it("A4 常驻紧凑槽位条：以填充/空位结构呈现进度，并随选牌推进", () => {
    render(<SelectPage />);
    expect(document.querySelector('[data-compact-slots="true"]')).not.toBeNull();
    expect(slotCounts()).toEqual({ filled: 0, empty: 3 });

    pickCard(7);
    dismissOverlay();

    expect(slotCounts()).toEqual({ filled: 1, empty: 2 });
    // 计数文案（SPEC 声明 exact copy 为「已选 k / N」；此处容忍空白差异）
    const text = document
      .querySelector('[data-compact-slots="true"]')!
      .textContent!.replace(/\s+/g, "");
    expect(text).toContain("已选1/3");
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

    act(() => {
      vi.advanceTimersByTime(FLIP_DURATION_MS);
    });
    expect(overlay()).not.toBeNull();

    // 在浮层作用域内断言（「过去」等文案在页面的紧凑槽位条里也存在）
    const modal = within(screen.getByTestId("card-modal-content"));
    expect(modal.getByText("过去")).toBeInTheDocument();
    expect(modal.getByText(tarotCards[7].name)).toBeInTheDocument();
    // 逆位为 30% 随机，故只断言二者必居其一
    expect(modal.getByText(/^(正位|逆位)$/)).toBeInTheDocument();
  });

  it("A7 三种收起方式均可关闭浮层，且全程不跳转", () => {
    render(<SelectPage />);

    // ① 点「继续」——唯一断言按钮文案的地方，用于钉住 actionLabel 契约
    pickCard(7);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "继续" }));
    });
    expect(overlay()).toBeNull();

    // ② 点浮层外（遮罩）
    pickCard(20);
    dismissOverlay();
    expect(overlay()).toBeNull();

    // ③ ESC
    pickCard(33);
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(overlay()).toBeNull();

    expect(pushMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("A7b 收起后状态推进：该位成空坑、紧凑槽位条前移", () => {
    render(<SelectPage />);
    pickCard(7);
    expect(document.querySelector('[data-picked-hole="7"]')).toBeNull(); // 揭示中尚未成坑

    dismissOverlay();
    expect(document.querySelector('[data-picked-hole="7"]')).not.toBeNull();
    expect(slotCounts()).toEqual({ filled: 1, empty: 2 });
    expect(screen.getByText("为「现在」选一张牌")).toBeInTheDocument();
  });

  it("A8 连续选满全程不跳转；选满后「完成选牌」→ /draw", () => {
    render(<SelectPage />);
    for (const idx of [7, 20, 33]) {
      pickCard(idx);
      dismissOverlay();
      expect(pushMock).not.toHaveBeenCalled();
    }

    expect(
      useTarotStore.getState().selectedSlots.map((s) => s?.cardIndex),
    ).toEqual([7, 20, 33]);
    expect(slotCounts()).toEqual({ filled: 3, empty: 0 });

    fireEvent.click(screen.getByRole("button", { name: /完成选牌/ }));
    expect(pushMock).toHaveBeenCalledWith("/draw");
  });

  it("A9 不可逆：页面上的按钮只有「关闭选牌」，已选空坑不可交互", () => {
    render(<SelectPage />);
    pickCard(7);
    dismissOverlay();

    // 正面断言：未选满时全页按钮集合恰为关闭按钮——
    // 任何形态的重选/撤销/清空入口都会出现在这个集合里并使断言失败
    expect(buttonLabels()).toEqual(["关闭选牌"]);

    // 已选位既非牌背，也不带任何交互语义
    const hole = document.querySelector('[data-picked-hole="7"]')!;
    expect(hole.getAttribute("role")).toBeNull();
    expect(hole.getAttribute("tabindex")).toBeNull();

    // 行为断言：点它不改变任何槽位
    const before = useTarotStore.getState().selectedSlots[0];
    fireEvent.click(hole);
    expect(useTarotStore.getState().selectedSlots[0]).toEqual(before);
  });

  it("A10 防误触：翻牌中与揭示中点击其他牌均无效", () => {
    render(<SelectPage />);
    const other = () =>
      document.querySelector('[data-card-back="true"][data-index="9"]')!;

    // ① 翻牌动画进行中（浮层尚未弹出）
    fireEvent.click(
      document.querySelector('[data-card-back="true"][data-index="7"]')!,
    );
    fireEvent.click(other());
    expect(useTarotStore.getState().selectedSlots[1]).toBeNull();
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);

    // ② 浮层已弹出：点其他牌同样无效，且浮层不被顶掉
    act(() => {
      vi.advanceTimersByTime(FLIP_DURATION_MS);
    });
    expect(overlay()).not.toBeNull();
    fireEvent.click(other());
    expect(useTarotStore.getState().selectedSlots[1]).toBeNull();
    expect(overlay()).not.toBeNull();
  });

  it("A11 退出 ≠ 放弃：关闭按钮回 /draw 且已选保留", () => {
    render(<SelectPage />);
    pickCard(7);
    dismissOverlay();
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
