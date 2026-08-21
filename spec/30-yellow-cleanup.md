# 🟡 黄级：清理 / 文档 / 小功能（Y1–Y7）

> 黄级条目为代码清理、文档修正与小功能。执行顺序注意：**Y1（历史记录）先于 Y2（死代码清理）**，避免误删 readings 相关代码；Y7 与 R3 共享模块合并实施。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| Y1 | 实现最小版历史记录页 | 小功能 | ⬜ 待开发 |
| Y2 | 死代码清理 | 重构 | ⬜ 待开发 |
| Y3 | README 更新 | 文档 | ⬜ 待开发 |
| Y4 | layout metadata 定制 | 文档 | ⬜ 待开发 |
| Y5 | API Key 双份存储统一 | 重构 | ✅ 已并入 R1 |
| Y6 | 图片目录整理 + 数据完整性测试 | 重构 | ⬜ 待开发 |
| Y7 | 路由重复逻辑抽取 | 重构 | ✅ 核心完成（共享模块随 R3 落地；Y2 删除路由后收尾） |

---

## [Y1] 实现最小版历史记录页

- **优先级**: 🟡
- **类别**: 小功能
- **状态**: ⬜ 待开发

### 问题描述

- 现状：README（L86–87、L132–135）宣传"历史记录"功能；`lib/store.ts` 已有骨架——`TarotReading` 类型（L16–25）、`readings` / `addReading` / `removeReading`（L54–56、147–153）、`partialize`（L177）已持久化 readings——但**没有任何调用方与 UI**：`addReading` 从未被调用，也没有历史页面。功能名存实亡。
- 影响：宣传与实现不符；用户占卜记录无法回看。

### 目标

占卜完成后自动保存记录；新增 `/history` 页面支持查看详情与删除（上限 50 条，localStorage 持久化，刷新不丢）。

### 验收标准

- [ ] 结果页流式完成后自动 `addReading`（字段：question、spread、cards、cardReversals、interpretation 完整内容、advice 核心建议、timestamp）
- [ ] `/history` 页面按时间倒序列出记录：问题、牌阵名、牌名列表（含逆位标记）、时间
- [ ] 记录可展开查看完整 AI 解析（`MarkdownRenderer` 渲染）与核心建议
- [ ] 记录可删除（确认后 `removeReading`）
- [ ] 空状态有提示文案；首页与结果页有"历史记录"入口
- [ ] 刷新页面记录仍在（localStorage）
- [ ] 流式失败/未完成时**不**保存记录

### 技术方案

1. **结果页保存**（`app/result/page.tsx`）：`onComplete`（L102–105）内追加：

   ```ts
   addReading({
     id: crypto.randomUUID(),
     question,
     spread: recommendedSpread,
     cards: drawnCards,
     cardReversals,
     interpretation: contentRef.current, // 完整累计内容
     advice: coreAdvice || "正在生成核心建议...",
     timestamp: new Date(),
   });
   ```

   从 store 解构 `addReading`；用 ref 保存完整 content（O3 重构后已有 `contentRef` 或直接取自 `streamingContent` 的最终值）。
   保护条件：`contentRef.current` 为空或 `streamComplete` 为 false 时跳过。

2. **历史页面**（新增 `app/history/page.tsx`，"use client"）：
   - 读 `useTarotStore((s) => s.readings)`；
   - 列表卡片：问题（截断）、牌阵名、牌名摘要（`card.name` + `(逆)`）、时间（`toLocaleString("zh-CN")`）；
   - 展开：`MarkdownRenderer` 渲染 `interpretation` + 核心建议块；
   - 删除：`confirm()` 后 `removeReading(id)`；
   - 空状态："暂无占卜记录"；顶部返回按钮。

