# 🟢 G16 测试文件移出生产构建的类型检查

> **本文只负责**：G16 单一条目的根因、技术方案、风险点、做完后的检测流程。
> **本文不写**：其他条目状态（→ [`../README.md`](../README.md)）、部署与运维现状（→ [`../DEPLOYMENT.md`](../DEPLOYMENT.md) / [`../OPERATIONS.md`](../OPERATIONS.md)）。
>
> **状态**：⬜ 待审核（SPEC 已定稿，**未实现**，等负责人审核通过再进入 TDD）。

---

## 一、问题描述

- **根因（已核实）**：`next build` 的类型检查 = `tsc --project tsconfig.json --noEmit`（见 `node_modules/next/dist/lib/typescript/runTypeCheckCli.js`），完全读根 `tsconfig.json`。
- 当前 [`tsconfig.json`](../../tsconfig.json) 的 `include` 是 `**/*.ts, **/*.tsx`，`exclude` 只有 `node_modules`——**测试文件被纳入生产构建的类型检查**。实测 `tsc --listFilesOnly` 共纳入 **39 个测试文件**。
- **后果（2026-09-17 已发生）**：`tar` 覆盖式部署在服务器上残留了仓库已删的测试文件（`lib/__tests__/grid.test.ts` 引用已删的 `gridClassFor`），导致 `next build` 类型检查失败、部署中断。
- **性质**：这是"职责错配"——测试文件不是生产产物，却由生产构建的类型检查来裁决。残留测试文件能打挂生产构建，正是因为这个错配。

## 二、目标

1. **生产构建（`next build`）不再类型检查测试文件**——残留的过期测试文件从此无法打挂生产构建。
2. **测试文件的类型正确性仍然被检查**——只是改由开发侧的 `npm run type-check` 负责，而不是生产构建负责。

**核心判断**：这是**正确划界**，不是关闭检查。测试代码仍受类型检查约束，只是把"检查测试"这件事从"生产构建"移到"开发/CI 的类型检查"。

## 三、非目标

- **不**做 ①（部署删除感知 / rsync）——那是另一个条目，解决"残留文件"的根，本条目解决"残留文件无害"。
- **不**做 ④（GitHub validate-only workflow）——独立的 CI 议题。
- **不**用 `typescript.ignoreBuildErrors: true`——那是让症状消失而不是解决问题，等于拆掉生产构建的真实防线，违背 CLAUDE.md §1。
- **不**改变任何测试的内容、数量、断言。

---

## 四、技术方案

### 4.1 拆分 tsconfig：生产构建用不含测试的，开发类型检查用含测试的

**根 `tsconfig.json`（生产构建读它）——`exclude` 增加测试文件**：

```jsonc
"exclude": [
  "node_modules",
  "**/*.test.ts",
  "**/*.test.tsx",
  "**/__tests__/**"
]
```

**新建 `tsconfig.test.json`（`npm run type-check` 读它）——继承根配置、覆盖 exclude 以重新纳入测试**：

```jsonc
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules"]
}
```

`extends` 继承 `compilerOptions` 和 `include`（`**/*.ts, **/*.tsx`）；子配置的 `exclude` **整体覆盖**父配置的 `exclude`（TS 语义），于是测试文件重新被 `include` 覆盖到。

**`package.json` —— `type-check` 改读测试配置**：

```jsonc
"type-check": "tsc --noEmit -p tsconfig.test.json"
```

### 4.2 为什么这条路安全（已核实的事实，非推断）

| 事实 | 出处 | 意义 |
|---|---|---|
| `next build` 只跑 `tsc -p tsconfig.json`，不会去读 `tsconfig.test.json` | `runTypeCheckCli.js:26-40` | 拆出去的测试配置不会干扰生产构建 |
| Next 只在 `!('exclude' in tsconfig)` 时才写 exclude | `writeConfigurationDefaults.js:349` | **已存在 exclude 字段时，Next 绝不覆盖** |
| Next 官方自己在 `NEXT_PRIVATE_LOCAL_DEV` 下往 exclude 加 `**/*.test.ts(x)` | `writeConfigurationDefaults.js:360-373` | "排除测试文件"是官方认可的机制，不是反模式 |
| 本仓库测试**显式** `import { describe, it } from "vitest"`，未用 globals | `tests/no-dead-code.test.ts` 等 | 无隐式全局类型依赖，拆 config 不会丢类型 |
| jest-dom matcher 类型经 `vitest.setup.ts` 的 import 增强 | `vitest.setup.ts:1` | 只要 `vitest.setup.ts` 在 type-check 的 project 里，matcher 类型仍在（它由 include 覆盖） |

