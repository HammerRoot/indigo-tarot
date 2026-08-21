import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useTarotStore } from "@/lib/store";
import {
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from "@/lib/apiKeyCrypto";

const { routerPushMock } = vi.hoisted(() => ({ routerPushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

import Home from "@/app/page";

describe("首页：免费试用用完时的弹窗引导", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useTarotStore.setState({
      trialUsed: true,
      apiKey: "",
      encryptedApiKey: null,
      question: "",
      recommendedSpread: null,
      drawnCards: [],
      cardReversals: [],
    });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ questions: ["测试问题一"] }), {
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
  });

  it("试用已用完且未填个人 Key → 提交时弹出 API 设置并提示，不跳转", async () => {
    render(<Home />);
    await act(async () => {
      await Promise.resolve();
    });

    const input = screen.getByLabelText("你的问题");
    fireEvent.change(input, { target: { value: "我的测试问题" } });
    fireEvent.click(screen.getByText("开始占卜"));

    expect(screen.getByText(/免费试用次数已用完/)).toBeInTheDocument();
    expect(screen.getByText("API 设置")).toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("试用已用完但已通过加密存储恢复个人 Key → 不弹窗", async () => {
    const b64 = await generateSessionKey();
    const key = await importSessionKey(b64);
    const encrypted = await encryptApiKey("sk-personal", key);
    sessionStorage.setItem("tarot-session-key", b64);
    useTarotStore.setState({
      encryptedApiKey: encrypted,
      apiKey: "",
      trialUsed: true,
    });

    render(<Home />);
    // 等待 useEffect 的 initApiKeyFromStorage 恢复 Key
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    fireEvent.change(screen.getByLabelText("你的问题"), {
      target: { value: "我的测试问题" },
    });
    fireEvent.click(screen.getByText("开始占卜"));

    expect(screen.queryByText(/免费试用次数已用完/)).toBeNull();
  });
});
