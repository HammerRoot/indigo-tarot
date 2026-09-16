# indigo-tarot 规格文档（SDD + TDD）

> 本目录是项目的**规格驱动开发（SDD）+ 测试驱动开发（TDD）**依据。所有修复与优化先在此定义验收标准与测试计划，再进入开发。
>
> 规格随代码库版本管理；每完成一个条目，请更新对应文档中的**条目状态**。

## 目录导航

| 文件 | 内容 |
|---|---|
| [`template.md`](./template.md) | 规格条目模板（新增条目时复制） |
| [`00-foundation-testing.md`](./00-foundation-testing.md) | **F0** 测试基础设施（Vitest + RTL，TDD 前提，最先做） |
| [`10-red-security.md`](./10-red-security.md) | 🔴 红级：安全修复 R1–R4 |
| [`20-orange-functional.md`](./20-orange-functional.md) | 🟠 橙级：功能缺陷 O1–O5 |
| [`30-yellow-cleanup.md`](./30-yellow-cleanup.md) | 🟡 黄级：清理/文档/小功能 Y1–Y7 |
| [`40-green-improvements.md`](./40-green-improvements.md) | 🟢 绿级：质量提升 G1–G12（G8–G12 详细条目见 draw-interaction.md） |
| [`draw-interaction.md`](./draw-interaction.md) | 🟢 抽牌交互模块：G8–G13（选牌情况页 + 选牌子页 + 结果页优化 + 结论先行 + 免责声明） |

## 优先级总览

| 编号 | 标题 | 优先级 | 类别 | 状态 |
|---|---|---|---|---|
| F0 | 测试基础设施（Vitest + RTL） | 🔴 前置 | 基础设施 | ✅ 完成 |
| R1 | API Key 安全加固（XSS 消毒 + 加密存储 + 纵深防御） | 🔴 | 安全 | ✅ 完成 |
| R3 | 系统 Key 保护：免费试用一次 + 限流加固 | 🔴 | 安全 | ✅ 完成 |
| R4 | 移除模块级 setInterval | 🔴 | 安全 | ✅ 完成 |
| O1 | 结果页动态 grid 类名失效 | 🟠 | 功能缺陷 | ✅ 完成 |
| O2 | draw/result 页 mystical-* 类不生效 | 🟠 | 功能缺陷 | ✅ 完成 |
| O3 | 结果页 setState-in-updater 反模式 + AI 输出容错解析 | 🟠 | 功能缺陷 | ✅ 完成 |
| O4 | 洗牌算法有偏 | 🟠 | 功能缺陷 | ✅ 完成 |
| O5 | SSE Content-Type 错误 | 🟠 | 功能缺陷 | ✅ 完成 |
| Y1 | 实现最小版历史记录页 | 🟡 | 小功能 | ✅ 完成 |
| Y2 | 死代码清理 | 🟡 | 重构 | ✅ 完成 |
| Y3 | README 更新 | 🟡 | 文档 | ✅ 完成 |
| Y4 | layout metadata 定制 | 🟡 | 文档 | ✅ 完成 |
| Y5 | API Key 双份存储统一 | 🟡 | 重构 | ✅ 已并入 R1 |
| Y6 | 图片目录整理 + 数据完整性测试 | 🟡 | 重构 | ✅ 完成 |
| Y7 | 路由重复逻辑抽取 | 🟡 | 重构 | ✅ 核心完成（共享模块随 R3 落地） |
| Y8 | 历史页展开区去重 + 核心建议高亮 | 🟡 | 小功能/视觉 | ✅ 完成 |
| Y9 | 历史页展开区收尾：核心建议去分隔线 + 摘要区嵌套按钮修复 | 🟡 | 小功能/重构 | ✅ 完成 |
| G1 | 牌阵推荐逻辑增强（评分制） | 🟢 | 质量提升 | ✅ 完成 |
| G2 | AI 解析健壮性（降级提取 + prompt 加固） | 🟢 | 质量提升 | ✅ 完成 |
| G3 | .env.example 与部署文档 | 🟢 | 文档 | ✅ 完成 |
| G4 | 收尾：依赖审计、分支处置、可选 CI | 🟢 | 质量提升 | ✅ 完成（CI 经评估不加） |
| G5 | 每日熔断配额 + 管理开关接口 | 🟢 | 质量提升（成本控制） | ✅ 完成 |
| G6 | 牌桌抽牌体验升级（78 张铺开 + 缩放 + 盲选抽取） | 🟢 | 质量提升（交互） | ✅ 完成（旧扇形/缩放流程，已被 G9/G10 取代） |
| G7 | 结果页 UI 视觉升级（深邃夜空风） | 🟢 | 质量提升（视觉） | ✅ 完成 |
| G8 | 抽牌交互模块重做（点击即选 + 原位翻牌 + 飞入槽位 + 多轮循环） | 🟢 | 质量提升（交互） | ✅ 完成 |
| G9 | 选牌改为平铺网格（移除扇形/旋转/缩放，减去已选牌） | 🟢 | 质量提升（交互） | ✅ 完成（网格移至 /draw/select 子页；13×6 已由 G11 改一行 8 张） |
| G10 | 选牌拆分为「选牌情况页」与「选牌子页」 | 🟢 | 质量提升（交互） | ✅ 完成 |
| G11 | 选牌/结果展示优化（select 一行 8 张；核心建议前置；结果页排版+位置标注） | 🟢 | 质量提升（交互/视觉） | ✅ 完成 |
| G12 | 核心建议结论先行（prompt 顺序 + 解析顺序无关） | 🟢 | 质量提升（AI 输出结构） | ✅ 完成 |
| G13 | 结果页末尾 AI 免责声明 + 牌背图案恢复 | 🟢 | 质量提升（视觉/合规） | ✅ 完成 |

