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
| [`40-green-improvements.md`](./40-green-improvements.md) | 🟢 绿级：质量提升 G1–G4 |

## 优先级总览

| 编号 | 标题 | 优先级 | 类别 | 状态 |
|---|---|---|---|---|
| F0 | 测试基础设施（Vitest + RTL） | 🔴 前置 | 基础设施 | ✅ 完成 |
| R1 | API Key 安全加固（XSS 消毒 + 加密存储 + 纵深防御） | 🔴 | 安全 | ✅ 完成 |
| R3 | 系统 Key 保护：免费试用一次 + 限流加固 | 🔴 | 安全 | ✅ 完成 |
| R4 | 移除模块级 setInterval | 🔴 | 安全 | ✅ 完成 |
| O1 | 结果页动态 grid 类名失效 | 🟠 | 功能缺陷 | ⬜ 待开发 |
| O2 | draw/result 页 mystical-* 类不生效 | 🟠 | 功能缺陷 | ⬜ 待开发 |
| O3 | 结果页 setState-in-updater 反模式 + AI 输出容错解析 | 🟠 | 功能缺陷 | ✅ 完成 |
| O4 | 洗牌算法有偏 | 🟠 | 功能缺陷 | ⬜ 待开发 |
| O5 | SSE Content-Type 错误 | 🟠 | 功能缺陷 | ⬜ 待开发 |
| Y1 | 实现最小版历史记录页 | 🟡 | 小功能 | ⬜ 待开发 |
| Y2 | 死代码清理 | 🟡 | 重构 | ⬜ 待开发 |
| Y3 | README 更新 | 🟡 | 文档 | ⬜ 待开发 |
| Y4 | layout metadata 定制 | 🟡 | 文档 | ⬜ 待开发 |
| Y5 | API Key 双份存储统一 | 🟡 | 重构 | ✅ 已并入 R1 |
| Y6 | 图片目录整理 + 数据完整性测试 | 🟡 | 重构 | ⬜ 待开发 |
| Y7 | 路由重复逻辑抽取 | 🟡 | 重构 | ✅ 核心完成（共享模块随 R3 落地） |
| G1 | 牌阵推荐逻辑增强（评分制） | 🟢 | 质量提升 | ⬜ 待开发 |
| G2 | AI 解析健壮性（降级提取 + prompt 加固） | 🟢 | 质量提升 | ⬜ 待开发 |
| G3 | .env.example 与部署文档 | 🟢 | 文档 | ✅ 完成 |
| G4 | 收尾：依赖审计、分支处置、可选 CI | 🟢 | 质量提升 | ⬜ 待开发 |
| G5 | 每日熔断配额 + 管理开关接口 | 🟢 | 质量提升（成本控制） | ✅ 完成 |

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
  → 🟢 G1 → G2 → G3 → G4
```

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
| D3 | R3 生产推荐 Upstash Redis；未配置时回退内存实现 | 零配置可用；跨实例限流为生产增强 |
| D4 | O2 采用"样式移到 `globals.css`"而非逐页 CSS Module | 与 main 分支现状一致；`feature/less-modules` 分支方向因此废弃（G4 注明） |
| D5 | 测试统一使用 Vitest 生态（jsdom），不引入 MSW | mock 全局 fetch 已满足路由测试需求 |
| D6 | Y1 历史记录采用最小实现（列表 + 详情 + 删除） | 与 store 现有骨架匹配，避免过度设计 |
| D7 | R1-A 主方案 `react-markdown`（默认转义、无 dangerouslySetInnerHTML）；备选 DOMPurify 仅在主方案依赖冲突时启用 | 白名单解析优于黑名单消毒 |
| D8 | 加密的边界：**不防 XSS 与会话期扩展读取**（解密在客户端进行）；主密码 PBKDF2 派生与服务端托管 Key 记为远期，不实现 | 纯浏览器方案无法防会话内窃取；R1-A（XSS 消毒）才是防主路径的核心 |
| D9 | 免费试用一次基于 **deviceId（localStorage）+ 服务端记录（Redis 优先）**；无登录系统，"同一用户一次"为**尽力而为**——清 localStorage/换浏览器/无痕可绕过，IP 限流作为辅助防线 | 无登录系统的通行做法（防普通用户滥用）；"一人一次"需登录系统（远期） |

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
| 🟡 重构 | 服务端共享模块 | Y7 | `lib/server/{deepseek,rate-limit,trial,upstash}.ts` |
| 🟢 成本 | 每日熔断配额 + 管理开关接口 | G5 | `lib/server/quota.ts` + `app/api/admin/quota`（每天 50 次，可关/开） |
| 🟢 文档 | 部署文档 + .env.example | G3 | `docs/DEPLOYMENT.md` + `.env.example` |

**测试规模**：86 个测试 / 16 个文件，`type-check` / `lint` / `build` 全绿。

### 决策记录（Assumptions & Decisions，D1–D9）

详见上方表格，关键决策：
- **D2**：API Key 用 AES-GCM 加密存储（密文 localStorage + 会话密钥 sessionStorage）
- **D8**：浏览器加密不防 XSS/会话期扩展读取；主密码/服务端托管为远期
- **D9**：无登录系统"一人一次"为尽力而为（deviceId + IP 辅助）

### 待开发条目

⬜ O1（结果页动态 grid 类名）、O2（mystical-* 样式）、O4（洗牌有偏）、O5（SSE Content-Type）、Y1（历史记录页）、Y2（死代码清理）、Y3（README 完善）、Y4（layout metadata）、Y6（图片目录整理）、G1（牌阵推荐评分制）、G2（AI 解析健壮性）、G4（依赖审计/CI）。

> 完成顺序严格按上方依赖图执行；每个条目完成后更新本表与对应文档状态。
