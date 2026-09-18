# indigo-tarot 文档

> **本文只负责三件事**：① 文档规则与地图；② 文件清单（活跃 / 在飞 / 归档）；③ 脱敏说明。
> **本文不写**：部署步骤（→ [`DEPLOYMENT.md`](./DEPLOYMENT.md)）、运维现状与台账
> （→ [`OPERATIONS.md`](./OPERATIONS.md)）、规格条目状态与决策记录（→ [`SPEC.md`](./SPEC.md)）、
> 迁移过程与事故经过（→ [`archive/`](./archive/)）。
>
> ⚠️ **本文只在"规则变了"或"增删了文档"时才改。** 条目状态与决策记录在 [`SPEC.md`](./SPEC.md)，
> 那份随收口而变——分开是为了让 `git log` 里"规则改了"不被台账噪音淹没。

---

## 一、文档规则

> **一个事实只能有一个出处。** 每份文档头部写明"本文只负责什么"，其他文档只能**链接**它，不得复制其内容。
> 状态类信息一旦过期就会误导人——所以只保留一份，并在变更时同步更新。

**遇到"这件事该写在哪"**：

1. 先查下表，按**职责**而非**时间**归属。
2. 若同时沾边两处，选职责更贴近的那一处，另一处只放**指针**。
3. 更新状态前先 `grep` 该事实在几处出现，**一次改全**。

### 职责划分

| 文档 | 唯一负责 | 禁止出现 |
|---|---|---|
| [`../README.md`](../README.md) | 给使用者：功能、技术栈、快速开始、API 契约、隐私边界 | 部署细节、运维待办、事件记录 |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | 给运维：环境变量、部署步骤、成本控制、管理接口、上线检查清单 | 迁移历史、事故经过、条目状态 |
| [`OPERATIONS.md`](./OPERATIONS.md) | **唯一的运维现状**：现状速览、台账状态（N 任务 / Q 疑点）、已知限制与风险、归档索引 | 重复 [`SPEC.md`](./SPEC.md) 的规格台账 |
| [`SPEC.md`](./SPEC.md) | **唯一的规格台账**：条目状态、质量门禁、**决策记录 D1–D17（唯一定义处）** | 文档规则、部署现状、运维待办 |
| **本文** | 文档规则与地图、文件清单、脱敏说明 | 条目状态、决策记录、部署现状、运维待办 |

### 归档规则

- 条目完成 → 状态改 ✅，正文留结论，过程细节移入 `archive/`。
- 疑点关闭 → 从 `OPERATIONS.md` 移除，移入 `archive/`，并在 `OPERATIONS.md` 留一行"已关闭 → 见 xxx"。
- 归档文件顶部必须写明归档日期，并声明"本文是历史记录，不描述当前状态"。
- **归档区不写"当前状态"。** 文中若出现"保留 / 待核实 / 进行中"，均为**当时**的情况，已过期处就地标注。

---

## 二、文件清单

### 活跃文档（会被更新）

| 文件 | 内容 | 变更频率 |
|---|---|---|
| [`../README.md`](../README.md) | 面向使用者：功能、技术栈、快速开始、API 契约、隐私边界 | 功能变化时 |
| [`DEPLOYMENT.md`](./DEPLOYMENT.md) | 环境变量、本地开发、生产部署步骤、成本控制、管理接口、上线检查清单 | 部署方式变化时 |
| [`OPERATIONS.md`](./OPERATIONS.md) | 部署现状速览、台账（N 任务 / Q 疑点）、已知限制与风险、归档索引 | 运维状态变化时 |
| [`SPEC.md`](./SPEC.md) | 规格条目状态、质量门禁、决策记录（D 系列唯一定义处） | **每次收口** |
| **本文** | 文档规则 + 文件清单 + 脱敏说明 | **仅规则或清单变化时** |

### 计划中的规格（[`plan/`](./plan/)，在飞）

一个功能点 = 一个文件，**开工前**先在这里把验收标准与测试计划写清楚。这个目录**不需要在本文登记**：

- **目录内容即清单**——`ls docs/plan/` 就是当前在飞的全部规格，不存在"文档里有、目录里没有"的偏差；
- 条目**完成并归档后**才在 [`SPEC.md`](./SPEC.md) 补一行、必要时在「决策记录」补一条；
- 条目作废/搁置就地删除或改写该文件，不留在目录里冒充待办。