---

## 五、风险点（需在实现时逐一验证）

1. **【高】`extends` 的 `exclude` 覆盖语义**：必须实测确认 `tsconfig.test.json` 的 `exclude: ["node_modules"]` 确实让测试文件重新被纳入，而不是"继承父 exclude 后再叠加"。若 TS 版本语义是"合并"而非"覆盖"，方案需调整（如显式在子配置重写完整 include）。
2. **【中】`incremental` / `tsBuildInfoFile` 副作用**：根 tsconfig 有 `incremental: true`。`tsconfig.test.json` 继承后，`tsc -p tsconfig.test.json` 默认会写 `tsconfig.test.tsbuildinfo` 到根目录。已被 `*.tsbuildinfo` gitignore，无害，但要在子配置里显式处理（`incremental: false` 或指定 buildInfoFile），避免产生困惑的新文件。
3. **【中】Next 对根 tsconfig 的增量写入**：Next 构建会往根 tsconfig 的 `include` 增量加 `.next/types/**`（`writeConfigurationDefaults.js:305-315`）。`include`/`exclude` 独立、`exclude` 优先，故不冲突——但实现后需跑一次 `next build` 确认根 tsconfig 没被它改回原样（`exclude` 还在）。
4. **【低】测试文件用非 `.test` 命名的遗漏**：本项目测试都在 `__tests__/` 目录或 `.test.ts(x)`，两个 glob 已覆盖。实现时用 `tsc --listFilesOnly` 复查"生产构建下测试文件数 = 0"。
5. **【低】生产源码 import 测试文件的隐患**：若生产源码曾 import 测试文件，exclude 后 build 会在 import 处报错（好事，暴露坏引用）。实现后若 build 报新错，先查是否属此类。
6. **【低】pre-commit 行为变化**：`.husky/pre-commit` 跑 `npm run type-check`，改脚本后 pre-commit 改用 `tsconfig.test.json`——覆盖范围是"源码 + 测试"的超集，只增不减，不会漏。

---

## 六、做完后的检测流程（验收标准）

> 全部通过才算完成；任一失败即停下。

1. **生产构建通过**：`npm run build` 全绿，且构建后 `git status` 干净（根 tsconfig 未被 Next 改写）。
2. **变异验证——本条目最关键的证明**：
   - 临时在 `lib/__tests__/` 放一个**故意引用不存在符号**的测试文件（如 `__mutation__.test.ts` 引用 `@/lib/not-exist`）；
   - 断言 A：`npm run build` **不再因此失败**（证明残留测试文件已无法打挂生产构建）；
   - 断言 B：`npm run type-check` **仍然因此失败**（证明测试文件的类型检查能力没有被关掉，只是换到了正确的位置）；
   - 完成后立即删除变异文件，不留残留（沿用 `tests/no-dead-code.test.ts` 对 `__mutation__` 目录的禁制精神）。
3. **type-check 全绿**：`npm run type-check`（此时走 `tsconfig.test.json`）在干净树上通过。
4. **测试全绿**：`npm run test:run` 通过（证明 `exclude` 没有误伤 vitest 本身——vitest 用的是 `vitest.config.ts`，不读 tsconfig 的 exclude）。
5. **lint 全绿**：`npm run lint`。
6. **范围复核**：
   - `tsc -p tsconfig.json --listFilesOnly | grep -cE "\.test\.|__tests__"` → **0**（生产构建范围不含测试）；
   - `tsc -p tsconfig.test.json --listFilesOnly | grep -cE "\.test\.|__tests__"` → **39**（开发类型检查仍覆盖全部测试）。

---

## 七、影响范围

- **修改**：`tsconfig.json`（exclude 增加测试 glob）、`package.json`（type-check 脚本）
- **新增**：`tsconfig.test.json`
- **不动**：所有测试文件、`vitest.config.ts`、`vitest.setup.ts`、`.husky/pre-commit`、`next.config.ts`

## 八、备选与弃用方案

- **`typescript.ignoreBuildErrors: true`**：**弃用**。关掉整个生产构建的类型检查，等于拆掉真实防线，违背 §1"不许在生产代码里藏只供测试走的分支"的同等精神——这是让症状消失，不是解决问题。
- **`typescript.tsconfigPath` 指向一个精简的 build 专用 tsconfig**：可行但更绕——反过来说，让 build 用一个**不含测试**的 config 是本方案的同构变体。之所以选"改 exclude"而非"加 build 专用 config"，是因为 Next 官方就是用 exclude 排除测试的（见 §4.2），且改动面更小。
