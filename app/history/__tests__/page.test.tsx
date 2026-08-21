import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HistoryPage from "@/app/history/page";
import { tarotCards } from "@/lib/tarot-data";

function makeReading(id: string, question: string, interpretation: string) {
  return {
    id,
    question,
    spread: {
      id: "single-card",
      name: "单张牌指引",
      description: "d",
      cardCount: 1,
      positions: ["核心指引"],
      category: [],
    },
    cards: [tarotCards[0]],
    cardReversals: [true],
    interpretation,
    advice: "核心建议内容",
    timestamp: new Date("2026-01-01T10:00:00+08:00"),
  };
}

describe("Y1 /history 历史记录页", () => {
  beforeEach(() => {
    useTarotStore.setState({ readings: [] });
  });

  it("渲染记录列表：问题、牌阵名、牌名(逆)、时间", () => {
    useTarotStore.setState({
      readings: [makeReading("r1", "我的事业问题", "解析一")],
    });
    render(<HistoryPage />);
    expect(screen.getByText("我的事业问题")).toBeInTheDocument();
    expect(screen.getByText("单张牌指引")).toBeInTheDocument();
    expect(screen.getByText(/愚者/)).toBeInTheDocument(); // 牌名含(逆)
    expect(screen.getByText(/逆/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/1\/1/)).toBeInTheDocument();
  });

  it("展开详情：完整 AI 解析与核心建议可见", () => {
    useTarotStore.setState({
      readings: [makeReading("r1", "问题A", "完整的解析正文内容")],
    });
    render(<HistoryPage />);
    // 默认收起，详情不可见
    expect(screen.queryByText("完整的解析正文内容")).toBeNull();
    fireEvent.click(screen.getByText("问题A"));
    expect(screen.getByText("完整的解析正文内容")).toBeInTheDocument();
    expect(screen.getByText("核心建议内容")).toBeInTheDocument();
  });

  it("删除记录：confirm 确认后 removeReading", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    useTarotStore.setState({
      readings: [
        makeReading("r1", "问题A", "解析一"),
        makeReading("r2", "问题B", "解析二"),
      ],
    });
    render(<HistoryPage />);
    const deleteButtons = screen.getAllByRole("button", { name: /删除/ });
    fireEvent.click(deleteButtons[0]);
    expect(useTarotStore.getState().readings.length).toBe(1);
    expect(useTarotStore.getState().readings[0].id).toBe("r2");
    confirmSpy.mockRestore();
  });

  it("空状态提示", () => {
    render(<HistoryPage />);
    expect(screen.getByText(/暂无占卜记录/)).toBeInTheDocument();
  });
});
