# 🟢 G17：抽牌流程仪式化重做（连续选满 + 揭示浮层 + 棋盘填满）

- **优先级**: 🟢
- **类别**: 质量提升（交互）
- **状态**: 🚧 在飞（规格已定，待实现）
- **关联条目**: G8（点击即选 + 原位翻牌）、G9（平铺网格 + 减去已选牌）、G10（情况页/子页拆分）、G11（一行 8 张）、G15/D12（卡牌图片唯一小档）、O2（`mystical-*` 全局类）
- **关联决策**: **本条目部分推翻 D12 的适用边界**（见「设计决策」第 12 条）

## 问题描述

抽牌链路现为 `/` → `/draw`（情况页）→ `/draw/select`（选牌子页）→ `/draw` → `/result`，
**每选一张牌往返一次**（2N 次路由跳转），且整条链路有若干处结构性缺陷：

1. **揭示时刻被压缩到最小画布与零驻留**：`app/draw/select/page.tsx` 点牌后原位翻牌 `FLIP_DURATION_MS`（700ms），
   `setTimeout` 一到立刻 `router.push("/draw")`。用户看到牌面的时间恰好等于翻牌动画时长。
   而该牌在移动端仅约 **37.6px 宽**（8 列 + `gap-1.5`，375px 屏）。
   塔罗最有价值的一刻发生在全站最小的画布上，且不给驻留时间。
2. **位置记忆每次清零**：`remainingCards` 以 `filter` 减去已选牌并重排，选得越多网格漂移越厉害。
   该行为是 [G9 规格自己记录的已知风险](../../docs/archive/draw-interaction.md)（"网格重排会轻微跳动"），
   当时可接受的前提是"每次只选一张、选完就走"。连续选牌时该前提不成立。
3. **没有任何撤销能力**：`selectedSlots` 仅内存态，UI 无任何入口可修改已选牌；选错只能刷新重来。
4. **这副牌从未被洗过**：进入子页时 78 张牌已整齐码好，无任何随机性叙事。
   而洗牌是塔罗仪式中唯一由用户参与、把"随机"变成"我抽到的牌"的动作——缺了它，
   78 张平铺退化为"78 选 1 的随机数生成器"。
5. **子页无全局感**：连续决策过程中看不到已选了几张、长什么样、还剩几位。
6. **两处纯人为延迟**：首页提交后 666ms 假加载、情况页点解析后 500ms 全屏遮罩，底下均无异步任务。
7. **返回首页丢问题**：`/draw` 左上角回 `/`，而首页 `localQuestion` 硬编码 `useState("")`，store 里的 `question` 未回填。
8. **无 `prefers-reduced-motion` 处理**：全站 5 处 `repeat: Infinity` 无限动画。

## 目标

把抽牌从"逐张往返的选牌器"重做为**一段由用户掌控节奏的仪式**：

`/` → `/draw`（情况页）→ `/draw/select`（**洗牌进场 → 连续选满 → 一次返回**）→ `/result`

- **节奏由用户掌控**：揭示时长由用户点「继续」（或点浮层外）结束，不再由 `setTimeout` 决定；
- **往返从 2N 降到 2**：子页内连续选满，完成后一次回情况页；
- **棋盘填满**：网格位置全程不动，已选位留空坑，用户保有空间记忆；
- **不可逆**：不提供任何重选（见「设计决策」第 5 条）；
- **有洗牌**：进场播放一次洗牌动画，为 78 张牌赋予随机性叙事。

## 验收标准

### A. 选牌子页 `/draw/select`

