import { beforeEach, describe, expect, it } from "vitest";
import { useTarotStore } from "@/lib/store";
import {
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from "@/lib/apiKeyCrypto";

const SESSION_KEY_NAME = "tarot-session-key";

describe("R1-B/C store API Key 加密存储", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useTarotStore.setState({ apiKey: "", encryptedApiKey: null });
  });

  it("setApiKey 后 localStorage 无明文、含 encryptedApiKey", async () => {
    await useTarotStore.getState().setApiKey("sk-secret");
    const raw = localStorage.getItem("tarot-store");
    expect(raw).not.toContain("sk-secret");
    expect(raw).toContain("encryptedApiKey");
  });

  it("会话恢复：sessionStorage 密钥 + 密文 → initApiKeyFromStorage true", async () => {
    const b64 = await generateSessionKey();
    const key = await importSessionKey(b64);
    const encrypted = await encryptApiKey("sk-persist", key);
    sessionStorage.setItem(SESSION_KEY_NAME, b64);
    useTarotStore.setState({ encryptedApiKey: encrypted });

    const ok = await useTarotStore.getState().initApiKeyFromStorage();
    expect(ok).toBe(true);
    expect(useTarotStore.getState().apiKey).toBe("sk-persist");
  });

  it("会话密钥缺失 → false 且清空密文", async () => {
    useTarotStore.setState({ encryptedApiKey: "some-ciphertext" });
    const ok = await useTarotStore.getState().initApiKeyFromStorage();
    expect(ok).toBe(false);
    expect(useTarotStore.getState().encryptedApiKey).toBeNull();
  });

  it("关闭记住开关 → encryptedApiKey 为 null", async () => {
    await useTarotStore.getState().setApiKey("sk-x", false);
    expect(useTarotStore.getState().encryptedApiKey).toBeNull();
  });

  it("旧版明文 apiKey 字段被 merge 丢弃（不进入内存态）", () => {
    // 模拟旧版本持久化数据：{ state: { readings: [], apiKey: "sk-legacy" } }
    localStorage.setItem(
      "tarot-store",
      JSON.stringify({ state: { readings: [], apiKey: "sk-legacy" }, version: 0 }),
    );
    // 触发重新 hydrate
    useTarotStore.persist.rehydrate();
    expect(useTarotStore.getState().apiKey).toBe("");
  });
});