3. **入口**：结果页底部加"历史记录"按钮（`router.push("/history")`）；首页"📚 历史记录"从纯展示改为可点击入口。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/store.test.ts` | addReading 头部插入 | 依次添加 2 条 → `readings[0]` 为最新 |
| | 上限 50 条 | 添加 55 条 → 长度 50 且保留最新 50 条 |
| | removeReading 删除 | 按 id 删除后记录不存在 |
| `app/history/__tests__/page.test.tsx` | 渲染记录列表 | `useTarotStore.setState` 注入记录 → 断言问题文本渲染 |
| | 展开详情 | 点击展开 → 解析内容可见 |
| | 删除记录 | mock `confirm` 返回 true，点击删除 → readings 长度减 1 |
| | 空状态 | 无记录 → 空状态文案可见 |
| `app/result/__tests__/page.test.tsx` | 完成后保存 | mock `generateTarotReadingStream` 触发 `onComplete` → `addReading` 被调用且字段完整 |
| | 失败不保存 | 触发 `onError` → `addReading` 未被调用 |

### 影响范围

- 新增：`app/history/page.tsx`
- 修改：`app/result/page.tsx`（onComplete 保存 + 入口按钮）、`app/page.tsx`（历史记录入口）

### 风险与假设

- 假设：localStorage 容量可容纳 50 条 × 完整解析文本（估算单条约 2–8KB，总量 ~400KB，可接受）。
- 风险：`crypto.randomUUID()` 需现代浏览器（提供 fallback：`Date.now() + Math.random()` 字符串）。
- 备注：`resetSession` 不清 readings（现状如此，符合预期）。

---

## [Y2] 死代码清理

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ⬜ 待开发
- **关联条目**: Y1（readings 保留）、Y3（README 同步）、R3/Y7（路由重写时一并处理）

### 问题描述

- 现状（均为无调用方代码）：
  - `lib/deepseek.ts` L23–53 `callDeepSeek`、L179–236 `generateTarotReading`（非流式；页面只用 `generateTarotReadingStream` L64–176）；
  - `app/api/deepseek/route.ts` 整文件（非流式接口，无调用方）；
  - `lib/useImagePreloader.ts` 整文件（无引用）；
  - `lib/store.ts` 中 `currentReading` / `setCurrentReading`（L50–51、128、145、164，无调用方；`readings` 系列因 Y1 保留）。
- 影响：维护面扩大，改动时容易被"死代码"误导。

### 目标

删除全部无引用代码；类型检查、lint、测试、构建全绿。

### 验收标准

- [ ] grep 确认无残留引用（`callDeepSeek`、`generateTarotReading`（非流式）、`useImagePreloader`、`currentReading`）
- [ ] `npm run type-check`、`npm run lint`、`npm run test:run` 全绿
- [ ] `npm run build` 通过

### 技术方案

1. 删除文件：`app/api/deepseek/route.ts`、`lib/useImagePreloader.ts`。
2. 修改 `lib/deepseek.ts`：删除 `callDeepSeek`、`generateTarotReading` 及仅它们使用的类型（`DeepSeekResponse` 若无引用一并清理），保留流式路径与 `StreamCallbacks`。
3. 修改 `lib/store.ts`：删除 `currentReading` / `setCurrentReading`（接口、初始值、实现、`resetSession` 中的相关行）。
4. 若 Y2 先于 R3/Y7 执行，`/api/deepseek` 的限流逻辑随文件删除；R3 只重写 stream 路由。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| 全量现有测试 | 全部通过 | type-check / lint / test:run 三绿（行为不变，编译守护） |
| `tests/no-dead-code.test.ts`（可选） | 无残留引用 | 读源码 grep `callDeepSeek|useImagePreloader|currentReading`，断言无匹配（`/api/deepseek` 文件已删） |

### 影响范围

- 删除：`app/api/deepseek/route.ts`、`lib/useImagePreloader.ts`
- 修改：`lib/deepseek.ts`、`lib/store.ts`、`README.md`（随 Y3 删除该接口文档）

### 风险与假设

- 假设：`generateTarotReadingStream` 不依赖被删函数（已确认独立）。
- 风险：低；删除前 grep 复核。

---

## [Y3] README 更新

- **优先级**: 🟡
- **类别**: 文档
- **状态**: ⬜ 待开发

### 问题描述

- 现状：README 多处与代码事实不符——
  - L14 技术栈写 "Next.js 14"（实际 16.1.6 + React 19.2.3）；
  - L107–129 API 文档写 `POST /api/deepseek` 请求体 `{question, cards, layout}`（实际 `{prompt, userApiKey}`，且主接口为流式 `/api/deepseek-stream`）；
  - L69–77 写"每次 git push 前自动运行检查"（提交 46c41ae 已改为 **commit 时**，`.husky/pre-commit` 跑 `npm run pre-commit` = type-check + lint）；
  - 功能列表含"历史记录"（Y1 完成后变为已实现，需同步描述）。
- 影响：新开发者按文档配置会踩坑。

### 目标

README 与代码事实一致。

### 验收标准

- [ ] 技术栈版本准确（Next.js 16、React 19、Tailwind 4、Zustand、Vitest）
- [ ] API 文档准确：`/api/deepseek-stream`（流式 SSE）、`/api/suggested-questions`；删除 `/api/deepseek`（Y2）
- [ ] Git hooks 时机为 commit；新增测试命令（`npm test` / `test:run`）
- [ ] 功能列表含历史记录（Y1）；env 变量表：`DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`（可选）、`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（可选，R3/G3）
- [ ] 隐私章节补充 localStorage Key 风险说明（R1）与 CSP 说明

