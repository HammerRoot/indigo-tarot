import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ApiKeySettings } from "@/app/components/ApiKeySettings";

function openModal() {
  fireEvent.click(screen.getByTitle("API设置"));
}

describe("R1-D ApiKeySettings 掩码与记住开关", () => {
  it("默认掩码显示（type=password）", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByPlaceholderText("sk-...")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("切换显示明文", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    const input = screen.getByPlaceholderText("sk-...");
    fireEvent.click(screen.getByText("显示"));
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByText("隐藏"));
    expect(input).toHaveAttribute("type", "password");
  });

  it("保存回调携带 remember 值（默认 true）", () => {
    const onChange = vi.fn();
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={onChange} />);
    openModal();
    fireEvent.change(screen.getByPlaceholderText("sk-..."), {
      target: { value: "sk-x" },
    });
    fireEvent.click(screen.getByText("保存"));
    expect(onChange).toHaveBeenCalledWith("sk-x", true);
  });

  it("取消记住后保存携带 remember=false", () => {
    const onChange = vi.fn();
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={onChange} />);
    openModal();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByPlaceholderText("sk-..."), {
      target: { value: "sk-x" },
    });
    fireEvent.click(screen.getByText("保存"));
    expect(onChange).toHaveBeenCalledWith("sk-x", false);
  });

  it("清除回调", () => {
    const onChange = vi.fn();
    render(<ApiKeySettings currentApiKey="sk-1" onApiKeyChange={onChange} />);
    openModal();
    fireEvent.click(screen.getByText("清除"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("显示记住说明与加密边界文案", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByText(/记住/)).toBeInTheDocument();
    expect(screen.getByText(/静态窃取/)).toBeInTheDocument();
  });
});
