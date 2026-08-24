import { NextRequest, NextResponse } from "next/server";
import { getTrialGuard } from "@/lib/server/trial";

// 免费试用状态查询（规格 R3）：
// 页面加载时向服务端同步"试用是否已用"，服务端为权威（客户端 trialUsed 仅作缓存）。
// 修复：刷新/重开页面后不再错误显示"可用 1 次"。
export async function GET(request: NextRequest) {
  const deviceId =
    request.headers.get("x-device-id") ||
    request.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json(
      {
        error: "缺少设备标识",
        message: "无法识别设备，请刷新页面重试",
      },
      { status: 400 },
    );
  }

  try {
    const result = await getTrialGuard().check(deviceId);
    return NextResponse.json({
      trialUsed: result.trialUsed,
      remaining: result.allowed ? 1 : 0,
    });
  } catch (error) {
    console.error("试用状态查询失败:", error);
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 },
    );
  }
}