### 技术方案

按验收清单逐节重写 README 对应章节。

### TDD 测试计划

文档类条目：无自动化测试，以验收清单手工核对。

### 影响范围

- 修改：`README.md`

### 风险与假设

- 无。

---

## [Y4] layout metadata 定制

- **优先级**: 🟡
- **类别**: 文档（站点元信息）
- **状态**: ⬜ 待开发

### 问题描述

- 现状：`app/layout.tsx` L15–18 仍为 create-next-app 默认 `title: "Create Next App"`、`description: "Generated by create next app"`；L26 `<html lang="en">`。
- 影响：浏览器标签页与搜索引擎展示错误；中文应用声明英文语言。

### 目标

中文品牌标题/描述；`lang="zh-CN"`。

### 验收标准

- [ ] `metadata.title` / `metadata.description` 为中文品牌文案
- [ ] `<html lang="zh-CN">`
- [ ] 浏览器标签页显示中文标题

### 技术方案

`app/layout.tsx`：

```ts
export const metadata: Metadata = {
  title: "神秘塔罗 - AI 塔罗占卜",
  description: "基于 AI 的塔罗占卜应用：智能牌阵推荐、流畅抽牌体验与深度解析。",
};
// ...
<html lang="zh-CN">
```

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/__tests__/layout.test.tsx` | metadata 正确 | `import { metadata }` 断言 title 含"神秘塔罗"、description 非空 |
| | lang 属性 | `renderToStaticMarkup(<RootLayout><div/></RootLayout>)` 断言含 `<html lang="zh-CN"`（依赖 F0 的 `next/font/google` mock） |

### 影响范围

- 修改：`app/layout.tsx`

### 风险与假设

- 假设：RootLayout 测试可通过 mock `next/font/google` 与 `globals.css` 导入（vitest 对 CSS 导入默认空实现）正常渲染。

---

## [Y5] API Key 双份存储统一（已并入 R1）

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ✅ 已并入 R1

### 说明

R1 已重写为「API Key 安全加固」综合条目（`spec/10-red-security.md`），本条目内容（删除 `deepseek_api_key` 双份存储、Key 走 store 单一来源）纳入其 **C 层（收窄暴露面）**，不再单独实施。实施时以 R1 为准。

原方案摘要（供 R1-C 参考）：
- 现状：API Key 同时存在于 store persist（localStorage `tarot-store`，`lib/store.ts` L177）与 `app/page.tsx` 手写的 `deepseek_api_key`（L34–40 读取、L79–87 写入/删除）——两份状态需手动同步，易漂移。
- 方案：`app/page.tsx` 删除 L34–40 的 `localStorage.getItem("deepseek_api_key")` 与 L79–87 的 `setItem/removeItem`，全部走 store；初始值从 store 读取。

> 注意：R1-B 加密改造后，store 持久化字段为 `encryptedApiKey`（密文），不再是明文 `apiKey`——Y5 的"persist 持久化 Key"表述在 R1 中已更新。旧版本 localStorage 中残留的明文 `apiKey` 字段由 R1 的初始化逻辑清理（见 R1-B 旧数据迁移说明）。

---

## [Y6] 图片目录整理 + 数据完整性测试

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ⬜ 待开发

### 问题描述

- 现状：56 张小阿卡纳图片全部放在 `public/tarot-images/major/`（命名 `Cups01.jpg`、`Pents14.jpg` 等，且 Pentacles 缩写为 Pents）；`major-11-Justice.jpg` 大小写不统一（`lib/tarot-data.ts` L185 引用路径同样大写）；目录结构与数据声明的 arcana/suit 脱节。
- 影响：目录语义混乱；后续新增牌面易放错位置；无任何校验防止数据与文件脱节。

### 目标

目录按 arcana/suit 组织、命名统一 kebab-case；新增完整性测试守护 78 张牌数据与图片路径（目录契约 + 存在性）。

### 验收标准

- [ ] 大阿卡纳 22 张位于 `public/tarot-images/major/`，命名 kebab-case 全小写（含 `major-11-justice.jpg`）
- [ ] 小阿卡纳 56 张位于 `public/tarot-images/minor/<suit>/`（如 `minor/wands/wands-01.jpg` … `minor/pentacles/pentacles-14.jpg`）
- [ ] `lib/tarot-data.ts` 全部 `image` 路径与磁盘实际一致
- [ ] 完整性测试绿：78 张、id/name 唯一、大 22 / 小 56、四花色各 14、目录契约、路径存在

### 技术方案

1. **先写完整性测试**（红：当前 minor 卡全部在 `major/`，目录契约必然失败）→ 再执行文件移动（绿）。
2. 文件移动用 `git mv`（保留历史）：
   - `major-11-Justice.jpg` → `major-11-justice.jpg`；
   - 56 张小阿卡纳：`CupsNN.jpg` → `minor/cups/cups-NN.jpg`，`WandsNN` → `minor/wands/wands-NN`，`SwordsNN` → `minor/swords/swords-NN`，`PentsNN` → `minor/pentacles/pentacles-NN`。
3. 更新 `lib/tarot-data.ts` 中 57 处 `image` 路径。
4. 新增 `lib/__tests__/tarot-data.integrity.test.ts`：断言目录契约（`major` 卡路径以 `/tarot-images/major/` 开头；`minor` 卡以 `/tarot-images/minor/` 开头）与 `fs.existsSync` 文件存在。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/tarot-data.integrity.test.ts` | 牌数 | `tarotCards.length === 78` |
| | id/name 唯一 | id 与 name 各自 Set 大小均为 78 |
| | arcana 数量 | major 22 / minor 56；四花色各 14 |
| | 目录契约 | major 卡路径以 `/tarot-images/major/` 开头；minor 卡以 `/tarot-images/minor/` 开头（**红→绿 核心**） |
| | 图片存在 | 每张牌 `fs.existsSync(public + image)` 为 true |

