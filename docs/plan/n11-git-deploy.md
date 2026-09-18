# N11：部署改 git + 文档现状/历史分离

- **优先级**: 🟡
- **类别**: 运维流程 / 文档维护
- **状态**: 🚧 在飞
- **关联条目**: N10（443 快速拒绝）、D13/G16（测试移出生产构建）、迁移记录 [`archive/migration-2026-09.md`](../archive/migration-2026-09.md)
- **关联决策**: 本轮新增 D16（部署方式）与 D17（文档职责）

## 问题描述

1. **部署流程繁琐且脆弱**：现状走 `tar` 覆盖（§三.4），三个额外复杂度全源于 tar——
   ① 服务器直连 GitHub 超时 → 走 `ghfast.top` 镜像 curl；② tar 只覆盖不删除 → 需手工对账残留文件；
   ③ tar 无版本概念 → 需手工维护 `.deployed-sha` 回退锚点。
2. **DEPLOYMENT.md 越界**：[`docs/README.md`](../README.md) 职责表已写明 DEPLOYMENT.md
   「禁止出现：迁移历史、事故经过」，但正文塞了大量历史痕迹（`grep` 命中 8 处
   「2026-09-17 实测」「本文初稿写反了」「实际发生过」等），历史与现状混在一起。

## 目标

- 部署从 tar 迁移到 **git**：`git fetch + reset --hard` 替代 curl tar，自动删文件、git 本身即锚点；
  固化一个 `deploy.sh`（人 ssh 上去跑一条命令，不追求 CI/CD 自动部署——项目纪律要求发布终点是人确认）。
- DEPLOYMENT.md 收敛为**纯现状**：只写「现在该怎么做」；历史纠错删、事故过程移 archive、约束保留结论。

## 验收标准

### A. deploy.sh

- [ ] **A1** `bash -n deploy.sh` 无语法错误
- [ ] **A2** 脚本执行 `git fetch origin main && git reset --hard origin/main`
- [ ] **A3** 脚本先打印回退锚点（`git rev-parse --short HEAD`），结束时再打印当前版本
- [ ] **A4** 脚本执行 `npm ci && npm run build && pm2 restart indigo-tarot`，且用 `set -euo pipefail`
      （build 失败则 pm2 不执行 → 线上仍是旧版，被动保护）
- [ ] **A5** 验证用 `localhost`（`localhost:3000/api/health` 验应用+Redis；`curl localhost` 走 Nginx 80 验链路），
      **不硬编码公网 IP / 密钥**（遵守「不把敏感信息写进项目」）
- [ ] **A6** 脚本不含任何敏感信息（grep 无 `SERVER_IP` 真实值、无 token）

### B. DEPLOYMENT.md 现状/历史分离

- [ ] **B1** 正文不再含「迁移历史、事故经过」——grep `2026-09-1[67]` 在 DEPLOYMENT.md 中**仅允许**
      出现在「归档日期」式的声明，不允许「实测/初稿/发生」等过程叙述
- [ ] **B2** 部署步骤指向 `deploy.sh`，不复述每条命令；tar 流程整段删除
- [ ] **B3** 修正过期陈述「`next build` 会对测试文件做类型检查」——测试已由 tsconfig `exclude`
      移出生产构建（D13/G16）
- [ ] **B4** 首次从 tar 迁移到 git 的一次性步骤写进文档（记录 `.deployed-sha` → 备份 `.env.local` →
      原地 `git init` + remote + fetch + reset → 验证 `.env.local` 仍在 → build/restart）
- [ ] **B5** `.deployed-sha` 从「必须维护」降级为「历史遗留，git 部署后由 `git rev-parse HEAD` 取代」

### C. 台账与决策

- [ ] **C1** [`OPERATIONS.md`](../OPERATIONS.md) 台账补 N11 一行
- [ ] **C2** [`docs/SPEC.md`](../SPEC.md) 决策记录补 D16（git 部署 + deploy.sh，不 CI/CD）、
      D17（文档只写现状，历史归 archive）、D18（台账与规则分离）

## 技术方案

### 1. `deploy.sh`（仓库根，新增）

见验收 A1–A6。核心：锚点 → fetch/reset → build/restart → 验证 → 回退提示。

### 2. 首次迁移（一次性，写进 DEPLOYMENT.md，不进脚本）

```bash
cd /root/indigo-tarot
echo "切换前线上版本：$(cat .deployed-sha)"        # 记锚点
cp .env.local /root/.env.local.backup-$(date +%F)  # 备份命根子
git init && git remote add origin <镜像URL> && git fetch origin main && git reset --hard origin/main
test -f .env.local && echo "✓ .env.local 在" || cp /root/.env.local.backup-* .env.local
npm ci && npm run build && pm2 restart indigo-tarot
git rev-parse --short HEAD   # 应 = 要部署的 SHA
```

**安全性依据**（已核实）：
- 服务器无 tar 残留（三方对比 `comm` 结果：② 仅 `.env.local` / `.deployed-sha` / `next-env.d.ts` 三个仓库外文件）
- `.env.local` 在 `.gitignore`（`.env*` 规则）→ `git reset --hard` 不碰 untracked+ignored 文件
- **不需要 `git clean`**（无残留可清）→ 规避了 `git clean -fdx` 误删 `.env.local` 的风险

### 3. DEPLOYMENT.md 重构

