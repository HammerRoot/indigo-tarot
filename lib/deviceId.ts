// 设备标识（规格 R3）：无登录系统下免费试用的用户识别。
// 非敏感数据，明文存 localStorage；清除后生成新 id（尽力而为，见决策 D9）。

const DEVICE_ID_KEY = "tarot-device-id";

export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
