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

  it("说明文案更新：免费试用 1 次（每个设备仅一次），无旧的 3小时/5次 表述", () => {
    render(<ApiKeySettings currentApiKey="" onApiKeyChange={vi.fn()} />);
    openModal();
    expect(screen.getByText(/免费试用 1 次（每个设备仅一次）/)).toBeInTheDocument();
    expect(screen.getByText(/使用系统密钥（免费试用 1 次）/)).toBeInTheDocument();
    expect(screen.queryByText(/3小时/)).toBeNull();
    expect(screen.queryByText(/5次/)).toBeNull();
  });

  it("受控 open + notice：外部打开时显示弹窗与提示", () => {
    render(
      <ApiKeySettings
        currentApiKey=""
        onApiKeyChange={vi.fn()}
        open={true}
        onOpenChange={vi.fn()}
        notice="免费试用次数已用完"
      />,
    );
    expect(screen.getByText("API 设置")).toBeInTheDocument();
    expect(screen.getByText("免费试用次数已用完")).toBeInTheDocument();
  });

  it("受控 open 关闭：点击遮罩触发 onOpenChange(false)", () => {
    const onOpenChange = vi.fn();
    render(
      <ApiKeySettings
        currentApiKey=""
        onApiKeyChange={vi.fn()}
        open={true}
        onOpenChange={onOpenChange}
      />,
    );
    // 背景遮罩是弹窗外层的 fixed 遮罩，点击它关闭
    const overlay = document.querySelector(".fixed.inset-0");
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
