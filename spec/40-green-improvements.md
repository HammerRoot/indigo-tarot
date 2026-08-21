# 🟢 绿级：质量提升（G1–G4）

> 绿级条目为可选的质量提升，红/橙/黄全部完成后按需实施。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| G1 | 牌阵推荐逻辑增强（评分制） | 质量提升 | ⬜ 待开发 |
| G2 | AI 解析健壮性（降级提取 + prompt 加固） | 质量提升 | ⬜ 待开发 |
| G3 | .env.example 与部署文档 | 质量提升 | ✅ 完成 |
| G4 | 收尾：依赖审计、分支处置、可选 CI | 质量提升 | ⬜ 待开发 |

---

## [G1] 牌阵推荐逻辑增强（评分制）

- **优先级**: 🟢
- **类别**: 质量提升
- **状态**: ⬜ 待开发

### 问题描述

- 现状：`lib/store.ts` L183–211 `recommendSpread` 用关键词 `includes` 顺序匹配：单个字 `'爱'`（L189）命中关系牌阵，导致"热爱工作"这类问题误判；匹配顺序固定、无评分；`question.length > 50` 直接强制生命指引。
- 影响：推荐结果误判率偏高。

### 目标

评分制推荐：按关键词命中数计分取最高，修正单字误判；默认无匹配返回单张牌；保持既有 5 种牌阵集合。

### 验收标准

- [ ] "热爱工作"类问题不命中情感十字
- [ ] 表驱动用例全部通过（见测试计划）
- [ ] 无匹配时默认返回单张牌
- [ ] 平局取规则表靠前者

### 技术方案

新增 `lib/spread.ts` 纯函数，`lib/store.ts` 复用：

```ts
interface SpreadRule { spreadId: string; keywords: string[]; }
// 四组规则：关系（爱情/恋爱/感情/喜欢/对象/伴侣/结婚/分手/表白/复合…）、
// 决策（选择/决定/应该/还是/换工作/工作/事业/创业/跳槽…）、
// 时间（未来/将来/发展/趋势/前景/这个月/明年…）、
// 人生（人生/命运/指引/迷茫/方向/整体/全面…）
// 注意：移除单字 '爱'、'关系' 等过宽词

export function recommendSpread(question: string): TarotSpread {
  const lower = question.toLowerCase();
  const scores = RULES.map((rule) => ({
    spreadId: rule.spreadId,
    score: rule.keywords.filter((k) => lower.includes(k)).length + (lower.length > 50 && rule.spreadId === "life-guidance" ? 1 : 0),
  }));
  const best = scores.reduce((a, b) => (b.score > a.score ? b : a), scores[0]);
  return (best.score > 0 ? tarotSpreads.find((s) => s.id === best.spreadId) : null)
    ?? tarotSpreads.find((s) => s.id === "single-card")!;
}
```

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/spread.test.ts` | 爱情类 | "我在感情方面应该如何选择" → `relationship-cross` |
| | 事业类 | "我的事业发展前景如何" → `decision-making` |
| | 时间类 | "未来三个月的发展趋势" → `past-present-future` |
| | 人生类/长问题 | "如何找到人生方向"、60 字长问题 → `life-guidance` |
| | 默认 | "今天适合出门吗" → `single-card` |
| | 边界 | "热爱工作" 不含关系词 → 非 `relationship-cross` |
| | 平局 | 同时含关系+决策词 → 规则表靠前者 |

### 影响范围

- 新增：`lib/spread.ts`
- 修改：`lib/store.ts`（recommendSpread 委托纯函数）

### 风险与假设

- 假设：行为变化会改变既有推荐结果——以表驱动测试为验收基准。
- 风险：低。

---

## [G2] AI 解析健壮性（降级提取 + prompt 加固）

- **优先级**: 🟢
- **类别**: 质量提升
- **状态**: ⬜ 待开发
- **关联条目**: O3（parseStreamContent 产出）

### 问题描述

- 现状：结果页依赖 AI 输出严格包含 `## 🔮 深度解析过程` 与 `## 💡 核心建议` 小节（`app/result/page.tsx` L55–68 正则）；若模型未按结构输出，核心建议区永远不显示；分析区靠 L354 显示完整 `streamingContent` 兜底，但 `coreAdvice` 缺失无兜底。
- 影响：模型输出不稳定时功能降级不优雅。

