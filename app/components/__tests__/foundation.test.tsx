import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Geist } from "next/font/google";

describe("F0 冒烟测试：jsdom + React Testing Library 可用", () => {
  it("RTL 渲染并断言文本", () => {
    render(<div>hello vitest</div>);
    expect(screen.getByText("hello vitest")).toBeInTheDocument();
  });

  it("setup 中 next/font/google mock 生效（layout 可测）", () => {
    // 贴近 layout.tsx 的真实用法；Geist 来自 setup 中的 vi.mock，不应触发网络请求
    const font = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
    expect(font.variable).toBe("--font-geist-sans");
  });
});