> 当前在飞：见 [`plan/`](./plan/) 目录。

### 归档文档（不再更新）

归档目录：[`archive/`](./archive/)——项目历史，**不描述当前状态**。
条目状态与决策记录见 [`SPEC.md`](./SPEC.md)，本文不重复。

| 文件 | 内容 |
|---|---|
| [`migration-2026-09.md`](./archive/migration-2026-09.md) | 腾讯云迁移：部署执行记录、代码改动、问题排查、运维速查、Nginx 接入 |
| [`n-series-detail.md`](./archive/n-series-detail.md) | **N1–N11** 运维条目的过程记录：各条的根因、排查、实测数据与踩坑（`OPERATIONS.md` 台账只留状态，过程在此） |
| [`n8-redis-branch-tests.md`](./archive/n8-redis-branch-tests.md) | **N8** Redis 分支测试补强：缺口背景、断言点、变异验证、验收结果 |
| [`00-foundation-testing.md`](./archive/00-foundation-testing.md) | **F0** 测试基础设施（Vitest + RTL，TDD 前提，最先做） |
| [`10-red-security.md`](./archive/10-red-security.md) | 🔴 红级：安全修复 R1–R4 |
| [`20-orange-functional.md`](./archive/20-orange-functional.md) | 🟠 橙级：功能缺陷 O1–O5 |
| [`30-yellow-cleanup.md`](./archive/30-yellow-cleanup.md) | 🟡 黄级：清理/文档/小功能 Y1–Y9 |
| [`40-green-improvements.md`](./archive/40-green-improvements.md) | 🟢 绿级：质量提升 G1–G7、G14 |
| [`draw-interaction.md`](./archive/draw-interaction.md) | 🟢 抽牌交互模块：G8–G13（选牌情况页 + 选牌子页 + 结果页优化 + 结论先行 + 免责声明） |
| [`g15-card-image-cache.md`](./archive/g15-card-image-cache.md) | **G15** 卡牌图片缓存命中：根因证据、档位收敛方案、验收与实测记录、实现偏离、备选路线 |
| [`g16-test-typecheck-scope.md`](./archive/g16-test-typecheck-scope.md) | **G16** 测试文件移出生产构建类型检查：根因、tsconfig 拆分方案、风险与检测流程、变异验证 |
| [`g17-draw-ritual.md`](./archive/g17-draw-ritual.md) | **G17** 抽牌流程仪式化重做：三轮决策记录、牌序缺陷证据链、实现偏离、测试覆盖边界与人工验收清单、已知缺口 |
| [`o6-http-api-key-remember.md`](./archive/o6-http-api-key-remember.md) | **O6** HTTP 下「记住 Key」静默失效：根因与实测报错、隐藏方式与检测依据的决策、调用链末端验证、真实浏览器对照 |
| [`n11-git-deploy.md`](./archive/n11-git-deploy.md) | **N11** 部署改 git + `deploy.sh` + 文档现状/历史分离：验收标准、服务器清点、镜像实测、前置风险 |

---

## 三、脱敏说明

本目录文档曾直接写入生产环境的**公网 IP、云实例 ID、Vercel 项目标识**。本仓库为公开仓库，
这些标识符可被用于扫描与资源定位，已统一替换为占位符：

| 占位符 | 含义 | 实际值在哪 |
|---|---|---|
| `<SERVER_IP>` | 生产服务器公网地址 | 腾讯云轻量应用服务器控制台 |
| `<INSTANCE_ID>` | 云服务器实例 ID | 同上 |
| `<VERCEL_DOMAIN>` | 历史部署域名 | Vercel 控制台 |
| `<VERCEL_PROJECT_ID>` / `<VERCEL_ORG_ID>` | Vercel 项目／组织标识 | 同上 |

**照文档执行运维命令时，请自行把占位符替换为真实值。**

> 本目录**不含任何密钥**：`DEEPSEEK_API_KEY`、`ADMIN_TOKEN`、`REDIS_PASSWORD` 一律只存在于
> 服务器上的 `.env.local`（权限 600），从未进入本仓库。
>
> ⚠️ 注意：脱敏只改了**当前版本**，git 历史中的旧值仍可被检出（已决定不重写历史）。