### 影响范围

- 移动：57 个图片文件（`git mv`）
- 修改：`lib/tarot-data.ts`（57 处路径）
- 新增：`lib/__tests__/tarot-data.integrity.test.ts`

### 风险与假设

- 假设：`git mv` 保留历史可追溯；`public/` 静态资源移动无运行时风险（路径在数据中同步更新）。
- 风险：遗漏某处路径会导致完整性测试红——这正是测试的价值。
- 备选方案（若不愿大搬家）：仅统一 `major-11-Justice.jpg` 大小写 + 按现状目录规则收紧契约测试——本规格采用全量整理。

---

## [Y7] 路由重复逻辑抽取

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ⬜ 待开发
- **关联条目**: R3（共享模块，同批文件）、Y2（删除 /api/deepseek）

### 问题描述

- 现状：`/api/deepseek` 与 `/api/deepseek-stream` 两份几乎相同的代码（IP 提取、key 解析、限流计数、DeepSeek fetch、错误处理）各自复制一份，后续修一处漏一处（R3 已证实）。
- 影响：维护成本翻倍、修复不同步。

### 目标

共享模块唯一实现，路由变薄。

### 技术方案

与 R3 合并实施（同一批文件）：`lib/server/rate-limit.ts`（限流）、`lib/server/deepseek.ts`（resolveApiKey + chatCompletion）；两个路由改为组合调用。
注意：Y2 删除 `/api/deepseek` 后，剩余 stream 路由仍使用共享模块（同样受益——key 解析与限流收敛为单点）。
若 Y2 已先行删除 `/api/deepseek`，本条目只剩"stream 路由使用共享模块"一项，工作量并入 R3。

### TDD 测试计划

并入 R3 测试表（`lib/server/__tests__/*` 与 `app/api/__tests__/deepseek-stream.route.test.ts`）。

### 影响范围

同 R3。

### 风险与假设

同 R3。