- [ ] **A1 洗牌进场**：进入页面后播放一次洗牌动画（约 `SHUFFLE_DURATION_MS` = 1200ms），78 张牌由散乱/堆叠状态归位为 6 列网格；动画结束后才可点击
- [ ] **A2 网格 6 列**：网格容器 `gridTemplateColumns` 为 `repeat(6, minmax(0, 1fr))`；单张牌宽 ≥ 44px（375px 屏下约 50.5px）
- [ ] **A3 棋盘填满**：始终渲染全部 78 张牌位；已选牌的牌位渲染为**不可点的空坑**，其余牌位在 DOM 中位置不变（`data-index` 与网格位置一一对应，不因选牌而位移）
- [ ] **A4 常驻紧凑槽位条**：子页顶部显示牌阵名 + 紧凑槽位（已填显示牌面、当前待选位高亮）+ `已选 k / N`；用户全程无需离开子页即可掌握进度
- [ ] **A5 点击即落定**：点击牌背 → 立即写入 store（该位落定，不可逆）→ 原位 3D 翻牌；翻牌完成后**弹出揭示浮层**
- [ ] **A6 揭示浮层**：居中放大展示该牌，标注牌位名 + 牌名 + **正位/逆位** + 关键词；**不自动关闭**
- [ ] **A7 收起方式**：点「继续」按钮、点浮层外任意处、或按 ESC，三者均可收起；收起后留在 `/draw/select`（**不跳转**），该牌位变为空坑，紧凑槽位条更新，待选位前移
- [ ] **A8 连续选满**：选满 N 张前不离开子页；选满后底部出现「完成选牌」，点击 `push("/draw")`
- [ ] **A9 不可逆**：已选空坑与紧凑槽位条中的已填槽位均不可点击；无任何重选入口
- [ ] **A10 动画期间防误触**：翻牌/揭示期间点击其他牌无效；已落定的牌位不可重复选择
- [ ] **A11 退出语义**：左上角关闭按钮 `push("/draw")`，**退出 ≠ 放弃**——已选牌保留在 store，从情况页可再次进入接着选

### B. 选牌情况页 `/draw`

- [ ] **B1 去掉假等待**：点「开始解析」直接写入 store 并 `push("/result")`，**不再有 500ms 全屏遮罩**
- [ ] **B2 失效文案清除**：选牌子页的「剩 N 张 · 点击牌背即选 · **选完自动返回**」在新模型下已不成立，须替换为新交互的准确描述
- [ ] **B3 双入口保留**：点高亮空位与点「开始选牌」仍等价（均 `push("/draw/select")`）

### C. 首页 `/`

- [ ] **C1 去掉假等待**：提交问题后直接 `push("/draw")`，**不再有 666ms 假加载**
- [ ] **C2 问题回填**：从 `/draw` 返回首页时，问题输入框从 store 的 `question` 回填，不再要求重输

### D. 无障碍与动效

- [ ] **D1 `prefers-reduced-motion` 降级**：用户在系统开启"减弱动态效果"时，洗牌动画跳过、无限循环动画停用、翻牌改为淡入；由 `MotionConfig reducedMotion="user"`（覆盖 framer-motion）+ `globals.css` 的媒体查询（覆盖 CSS 动画）两层实现
- [ ] **D2 已知缺口登记**：键盘可达与屏幕阅读器支持**本轮不做**，作为已知缺口写入本文档「已知缺口」一节（不实现、不假装）

## 技术方案

### 1. `lib/drawFlow.ts`

- 新增常量 `SHUFFLE_DURATION_MS = 1200`。
- 保留 `FLIP_DURATION_MS`、`REVERSAL_PROBABILITY`、`randomReversal`、`firstEmptySlot`、`pickedIndexesFromSlots`、`buildPositionMeanings`。
- `pickedIndexesFromSlots` 语义不变，但消费方从"filter 掉已选牌"改为"渲染为空坑"。

### 2. `app/draw/select/page.tsx`（重写）

状态机：`shuffling → idle → flipping → revealing → complete`。

- **移除**：`setTimeout(FLIP_DURATION_MS)` 后自动 `router.push("/draw")` 的逻辑。
- **落定时序**：点击 → 立即写入 `selectedSlots`（落定）→ `flipIndex = index` → `FLIP_DURATION_MS` 后挂载揭示浮层。落定先于动画，保证"不可逆"名副其实。
- **网格**：`repeat(6, minmax(0, 1fr))`；渲染全部 78 张牌位，`pickedIndexesFromSlots` 命中的位置渲染空坑。
- **紧凑槽位条**：复用 `SpreadSlots` 的 `compact` 模式（该 prop 已存在但**当前无任何调用方**，本条目将其激活）。
- **洗牌**：进场时 78 张牌带随机初始位移/旋转，`SHUFFLE_DURATION_MS` 内归位；`useReducedMotion()` 为真时跳过。

### 3. `app/components/CardModal.tsx`（复用为揭示浮层，**不新建组件**）