## SDD + TDD 工作流

### 1. 规格先行（SDD）

- 每个条目在对应编号文档中定义：问题描述（含 `文件:行`）、目标、**验收标准**、**技术方案**、**TDD 测试计划**、影响范围、风险与假设。
- 规格未冻结前不写实现代码。

### 2. 逐条开发循环（TDD）

对每个条目执行红 → 绿 → 重构：

1. **Red**：按该条目"TDD 测试计划"编写失败测试，运行确认**失败**（红）；
2. **Green**：按"技术方案"做**最小实现**，直至该条目测试通过（绿）；
3. **Refactor**：清理实现（去重、命名、抽函数），确保 `npm run type-check`、`npm run lint`、`npm run test:run` 全绿；
4. 更新条目状态：`🔴 红` → `🟢 绿` → `✅ 完成`，并同步本表。

### 3. 完成定义（DoD）

- 条目全部测试通过；
- `npm run type-check`、`npm run lint`、`npm run test:run` 三绿；
- 验收标准中手工项已核对；
- 条目状态已更新。

## 执行顺序与依赖

```
F0（测试设施，先行）
  → 🔴 R1（综合：XSS 消毒 + 加密存储 + 掩码/CSP + 双份存储统一）→ R3（+R4 合并）→ R4
  → 🟠 O1 → O2 → O3 → O4 → O5
  → 🟡 Y1（先于 Y2）→ Y2 → Y3 → Y4 → Y6 → Y7（与 R3 合并）
  → 🟢 G1 → G2 → G3 → G5（成本控制）
  → 🟢 G6 → G7（交互/视觉）
  → 🟢 G8 → G9 → G10 → G11 → G12 → G13（抽牌交互模块重做，详见 draw-interaction.md）
  → 🟢 G14（腾讯云迁移：ioredis + deviceId 兼容 HTTP）
  → 🟢 G4（收尾：依赖审计、分支处置、可选 CI）
```

> **全部条目已完成**，无待开发项。

> G8–G13 的详细条目见 [`draw-interaction.md`](./draw-interaction.md)；G14 见 [`40-green-improvements.md`](./40-green-improvements.md)。Y8/Y9 为 Y1 历史记录页的后续修复，随该页迭代完成。

依赖关系：