### 目标

结构缺失时优雅降级：核心建议有兜底文案、分析区显示完整内容、不抛错不白屏；prompt 降低未命中概率。

### 验收标准

- [ ] 流完成但无 `## 💡` 节 → 核心建议区显示兜底文案（如固定文案），分析区显示完整内容
- [ ] prompt（`lib/deepseek.ts` L78–104）追加明确结构约束（必须包含两个小节、示例格式）
- [ ] 不抛错、不白屏

### 技术方案

1. `lib/stream-parse.ts`（O3 产出）保持返回 `coreAdvice: null`；UI 侧降级：`streamComplete && !coreAdvice` 时显示兜底文案（如"请结合以上解析，听从内心的声音"）。
2. `lib/deepseek.ts` prompt 末尾追加："务必严格包含 `## 🔮 深度解析过程` 与 `## 💡 核心建议` 两个小节，核心建议为单独一句话。"

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/stream-parse.test.ts` | 缺 💡 节 | 输入仅解析节 → `coreAdvice: null` |
| | 缺 🔮 节 | `analysis: null` |
| `app/result/__tests__/page.test.tsx` | 完成后无 advice 显示兜底 | mock 流完成且无 💡 → 核心建议区显示兜底文案 |
| | 完成后有 advice | 正常显示提取的 advice |

### 影响范围

- 修改：`lib/deepseek.ts`（prompt）、`app/result/page.tsx`（兜底文案）

### 风险与假设

- 假设：兜底文案风格与现有 UI 一致。
- 风险：低。

---

## [G3] .env.example 与部署文档

- **优先级**: 🟢
- **类别**: 文档
- **状态**: ⬜ 待开发

### 问题描述

- 现状：无 `.env.example`；`.gitignore` L37 的 `.env*` 连 `.env.example` 也一并忽略（git 无法跟踪示例文件）；README 只提及 `DEEPSEEK_API_KEY` 一个变量（R3 引入的 UPSTASH_* 未记录）。
- 影响：新环境配置靠猜。

### 目标

仓库含 `.env.example`，变量清单完整，README 部署章节引用它。

### 验收标准

- [ ] 仓库含 `.env.example`：`DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`（可选）、`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（可选），均带中文注释
- [ ] `.gitignore` 增加 `!.env.example` 例外，`.env.example` 可被 git 跟踪
- [ ] README 部署章节引用 `.env.example` 并说明 Vercel 环境变量配置

### 技术方案

新增 `.env.example`；`.gitignore` L37 后追加 `!.env.example`；README 补充。

### TDD 测试计划

文档类条目：手工验收。

### 影响范围

- 新增：`.env.example`
- 修改：`.gitignore`、`README.md`

### 风险与假设

- 假设：`.env.example` 只含占位值，不含真实密钥（安全约定）。
- 风险：无。

---

## [G4] 收尾：依赖审计、分支处置、可选 CI

- **优先级**: 🟢
- **类别**: 质量提升
- **状态**: ⬜ 待开发
- **关联条目**: O2（less-modules 分支处置依据）

### 问题描述

- 现状：无 `npm audit` 记录；`feature/less-modules` 分支方向与 O2 方案冲突（样式统一到 globals 后该分支失去意义，存在误合并风险）；无 CI 守护。
- 影响：依赖漏洞未知、分支状态不清、质量无自动守护。

### 目标

依赖安全、分支处置明确、可选 CI 模板就绪。

### 验收标准

- [ ] `npm audit` 无 high/critical 漏洞（或记录处理计划）
- [ ] README 注明 `feature/less-modules` 已废弃（被 O2 取代），避免误合并
- [ ] （可选）新增 `.github/workflows/ci.yml`：push/PR 运行 type-check、lint、test:run

### 技术方案