`CardModal` 已具备揭示浮层所需的全部能力：居中放大、牌名、正/逆位、关键词、ESC 关闭、
点遮罩关闭（`onClick={onClose}` + 内容 `stopPropagation`），且它是 G15 契约中**唯一被枚举允许显式传 `sizes` 的组件**。

**唯一改动**：新增可选 prop `actionLabel?: string`——传入时在牌面下方渲染一个主按钮（点击调用 `onClose`）。
揭示浮层传 `actionLabel="继续"`；结果页沿用现状不传，行为不变。

> **这样做的理由**：新建一个 `RevealOverlay` 组件会（a）与 `CardModal` 职责重叠，违反 [AGENTS.md](../../AGENTS.md) 第 7 节奥卡姆剃刀；
> （b）**新增第二个 `sizes` 例外，直接冲击 G15/D12 的唯一小档不变量**（见「设计决策」第 12 条）。

### 4. 图片不变量

所有新增/改动的牌面渲染必须落在 `CARD_IMAGE_SIZES = "112px"` 的布局宽上限内：

| 位置 | 布局宽 | 是否越界 |
|---|---|---|
| 6 列网格单张 | 50.5px | ✅ |
| 紧凑槽位条（`w-16`） | 64px | ✅ |
| 情况页槽位（`w-24`） | 96px | ✅ |
| **揭示浮层（复用 CardModal，`sizes="320px"`）** | 256px | ✅ 走既有例外通道 |

改列数（6 → 其他）前必须复算该表并跑 `tests/card-image-variant.test.ts`。

### 5. 首页 `app/page.tsx`

- 删除 `setTimeout(..., 666)`，改为同步 `resetSession()` + `setQuestion()` 后直接 `router.push("/draw")`。
- `localQuestion` 初值改为从 store 读取当前 `question`，实现 C2 回填。

### 6. `app/layout.tsx` + `app/globals.css`

- `layout.tsx` 外层包 `<MotionConfig reducedMotion="user">`。
- `globals.css` 增加 `@media (prefers-reduced-motion: reduce)` 块，停用 `animate-pulse` 与 `.stars` 的 `@keyframes twinkle`。

## TDD 测试计划