- 头部「本文只负责/不写」保留（本就是对的声明），正文按声明收敛
- §三.4「更新部署」→ 改为指向 `deploy.sh` + 首次迁移步骤
- §三.5「部署回退」→ 改为 `git reset --hard <锚点>`，删「本文初稿写反了」等纯历史
- X-Forwarded-For 覆写 → 留「必须 `$remote_addr`」规则，删 Q1 追溯（Q1 已在 OPERATIONS 疑点表归档）
- pm2 日志轮转 → 留「必须配，否则日志写满磁盘」，删「线上生效值实测」的过程叙述
- 「tar 只覆盖不删除」「ghfast.top 镜像」→ 随 tar 流程一并删除

## TDD 测试计划

> deploy.sh 与文档属于运维产物，**不设自动化测试**（刻意）：
> - deploy.sh 的「能力」是部署，自动测试需真实服务器，在仓库里跑 `bash -n` 只能证语法、
>   证不了「能部署」——造假通过比不测更糟（AGENTS.md 第 1 节）。
> - 文档的「不越界」用收口时的 grep 人工核验（B1 已写清楚允许/禁止的形态）。
>
> 验证方式：`bash -n deploy.sh` 本地跑一次 + 真机 dry-run（负责人执行）。

| 检查项 | 方式 |
|---|---|
| A1 语法 | 本地 `bash -n deploy.sh` |
| A6 无敏感信息 | 本地 grep `SERVER_IP`/token 字面量 |
| B1 文档不越界 | 本地 grep 过程叙述关键词 |
| B2/B3 流程正确 | 本地通读 + 真机 dry-run |

### 4. 规格台账与文档规则分离（本轮追加，决策 D18）

**问题**：`docs/README.md` 混装两种变更频率截然不同的内容——规则（几乎不变）与规格台账
（每次收口都变）。后果是 `git log docs/README.md` 里"规则改了"被台账噪音淹没，
削弱规则文档的可审计性。

**处置**：新建 [`docs/SPEC.md`](../SPEC.md) 承载条目状态 + 质量门禁 + 决策记录；
`docs/README.md` 只留规则 / 文件清单 / 脱敏说明，**仅在规则或清单变化时更新**。

**连带（必须一次改全，否则留死指针）**：

| 文件 | 处 | 改动 |
|---|---|---|
| `AGENTS.md` | 3 | 第 4 节的流程指针（"唯一出处"、"收口时更新"、"补一行条目状态"）改指 SPEC.md |
| `docs/README.md` | 5 | 自身描述 + 职责表新增 SPEC.md 一行 + 文件清单 |
| `docs/OPERATIONS.md` | 1 | 头部"条目状态与决策记录"指针 |
| `docs/DEPLOYMENT.md` | 1 | 同上 |
| `README.md` | 1 | 文档总览指针 |

**验收标准**：

- [ ] `docs/SPEC.md` 含条目状态（36 条）、质量门禁、决策记录（D1–D18）
- [ ] 决策表为**单张完整表**——原 `docs/README.md` 第 159 行有个空行把表截成两半，
      D14–D17 因此没有表头、Markdown 渲染为纯文本，已一并修复
- [ ] `docs/README.md` 不再含条目状态与决策记录
- [ ] 全库无"台账在 docs/README.md"的残留表述（grep 核验）

> **不设自动化测试**（与本文其余部分同理）：文档结构无法用单元测试证伪。
> 核验方式是收口时的 grep：`grep -rn "README.md.*条目状态\|README.md 补一行"` 应为空。

## 风险与假设

- ~~**前置（高风险，需负责人验证）**：服务器 `git fetch` 能通镜像。~~ **已核实（2026-09-18）**：
  服务器上 `git clone --depth 1 https://ghfast.top/https://github.com/HammerRoot/indigo-tarot.git`
  成功（236 objects / 29.44 MiB / 4.59 MiB/s）。镜像 URL 已填入 DEPLOYMENT.md §3.2/§3.3，本风险消除。
  备选的「脚本固化 tar 流程」分支不再需要。
- **假设（未实测，仅按 git 语义推理）**：原地 `git init` 后 `git reset --hard origin/main` 会正确把
  190 个同名文件纳入跟踪、补上缺失的文件、且不碰 `.env.local`。
  ⚠️ **这条没有在真实目录上跑过**——2026-09-18 只验证了「镜像连得通」（在 `/tmp` 里 clone），
  不等于「原地迁移不会出事」。真实迁移是负责人执行的一次性动作，出问题按 §3.3 的备份回滚。
- **风险（外部单点依赖）**：`origin` 在迁移时被写死为 `ghfast.top` 镜像 URL，而服务器**直连 GitHub 超时**
  （这正是引入镜像的原因）。镜像失效 ⇒ `git fetch` 失败 ⇒ 在找到替代镜像前**无法部署**。
  影响面有限：`deploy.sh` 的 `set -euo pipefail` 会让它在 fetch 失败处中断，**不污染线上**。
  恢复：`git remote set-url origin <新镜像>/…`。已记入 [`OPERATIONS.md`](../OPERATIONS.md) §三 已知限制与风险。
- **风险**：`git init` 的默认分支名可能是 `master` 而非 `main`，`git fetch origin main` 后需
  `git reset --hard origin/main` 而非 `git reset --hard main`（脚本用 `origin/main` 已规避）。

## 收口动作（完成时执行）

- [ ] OPERATIONS.md 台账补 N11；docs/SPEC.md 补 D16–D18；本文移入 archive 并加归档头部
- [ ] 跨文档 grep 核验无"台账在 docs/README.md"的残留（归档正文的历史陈述除外）
- [ ] 真机 dry-run deploy.sh（负责人执行），确认 git 连通性前置成立
- [ ] 跨文档 grep 消除「tar」「ghfast.top」「.deployed-sha」的过期残留（archive 除外）