- **F0** 是所有条目测试的执行前提；
- **R1** 为「API Key 安全加固」综合条目：A 消除 XSS（原 R1）、B 加密存储（新增）、C 收窄暴露面（原 Y5）、D 掩码 + CSP + 文档（原 R2）；
- **R3** 为「系统 Key 保护：免费试用一次 + 限流加固」：deviceId 试用（trial.ts）+ 跨实例限流（rate-limit.ts）+ 共享模块（deepseek.ts）同批实施；
- **R3 ↔ Y7**：共享模块（`lib/server/rate-limit.ts`、`lib/server/deepseek.ts`）同批文件，一起实施；
- **R4** 随 R3 在 rate-limit 模块内实现惰性清理；
- **Y1 先于 Y2**：避免误删 readings 相关代码；
- **Y2** 删除 `/api/deepseek` 后，R3/Y7 只作用于 stream 路由；
- **Y3** 与 R1（README 风险说明）、Y1/Y2/G3 内容联动；
- **G2** 依赖 O3 产出的 `parseStreamContent`。

## 决策记录（Assumptions & Decisions）

| 编号 | 决策 | 理由 |
|---|---|---|
| D1 | 规格文档随仓库提交（`spec/` 不入 `.gitignore`） | 文档与代码同版本，改动可对照 |
| D2 | API Key 使用 **AES-GCM 加密存储**：密文存 localStorage，随机会话密钥（base64）存 sessionStorage；同一会话刷新自动解密、关闭浏览器后需重输 | 浏览器无系统级安全存储；该方案为"真加密防静态窃取"且零主密码 UX 负担 |
| D3 | R3 生产推荐自建 Redis（ioredis，见 D11）；未配置时回退内存实现 | 零配置可用；跨实例限流为生产增强 |
| D4 | O2 采用"样式移到 `globals.css`"而非逐页 CSS Module | 与 main 分支现状一致；`feature/less-modules` 分支方向因此废弃，该分支已于 **2026-09-16 删除**（最后提交 `3e40e49`） |
| D5 | 测试统一使用 Vitest 生态（jsdom），不引入 MSW | mock 全局 fetch 已满足路由测试需求 |
| D6 | Y1 历史记录采用最小实现（列表 + 详情 + 删除） | 与 store 现有骨架匹配，避免过度设计 |
| D7 | R1-A 主方案 `react-markdown`（默认转义、无 dangerouslySetInnerHTML）；备选 DOMPurify 仅在主方案依赖冲突时启用 | 白名单解析优于黑名单消毒 |
| D8 | 加密的边界：**不防 XSS 与会话期扩展读取**（解密在客户端进行）；主密码 PBKDF2 派生与服务端托管 Key 记为远期，不实现 | 纯浏览器方案无法防会话内窃取；R1-A（XSS 消毒）才是防主路径的核心 |
| D9 | 免费试用一次基于 **deviceId（localStorage）+ 服务端记录（Redis 优先）**；无登录系统，"同一用户一次"为**尽力而为**——清 localStorage/换浏览器/无痕可绕过，IP 限流作为辅助防线 | 无登录系统的通行做法（防普通用户滥用）；"一人一次"需登录系统（远期） |
| D10 | HTTP 直连部署下 `crypto.subtle` / `crypto.randomUUID` 不可用：deviceId 改用 `crypto.getRandomValues()` 手写 UUID v4；API Key 加密降级为不持久化（内存可用，刷新需重填） | 公网 IP 直连（免 ICP 备案）只能用 HTTP；上 HTTPS 才能恢复完整功能 |
| D11 | 存储层从 **Upstash Redis REST 迁移到 ioredis 连自建 Redis**（`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`）；`redisCommand` 接口与返回结构不变，调用方零改动 | 腾讯云迁移后状态存储须留在境内服务器；自建 Redis + AOF 持久化，不再依赖外部 SaaS |

## 当前状态

### 已完成功能总览（本次沉淀）

