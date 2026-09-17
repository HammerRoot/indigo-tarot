# O6 — HTTP 下「记住 Key」勾选框静默失效（UI 未告知局限）

> **优先级**：🟠 橙级（可复现功能缺陷）｜**状态**：在飞（待对齐实现方案）

## 背景与根因

- 生产为 HTTP 明文直连，`crypto.subtle` 在非安全上下文（`http://<公网IP>`）不可用（决策 D10）。
- [`lib/apiKeyCrypto.ts`](../../lib/apiKeyCrypto.ts) 的 `generateSessionKey()` 在 `crypto.subtle === undefined` 时抛 `TypeError`，
  被 [`lib/store.ts`](../../lib/store.ts) `setApiKey` 的 `catch` 吞掉、`encryptedApiKey` 置 `null`。
- 后果：localStorage 从不存密文，Key 只活在内存里，**同一会话内刷新即丢**（比"关浏览器丢"更早）。
- **缺陷**：[`app/components/ApiKeySettings.tsx`](../../app/components/ApiKeySettings.tsx) 的「在本设备记住 Key（加密保存）」
  勾选框在 HTTP 下**照常显示且默认勾选**，无任何"当前环境不支持"提示——用户勾了、刷新 Key 没了，看起来像 bug。

## 验收标准

- [ ] 非安全上下文（`!window.isSecureContext`）下，勾选框禁用（或隐藏），并显示"当前为 HTTP 连接，无法记住 Key"类说明。
- [ ] 安全上下文（HTTPS / localhost）下行为不变：可勾选、刷新可恢复。
- [ ] 不改 `setApiKey` / `initApiKeyFromStorage` 的现有契约；加密/解密逻辑零改动。

## 测试计划

- 组件测试：mock `window.isSecureContext` 为 `false` → 断言勾选框禁用/隐藏 + 提示文案渲染；为 `true` → 断言可勾选。
- 现有测试全绿（不引入回归）。

## 影响范围

- 仅 [`app/components/ApiKeySettings.tsx`](../../app/components/ApiKeySettings.tsx)（+ 可能的测试文件）。
- 文档：README / DEPLOYMENT 中"HTTP 下记住失效"的措辞是根因说明，保留即可。

## 不在范围

- 上 HTTPS 恢复完整功能——已决策接受现状（决策 D10 / OPERATIONS.md 三、已知限制）。
