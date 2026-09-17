# 项目 Agent 规则

> 这是给 coding agent 的"项目宪法"。agent 每次开工前先读它。
>
> **本文件是规则的唯一出处，且纳入版本控制。**
>
> ⚠️ Claude Code **不原生读取 `AGENTS.md`**——官方文档明确写的是 "Claude Code reads `CLAUDE.md`,
> not `AGENTS.md`"；只有 `AGENTS.md` 而没有 `CLAUDE.md` 时**什么都不会加载**，无回退也无警告。
> 因此仓库根有一个内容仅为 `@AGENTS.md` 的 `CLAUDE.md` 作为桥接（这行内容与 Next 自动生成的
> `CLAUDE.md` 一字不差）。它**随仓库提交**，不要删除。
> **规则只写在本文件里**——往 `CLAUDE.md` 里加规则会立刻制造第二份事实。
>
> ⚠️ **Next 的 agent 文件自动生成已用 `agentRules: false` 关闭**（见 `next.config.ts`）。
>
> **原因**：生成器 `upsertAgentRulesBlock()` 用 `indexOf` 找 `nextjs-agent-rules` 的
> **首个**起止标记，再把两者之间的内容整段替换掉。本段原先**把起始标记原文写进了正文**，
> 于是它把正文里那个标记当成块起点、一路删到文件末尾的真正结束标记——**每次 `next dev`
> 都会删掉本文件第 1–7 节**。2026-09-17 实际发生（80 行 → 21 行），已从 git 恢复。
> 实现在 `node_modules/next/dist/server/lib/generate-agent-files.js`。
>
> 文件末尾的 Next 区块现为**普通静态内容**，不再自动更新。若日后要重新启用生成，
> **必须先删掉本段里对起止标记的原文引用**，否则会再次截断本文件。

## 1. 不可妥协项

- 示例和测试必须真正验证能力，不许造假通过：不许硬编码答案、不许过拟合 prompt 只为让输出"看起来对"、不许在生产代码里藏只供测试走的分支。能力不够就**停下来报告差距**，而不是假装做完。
- 改动若触及对外行为，**先更新文档/示例，再算完成**。

## 2. Issue 处理纪律

- **局部 bug**（期望已被现有文档 / 测试 / 兼容承诺定义清楚）：直接处理——复现 → 在正确分支上做**最小连贯修复** → 补回归测试 → 同步受影响的文档 → 提交 → 在 issue 上回复（确认、修复摘要、验证、相关 commit）。
- **影响设计**（新功能 / 架构调整 / 公共 API / 推荐用法 / 行为或兼容线变更 / 弃用策略 / 跨模块归属）：**停止直接编码，先和负责人对齐处理方案**；达成一致后走 `spec → 实现分支 → 合并验收`，含文档、示例、测试、兼容元数据、spec 状态对账。
- **多个 issue 像同一个根因**：不要逐个打补丁，先抽象出共性、提统一方案，经同意再动。
- **分类不确定时**：当作"影响设计"处理，先问方案再改代码。

## 3. 分支与合并纪律

- **`main` 只接受合并，不接受直接提交。** 任何改动——包括文档、配置、收尾与归档——都先切分支，做完再合并回 `main`。
  **不存在"这个改动很小 / 只是补个文档"的例外**：判断依据是"要不要动 `main`"，不是"改动有多大"。
  已提交到 `main` 而未推送的，用 `git branch <新分支>` + `git branch -f main origin/main` 挪出去。
- 只用中性前缀：`feature/`（新能力 / 设计）、`bug-fix/`（功能缺陷）、`update/`（文档 / 配置维护）、`refactor/`（行为不变的结构调整）。
- 分支名 / PR 标题 / commit **不得**包含 coding-agent 名、厂商名、作者签名或 "generated-by" 之类标记。

## 4. Spec 状态对账（核心）

> **流程细节的唯一出处是 [`docs/README.md`](docs/README.md)**——规格目录布局、条目状态表、
> 归档规则、决策记录都在那里。本节只写必须记住的纪律，**不复述流程**。

- **动手前先看规格现状**：在 [`docs/plan/`](docs/plan/) 找相关 SPEC。有就按它走；没有就**先写一份**
  （验收标准 + 测试计划）再动代码，不要边写边想。
- **在飞的规格就是 `docs/plan/` 里的文件**（一个功能点一个文件）。目录内容即清单，
  不需要在任何地方另外登记——所以 `docs/README.md` 只在条目**收口时**才更新。
- **"完成"的定义**：一个改动不算完，直到**实现、测试、文档、示例、SPEC 状态讲的是同一个故事**。
- **完成才归档**：条目验收后从 `docs/plan/` 移入 [`docs/archive/`](docs/archive/)，
  **并在 `docs/README.md` 补一行条目状态**（若产生了长期决策，同时补决策记录）。
- **只部分落地的**：留在 `docs/plan/` 并写明已实现子集、推迟子集、剩余验收标准，**不要**记成已完成。
- **SPEC 与实际行为不符时**：要么修实现 / 文档 / 测试恢复契约，要么更新 SPEC 和兼容说明——别留着不一致。
- **收尾时**对任何动了公共 API / 推荐用法 / 运行时行为 / 示例 / 兼容的改动，跨 `代码 / docs/ / tests/`
  grep 相关术语消除不一致，并明确说明 SPEC 对账是**完成 / 不适用 / 受阻**。

## 5. 文档与示例同步

- 用户可见的功能改动，必须**新增或更新对应示例**，示例要能在声明环境里真跑，用当前推荐的 API 形态，并保留一行"预期关键输出"（来自一次真实运行的稳定值），不要用"展示了 X"这种空话搪塞。
- 改了公共 API / 推荐用法 / 弃用策略 / 运行时行为，必须保持**实现、文档、示例**三者一致。

## 6. 发布纪律

- 发布是独立动作：feature 验收合并时**不动版本号**；版本号只在发布工作里改。
- 发布前先跑类型检查 + 全量测试（覆盖源码、测试、示例）才建发布 PR；任一校验失败就停下、列出失败、不发布。
- 合并 / 发布是不可逆动作，终点是**人按确认**（用 Branch protection 的 required checks + required review 变成强制）。

## 7. 编辑纪律

- 奥卡姆剃刀：已有接口已经清楚表达了某个概念，就不要再加新实体 / 方法 / facade / 补丁；名字不清就优先提"窄别名或文档澄清"，而不是再叠一个重叠方法。
- API 契约变了，**先于或同步**更新 spec。
- 不要覆盖与本次任务无关的脏文件；遇到脏状态影响验证就报告，不要静默吞掉。
- 动手前先判断分层 / 归属是否最优；有更好的边界就先暂停、带着具体建议提出来。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