| 类别 | 功能 | 规格条目 | 关键实现 |
|---|---|---|---|
| 基础设施 | 测试设施（Vitest + RTL + jsdom） | F0 | `vitest.config.ts` / `vitest.setup.ts` |
| 🔴 安全 | XSS 消毒 | R1-A | `MarkdownRenderer` 换 `react-markdown`（默认转义、移除 dangerouslySetInnerHTML） |
| 🔴 安全 | API Key 加密存储 | R1-B | `lib/apiKeyCrypto.ts`（AES-GCM，会话密钥存 sessionStorage） |
| 🔴 安全 | Key 掩码 + CSP + 双份存储统一 | R1-C/D | `ApiKeySettings` / `next.config.ts` / `app/page.tsx` |
| 🔴 安全 | 免费试用一次 | R3 | `lib/server/trial.ts` + `lib/deviceId.ts`（每设备 1 次） |
| 🔴 安全 | IP 限流（跨实例 + 惰性清理） | R3/R4 | `lib/server/rate-limit.ts`（Redis/内存，无 setInterval） |
| 🟠 功能 | 结果页流式解析容错 | O3 | `lib/stream-parse.ts`（标题格式兼容 + 完整建议 + 剥离 💡） |
| 🟠 功能 | 结果页 grid 类名字面量映射 | O1 | `gridClassFor`（`lib/utils.ts`，Tailwind 可扫描生成） |
| 🟠 功能 | mystical-* 设计系统类迁移全局 | O2 | `app/globals.css`（单一来源；`ui.module.css` 删除） |
| 🟠 功能 | Fisher-Yates 均匀洗牌 | O4 | `lib/shuffle.ts`；调用方为 `/api/suggested-questions`（2026-09-16 收尾：原调用方 `store.getRandomCards` 被 Y2 删除后该函数沦为死代码，现已接回并加契约测试锁定） |
| 🟠 功能 | SSE Content-Type 符合规范 | O5 | `text/event-stream; charset=utf-8`（测试锁定） |
| 🟡 重构 | 服务端共享模块 | Y7 | `lib/server/{deepseek,rate-limit,trial,upstash}.ts` |
| 🟢 质量 | 牌阵推荐评分制 | G1 | `lib/spread.ts`（强关系信号优先 + 关键词计分 + 默认单张） |
| 🟢 质量 | AI 解析健壮性降级 | G2 | 兜底文案 + prompt 结构约束（`lib/deepseek.ts`） |
| 🟡 功能 | 历史记录页 | Y1 | `app/history/page.tsx` + 结果页自动 `addReading`（上限 50 条） |
| 🟡 视觉 | 历史页展开区去重 + 核心建议高亮 | Y8 | 移除 `🤖 AI 深度解析` 标题与底部重复建议块；核心建议唯一模块 + 黄底高亮前置（`removeAdviceSection`） |
| 🟡 重构 | 历史页展开区收尾 | Y9 | 核心建议卡去 `<hr>`（`MarkdownRenderer` 新增 `hideHr`）；摘要区拆分外层整行 button，消除嵌套 button（修复 hydration 错误） |
| 🟡 重构 | 死代码清理 | Y2 | 删除 `/api/deepseek`、`useImagePreloader`、`callDeepSeek`/`generateTarotReading`、`currentReading` |
| 🟡 文档 | README 与代码事实同步 | Y3 | 技术栈/API 文档/commit hooks/隐私边界/env 清单 |
| 🟡 文档 | layout metadata 定制 | Y4 | `lang="zh-CN"` + 中文品牌标题 |
| 🟡 重构 | 图片目录整理 + 完整性测试 | Y6 | `minor/<suit>/` 目录 + kebab-case + 8 项数据契约测试 |
| 🟢 成本 | 每日熔断配额 + 管理开关接口 | G5 | `lib/server/quota.ts` + `app/api/admin/quota`（每天 50 次，可关/开） |
| 🟢 交互 | 牌桌抽牌体验升级 | G6 | 原为 `lib/pick.ts`（点击索引取牌一一对应）；`lib/useSpreadZoom.ts` 随 G13 文档审查删除，整桌缩放流程被 G9/G10 取代，`lib/pick.ts` 亦于 **2026-09-16 删除**（选牌子页改用 `pickedIndexesFromSlots`） |
| 🟢 视觉 | 结果页深邃夜空风 | G7 | `astro-*` 玻璃拟态组件类 + `CardModal` 牌放大 + `MarkdownRenderer` dark variant |
| 🟢 文档 | 部署文档 + .env.example | G3 | `docs/DEPLOYMENT.md` + `.env.example` |
| 🟢 部署 | 存储层迁移 ioredis（自建 Redis） | G14 | `lib/server/upstash.ts`（ioredis）+ `REDIS_*` 环境变量 |
| 🟢 部署 | deviceId 兼容 HTTP（getRandomValues 手写 UUID） | G14 | `lib/deviceId.ts` |