> Red 阶段必须完成的测试清单；对应测试未通过（红）之前，不得开始实现（Green）。

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/draw/select/__tests__/page.test.tsx` | A2 网格 6 列 | 容器 `gridTemplateColumns` 含 `repeat(6, minmax(0, 1fr))`；78 个牌位 |
| `app/draw/select/__tests__/page.test.tsx` | A3 棋盘填满 | 选中 `data-index="7"` 后，该位置变为空坑（不可点）；`data-index="8"` 仍在原 DOM 序位（相邻兄弟关系不变） |
| `app/draw/select/__tests__/page.test.tsx` | A4 紧凑槽位条 | 子页顶部存在紧凑槽位条；已选 N 张后其文本含 `已选 N / M`；当前待选位高亮 |
| `app/draw/select/__tests__/page.test.tsx` | A5+A6 点击即落定并揭示 | 点牌后牌面挂载、揭示浮层出现；浮层含牌位名、牌名、正/逆位文案 |
| `app/draw/select/__tests__/page.test.tsx` | A7 三种收起方式 | 点「继续」/ 点浮层遮罩 / 按 ESC 均关闭浮层，且 **`router.push` 未被调用**（停留在子页） |
| `app/draw/select/__tests__/page.test.tsx` | A7 收起后状态推进 | 收起后该位为空坑、紧凑槽位条计数 +1、待选位前移 |
| `app/draw/select/__tests__/page.test.tsx` | A8 连续选满 | 连续选满 M 张全程不调用 `router.push`；选满后出现「完成选牌」，点击 `push("/draw")` |
| `app/draw/select/__tests__/page.test.tsx` | A9 不可逆 | 点击已选空坑无反应；无任何"重选/换一张"控件存在于 DOM |
| `app/draw/select/__tests__/page.test.tsx` | A10 防误触 | 翻牌/揭示期间点其他牌不改变 `selectedSlots` |
| `app/draw/select/__tests__/page.test.tsx` | A11 退出不放弃 | 关闭按钮 `push("/draw")`；返回后 store 中 `selectedSlots` 保持已选内容 |
| `app/draw/select/__tests__/page.test.tsx` | A1 洗牌（reduced-motion 跳过） | mock `useReducedMotion` 为 `true` 时进场即可点击；为 `false` 时 `SHUFFLE_DURATION_MS` 内点击无效 |
| `app/draw/__tests__/page.test.tsx` | B1 去掉假等待 | 点「开始解析」后立即 `push("/result")`（无计时器推进）；DOM 中无全屏加载遮罩 |
| `app/draw/select/__tests__/page.test.tsx` | B2 失效文案清除 | 选牌子页不含「选完自动返回」与「剩 N 张」 |
| `app/__tests__/page.test.tsx` | C1 去掉假等待 | 提交问题后不推进计时器即 `push("/draw")` |
| `app/__tests__/page.test.tsx` | C2 问题回填 | store 中 `question` 非空时，输入框 `value` 等于该问题 |
| `app/components/__tests__/CardModal.test.tsx` | `actionLabel` 主按钮 | 传 `actionLabel="继续"` 时渲染该按钮，点击调用 `onClose`；不传时无该按钮（结果页行为不变） |
| `app/components/__tests__/CardModal.test.tsx` | 既有行为回归 | ESC / 点遮罩 / 点关闭按钮的既有断言全部保持通过 |
| `tests/css-contract.test.ts` | D1 reduced-motion 契约 | `globals.css` 含 `@media (prefers-reduced-motion: reduce)` 块，且块内覆盖 `animate-pulse` 与 `twinkle` |
| `tests/card-image-variant.test.ts` | 图片不变量回归 | 既有 7 条断言全绿；`sizes` 例外仍**只有** `CardModal.tsx` 一处（本条目复用而非新增例外） |

## 影响范围

**新增**
- `docs/plan/g17-draw-ritual.md`（本文）
- （测试）`app/draw/select/__tests__/page.test.tsx` 大幅扩写

**修改**
- `app/draw/select/page.tsx`（重写：连续选满 + 棋盘填满 + 洗牌 + 揭示浮层 + 紧凑槽位条）
- `app/draw/page.tsx`（B1 去遮罩、B2 文案收敛）
- `app/page.tsx`（C1 去假加载、C2 问题回填）
- `app/components/CardModal.tsx`（新增可选 `actionLabel`）
- `app/layout.tsx`（`MotionConfig reducedMotion="user"`）
- `app/globals.css`（`prefers-reduced-motion` 块）
- `lib/drawFlow.ts`（新增 `SHUFFLE_DURATION_MS`）
- `tests/css-contract.test.ts`（新增 D1 契约）
- `docs/archive/draw-interaction.md`（G9/G10/G11 就地补「后续变更」指针，**不改写历史结论**）

**删除**
- 无文件删除。`SpreadSlots` 的 `compact` 分支由死代码转为活代码（`tests/no-dead-code.test.ts` 无影响）。

## 风险与假设

- **风险（高）｜不可逆 + 热区仅 50.5px，误触无兜底**：设计决策第 5、6 条明确拒绝重选与确认按钮，
  使误触代价从"再点一次"提升为"整局作废"。热区由 37.6px 提升到 50.5px 只是缓解，不是解决。
  **本风险由负责人明确接受**，记录在此而非以隐藏的确认弹窗规避。若真机验证误触率偏高，第一备选是
  上浮到 5 列（60.6px），第二备选是重开"揭示浮层内换一张"（即撤销决策 6）。
- **风险（中）｜7 张牌阵要经历 7 次「浮层弹出 + 收起」**：连续性仪式在重复 5 次之后是否变成负担，只有真机可验。
  缓解：收起通道有三条（按钮 / 点浮层外 / ESC），其中点浮层外与 ESC 的摩擦接近零。
- **风险（中）｜洗牌动画与 78 张牌的渲染性能**：78 个带 `transform` 的入场动画在低端机上可能掉帧。
  reduced-motion 路径天然规避；需真机验证普通路径。
- ~~**风险（低）｜`MotionConfig` 的可用性**~~：**已核实**——`framer-motion@12.33.0` 的 `MotionConfig` 与 `useReducedMotion` 均为可解析导出（`typeof === "function"`），本风险消除。
- **假设**：揭示浮层复用 `CardModal` 不改变其在结果页的既有行为（新增 prop 可选、默认不渲染按钮）。
- **假设**：`SpreadSlots` 的 `compact` 模式尺寸（`w-16 h-24`）足以承载 7 槽位而不在移动端严重换行；若换行过多需调整尺寸。

## 设计决策（本次对齐结论）

> 本节记录决策及其**推翻了哪条既有规格**。收口归档时，其中具长期性的条目移入 `docs/README.md` 的「决策记录」。

| # | 决策 | 影响 |
|---|---|---|
| 1 | 抽牌流程第一优先级 = **仪式感** | 定性决策，其余全部由它推导 |
| 2 | 子页内**连续选满**，完成后一次返回 | **推翻 G10**「点选一张 → 自动返回 /draw」；往返 2N → 2 |
| 3 | 揭示 = **居中放大浮层**，停留至用户收起 | 新增；替掉 38px 画布 + 700ms 零驻留 |
| 4 | 网格 = **棋盘填满**（保留原位 + 空坑） | **推翻 G9**「选过的牌从牌堆中减去（不再渲染、网格重排）」 |
| 5 | **不可逆**：不提供任何重选 | 明确拒绝"任意重选/线性回退/重新抽牌"三种方案 |
| 6 | **点击即落定**，揭示浮层只做展示、无确认 | 明确拒绝"浮层内换一张"与"长按松手落定" |
| 7 | 网格 **6 列**（37.6px → 50.5px） | 改 **G11** 的 `repeat(8, ...)`；恰好跨过 44px 热区门槛 |
| 8 | 进场**洗一次牌**（约 1.2s 动画） | 新增；不引入任何手势（G9 已移除手势，本条目不恢复） |
| 9 | 子页顶部**常驻紧凑槽位条** | 新增；激活 `SpreadSlots` 无调用方的 `compact` 分支 |
| 10 | 无障碍**只做 `prefers-reduced-motion`** | 键盘可达与屏幕阅读器明确列为已知缺口 |
| 11 | 清掉 666ms / 500ms 假等待 + 回填首页问题 | 链路省 1.2s；修复 C2 缺陷 |
| 12 | 揭示浮层**复用 `CardModal`** 而非新建组件（**负责人已确认**，含其 `actionLabel` 公共 API 变更） | 避免新增第二个 `sizes` 例外，守住 G15/D12 唯一小档不变量；符合奥卡姆剃刀 |
| 13 | 浮层收起除按钮外，**支持点浮层外任意处** | `CardModal` 既有行为，复用即得 |

## 已知缺口（本轮明确不实现）

按 [AGENTS.md](../../AGENTS.md) 第 1 节「能力不够就停下来报告差距，而不是假装做完」，
以下为**已知且被明确接受**的缺口，不以"已支持无障碍"含糊表述：

- **键盘不可达**：`GridCard` 为裸 `<div onClick>`，无 `role="button"`、无 `tabIndex`、无键盘事件处理。
  键盘用户**无法完成选牌**。
- **屏幕阅读器体验错误**：`aria-label` 为 `牌 1` … `牌 78`，对 SR 用户是 78 个无差别选项。
  正确心智模型应是「从牌堆抽一张」这一**动作**，而非 78 选 1；本轮未实现该替代路径。
- **揭示浮层无 `aria-live` 播报**：选牌结果不向 SR 用户播报。

## 收口动作（完成时执行，非现在）

- [ ] `README.md` 功能特色第 2 条「流畅抽牌体验（8 列）」同步为新交互形态
      —— **经负责人确认，此项推迟到验收时执行，不在实现阶段改动**
      （依 [AGENTS.md](../../AGENTS.md) 第 1 节，约束是"完成之前更新文档"，而非"编码之前"）
- [ ] `docs/README.md`「条目状态」补 G17 一行；若第 12 条被认定为长期决策，同步补入「决策记录」D14
- [ ] `docs/archive/draw-interaction.md` 的 G9/G10/G11 各补一行「后续变更」（**不改写历史结论**）
- [ ] 本文移入 `docs/archive/g17-draw-ritual.md`，顶部加归档日期与"不描述当前状态"声明
- [ ] 跨 `代码 / docs/ / tests/` grep `8 列`、`选完自动返回`、`减去已选` 等术语，消除不一致
