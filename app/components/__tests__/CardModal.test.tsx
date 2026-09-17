import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardModal } from "@/app/components/CardModal";
import { tarotCards } from "@/lib/tarot-data";

describe("G7 CardModal 牌放大模态", () => {
  const card = tarotCards[0]; // 愚者

  it("显示牌图、牌名、牌位标注、正逆位与关键词", () => {
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("过去")).toBeInTheDocument(); // 牌位
    expect(screen.getByText("愚者")).toBeInTheDocument(); // 牌名
    expect(screen.getByText("正位")).toBeInTheDocument();
    expect(screen.getByText(/新开始/)).toBeInTheDocument(); // 关键词
  });

  it("逆位时标注逆位", () => {
    render(
      <CardModal
        card={card}
        position="未来"
        isReversed
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("逆位")).toBeInTheDocument();
  });

  it("点击遮罩触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="现在"
        isReversed={false}
        onClose={onClose}
      />,
    );
    // 遮罩层(模态最外层)点击 → 关闭
    fireEvent.click(screen.getByTestId("card-modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ESC 键触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="现在"
        isReversed={false}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("内容区点击不触发 onClose(防止误关)", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="现在"
        isReversed={false}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("card-modal-content"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// 规格 G17：选牌子页复用 CardModal 作为揭示浮层，需要一个「继续」主按钮。
// 该 prop 为可选——结果页不传，行为与 G7 完全一致（上方用例即回归保证）。
describe("G17 CardModal 的 actionLabel 主按钮", () => {
  const card = tarotCards[0];

  it("传入 actionLabel 时渲染该按钮，点击触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={onClose}
        actionLabel="继续"
      />,
    );
    fireEvent.click(screen.getByText("继续"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("不传 actionLabel 时不渲染任何主按钮（结果页行为不变）", () => {
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText("继续")).toBeNull();
  });
});