**测试规模**：190 个测试 / 31 个文件，`type-check` / `lint` / `test:run` 全绿。

### 决策记录（Assumptions & Decisions，D1–D11）

详见上方表格，关键决策：
- **D2**：API Key 用 AES-GCM 加密存储（密文 localStorage + 会话密钥 sessionStorage）
- **D8**：浏览器加密不防 XSS/会话期扩展读取；主密码/服务端托管为远期
- **D9**：无登录系统"一人一次"为尽力而为（deviceId + IP 辅助）
- **D10**：HTTP 直连下 Web Crypto 受限，deviceId 改用 getRandomValues；API Key 加密在 HTTP 下降级不持久化
- **D11**：存储层迁移到 ioredis 连自建 Redis（腾讯云），`REDIS_*` 取代 `UPSTASH_*` / `KV_*`

### 待开发条目

**无**（截至 2026-09-16，全部条目已完成）。

> **2026-09-16 收尾记录**：
>
> ✅ **G4**：`npm audit` 报 15 项（1 critical / 10 high）→ 经可达性分析（两条 critical 均不可达：Windows 宿主 RCE 与服务器系统不符；AVIF RCE 因无 `images` 配置且不接远程 URL）后仍决定升级——`npm audit fix` + `next` 16.1.6 → **16.3.5** → **`found 0 vulnerabilities`**；`feature/less-modules` 分支已删除；可选 CI 经评估决定不加（理由见归档 §13）。详见 [40-green-improvements.md](./40-green-improvements.md) G4 条目处理记录。
> ✅ **O4 收尾**：`shuffle()` 原本无生产调用方（唯一调用方 `store.getRandomCards` 被 Y2 删除），而 `/api/suggested-questions` 仍在用 `sort(() => Math.random() - 0.5)` → 已改为 `shuffle(categories)`。
> ✅ **Y2 收尾**：`lib/pick.ts` 仅被自身测试引用（选牌子页改用 `pickedIndexesFromSlots`）→ 已删除 `lib/pick.ts` 与 `lib/__tests__/pick.test.ts`。
>
> O4/Y2 两项已纳入 [`tests/no-dead-code.test.ts`](../tests/no-dead-code.test.ts) 契约（禁止有偏 sort 洗牌、`shuffle()` 必须有生产调用方、`pickCardsByIndex` 不得再现）。
>
> ⚠️ **待部署**：服务器仍运行旧版本构建产物，Next 升级需重新部署才生效
> （`npm ci && npm run build && pm2 restart indigo-tarot`）。

> 完成顺序严格按上方依赖图执行；每个条目完成后更新本表与对应文档状态。

> **2026-08 推进记录**：O1/O2/O4/O5/G1/G2 六个条目按 TDD 红→绿完成（commit 33fbf38）。本轮 Y1/Y2/Y3/Y4/Y6 五个条目完成（commit 35554b8 后新增，未提交）：历史记录页、死代码清理、README 同步、layout metadata、图片目录整理+完整性测试。
>
> **Y8 推进记录**：历史页展开区去重 + 核心建议高亮按 TDD 红（10 失败）→ 绿（全量 184 通过）完成：移除 `🤖 AI 深度解析` h3 与底部重复「💡 核心建议」块；新增 `lib/stream-parse.ts` 纯函数 `removeAdviceSection`；保留的「核心建议」模块黄底高亮且位于「🔮 深度解析过程」之前。
>
> **Y9 推进记录**：历史页展开区收尾按 TDD 红（3 失败）→ 绿（全量 188 通过）完成：`MarkdownRenderer` 新增 `hideHr` prop，核心建议卡内不再渲染 `---` 分隔线；摘要区拆分外层整行 `<button>`（文本区按钮 + 独立删除/展开按钮），消除嵌套 button，修复控制台 hydration 错误。