1. 执行 `npm audit`，高危项升级或记录计划（写入本条目备注）。
2. README 分支说明段落标注 less-modules 废弃状态。
3. CI workflow（可选）：

   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: npm }
         - run: npm ci
         - run: npm run type-check
         - run: npm run lint
         - run: npm run test:run
   ```

### TDD 测试计划

基础设施类：CI 上线后以流水线绿为验收；本地以三命令通过为验收。

### 影响范围

- 可选新增：`.github/workflows/ci.yml`
- 修改：`README.md`

### 风险与假设

- 假设：仓库启用 GitHub Actions（免费）；未启用则跳过 CI 部分。
- 风险：`npm audit` 若发现漏洞，按严重度安排修复或记录豁免理由。

---

## [G5] 每日熔断配额 + 管理开关接口

- **优先级**: 🟢
- **类别**: 质量提升（成本控制）
- **状态**: ✅ 完成

### 问题描述

- 现状：系统 Key 是免费试用的付费来源，仅有 deviceId 试用一次 + IP 限流，缺少全局成本熔断；用户（Key 持有者）无法在发布后控制系统 Key 的日用量。
- 需求（2026-08 用户确认）：每日用量上限 50 次（自然日 0 点起算），超限自动熔断（停止系统 Key，只允许用户自填 Key）；提供开关接口可随时关闭/开启熔断；**重新开启后从关闭时刻的计数继续，不清零**。

### 目标

1. 系统 Key 每天最多 50 次（上海时区自然日），超限熔断返回 `quota_exhausted`；
2. 管理接口可查询状态、开启/关闭熔断（Bearer ADMIN_TOKEN 认证）；
3. 关闭期间不计数不熔断；重新开启后从关闭时刻计数继续（不清零）；
4. Redis（Upstash）持久化，重启/跨实例不清零；未配置回退内存（开发）。

### 验收标准

- [ ] 每日 50 次：第 50 次放行，第 51 次返回 429 `quota_exhausted`（`needApiKey: true`）
- [ ] 自然日 0 点（Asia/Shanghai）计数归零
- [ ] 关闭开关：放行且不计数；重新开启：计数从关闭时刻继续（不清零）
- [ ] `GET/POST /api/admin/quota`：无/错误 token → 401；正确 token → 查询/切换成功
- [ ] 用户自带 Key 完全不受熔断影响
- [ ] 上游错误（非 200）不计数
- [ ] Redis 版跨实例持久化；内存版单实例回退

### 技术方案

- 新增 `lib/server/quota.ts`：`QuotaGuard`（`getStatus` / `setEnabled` / `consume` / `increment`），内存版（Map + 上海日期 key + 惰性清理）+ Redis 版（`quota:enabled`、`quota:count:<dateKey>` + `EXPIRE` 到当天 24:00），工厂 `getQuotaGuard()`（UPSTASH_* 环境变量决定）；
- 路由 `/api/deepseek-stream` 系统 key 路径：先配额熔断检查（`getStatus`），成功后 `increment`（与试用 markUsed 同处，上游错误不计数）；
- 管理接口 `app/api/admin/quota/route.ts`：`GET` 查询 / `POST {enabled}` 切换，`Authorization: Bearer <ADMIN_TOKEN>` 认证；
- 客户端 `lib/deepseek.ts` 识别 `quota_exhausted` → `onError`；result 页显示引导文案；
- 环境变量：`QUOTA_DAILY_LIMIT`（默认 50）、`ADMIN_TOKEN`（管理认证）、`UPSTASH_REDIS_REST_URL/TOKEN`。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/server/__tests__/quota.test.ts` | 计数累加/第 51 次熔断/关闭不计数/重开不清零/自然日归零/工厂回退 | 见用例 |
| `app/api/__tests__/admin-quota.route.test.ts` | 401/查询/切换/非布尔 400 | 见用例 |
| `app/api/__tests__/deepseek-stream.route.test.ts` | 熔断 429/关闭跳过/成功后 increment/上游错误不计数 | 见用例 |

### 影响范围

- 新增：`lib/server/quota.ts`、`app/api/admin/quota/route.ts` 及测试
- 修改：`app/api/deepseek-stream/route.ts`、`lib/deepseek.ts`、`app/result/page.tsx`
- 环境：`.env.local`（DEEPSEEK_API_KEY、QUOTA_DAILY_LIMIT、ADMIN_TOKEN）

### 风险与假设

- 假设：自然日以 Asia/Shanghai（UTC+8）为界；计数按"成功解析次数"，token 消耗监控留作后续。
- 风险：内存版重启即清零（仅开发）；生产必须配置 Upstash 才能持久化。
