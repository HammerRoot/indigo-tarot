# 🔮 塔罗占卜 Web 应用

一个基于 AI 的现代化塔罗牌占卜应用，提供智能牌阵推荐、流畅抽牌体验和深度解析。

> **本文只负责**：面向使用者的功能说明、技术栈、快速开始、API 契约、隐私边界。
> **本文不写**：部署步骤（→ [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)）、运维待办与现状
> （→ [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)）、代码条目状态与决策记录。
> **文档总览、规格台账与单一源规则见 [`docs/README.md`](./docs/README.md)。**

## ✨ 功能特色

- **🤖 AI智能推荐** - 根据你的问题自动推荐最适合的塔罗牌阵
- **🎭 沉浸抽牌仪式** - 每局洗牌（78 张 6 列平铺盲选）、点击即落定、卡牌旋转放大揭示、确认后缩回牌阵原位
- **🧠 深度AI解析** - 结合问题背景，提供个性化的塔罗解读和指引
- **📚 历史记录** - 本地保存你的占卜历史，随时回顾

## 🛠️ 技术栈

- **前端框架**: Next.js 16 (React 19) + TypeScript
- **样式设计**: Tailwind CSS 4 + Framer Motion
- **状态管理**: Zustand
- **测试**: Vitest + React Testing Library
- **AI服务**: DeepSeek API（流式 SSE）
- **部署形态**: 自建服务器 + 自建 Redis（详见 [`docs/OPERATIONS.md`](./docs/OPERATIONS.md)）

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd indigo-tarot
   ```

2. **安装依赖**

   ```bash
   npm install  # 🎉 Git hooks 自动安装！
   ```

3. **配置环境变量**

   复制 `.env.example` 为 `.env.local` 并填写：

   ```bash
   cp .env.example .env.local
   ```

   环境变量**完整清单以 [`.env.example`](./.env.example) 为唯一出处**（含必填项与可选项及中文注释），
   各项用途见 [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)。本文不复述变量列表，以免与两处漂移。

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

> 📦 **部署**：见 [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)（环境变量配置、自建 Redis、成本控制、管理接口）。

5. **访问应用**

   打开浏览器访问 [http://localhost:3000](http://localhost:3000)

6. **代码质量检查**

   ```bash
   npm run lint          # ESLint检查
   npm run lint:fix      # 自动修复ESLint问题
   npm run type-check    # TypeScript类型检查
   npm run test:run      # 运行全量测试（Vitest）
   npm run pre-commit    # 完整的提交前检查（type-check + lint）
   ```

### 🔒 自动代码质量检查

项目配置了Git hooks，每次`git commit`时自动运行（`.husky/pre-commit` 执行 `npm run pre-commit` = type-check + lint）：

- **TypeScript类型检查** - 确保类型安全
- **ESLint代码规范** - 确保代码质量

检查失败会阻止提交，保障代码质量。紧急情况可使用`git commit --no-verify`跳过检查。

## 📖 使用指南

### 基础占卜流程

1. **输入问题** - 在首页输入你想要占卜的问题或困惑
2. **选择牌阵** - AI会根据你的问题推荐最适合的塔罗牌阵
3. **抽取卡牌** - 进入选牌页：整副牌洗好后平铺，点击牌背即落定，
   该牌旋转放大到屏幕中央展示牌位/牌名/正逆位/关键词；确认后缩回牌阵原位。
   **选牌不可逆**（抽出的牌不塞回牌堆）；选满前可随时退出，进度保留
4. **获得解析** - 查看详细的AI解读和建议指引
5. **保存记录** - 占卜结果会自动保存到历史记录中

> 抽牌是全盲选：78 张牌背外观一致，点哪张得哪张；每局开始时整副牌重新洗过。

### 塔罗牌阵类型

- **单张牌指引** - 1 张牌，适合简单问题或日常指引
- **时间之流** - 3 张牌（过去-现在-未来），适合时间线问题
- **情感十字** - 4 张牌，专门解读爱情与人际关系
- **选择之路** - 5 张牌，帮助做出重要决定
- **生命指引** - 7 张牌，全面的人生指导

> 牌阵由 AI 根据问题内容智能推荐（评分制，规格 G1）。

## 🧩 塔罗牌体系

本应用基于完整的**韦特塔罗78张**体系：

- **大阿卡纳** (Major Arcana): 22张主牌，代表人生重大课题
- **小阿卡纳** (Minor Arcana): 56张副牌，代表日常生活各个方面
  - 权杖 (Wands): 火元素，代表行动和创造
  - 圣杯 (Cups): 水元素，代表情感和精神
  - 宝剑 (Swords): 风元素，代表思想和沟通
  - 钱币 (Pentacles): 土元素，代表物质和实践

## 📝 API 文档

### DeepSeek AI 解析接口（流式 SSE）

**POST** `/api/deepseek-stream`

请求体：

```json
{
  "prompt": "AI 提示词（含问题与抽牌信息）",
  "userApiKey": "用户自带的 DeepSeek API Key（可选）"
}
```

响应：`text/event-stream` 流式事件，帧格式 `data: {json}\n\n`：

- `{ "type": "meta", "usingSystemKey": true, "remainingCalls": 1, "trialUsed": false }` — 开头元信息（`remainingCalls` 为系统 Key 试用余量：未用 1 / 已用 0；开发环境为 `null`）
- `{ "type": "content", "content": "文本片段" }` — AI 增量内容
- `{ "type": "complete" }` — 流结束

系统 Key 路径的守卫顺序：每日配额熔断（默认 50 次/天，已超限直接 429 且不消耗）→ 免费试用（每设备 1 次）→ IP 限流（3 小时 5 次）→ 调用成功后计数并标记该设备已试用。用户自带 Key 不经过以上限制。

### 建议问题接口

**GET** `/api/suggested-questions` — 从 6 个类别（love / career / relationships / personal / finance / health）中
随机抽取 3 个不同类别、每类取 1 个问题返回，即 `{ questions: [...] }`（3 条，非按类别分组返回）。

### 免费试用状态接口

**GET** `/api/health` — 健康检查端点，供外部监控探测。正常返回 `200 {"status":"ok","checks":{"redis":"ok"}}`；Redis 配置了却连不上时返回 `503 {"status":"degraded",...}`（此时首页仍返回 200，纯页面探测发现不了）。

**GET** `/api/trial-status` — 返回当前设备的免费试用状态（需携带 `X-Device-Id` 请求头）：

```json
{ "trialUsed": false, "remaining": 1 }
```

页面加载时调用，用于刷新/重开页面后同步真实试用余量（**服务端为权威**，客户端本地状态仅作缓存）。

## 🔒 隐私与数据

- **本地存储**: 历史记录与 API Key 仅保存在用户浏览器本地；API Key 经 **AES-GCM 加密**后存储（密文在 localStorage，会话密钥在 sessionStorage，关闭浏览器后需重新输入）
- **API安全**: DeepSeek API 密钥仅在服务端调用时使用；未配置个人密钥时使用系统密钥（免费试用每设备 1 次 + IP 限流 3 小时 5 次 + 每日配额默认 50 次，见 [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)）
- **加密边界**: 浏览器端加密可防静态窃取（扩展扫描/磁盘取证），**无法防恶意脚本/浏览器扩展**（解密在客户端进行）——这就是 R1 同时做 AI 输出 XSS 消毒（`react-markdown` 默认转义、无 `dangerouslySetInnerHTML`）的原因；生产环境启用 CSP（`next.config.ts`）限制脚本来源
- **免费试用边界**: 无登录系统，"每人一次"为尽力而为——清除 localStorage / 换浏览器 / 无痕模式可绕过，IP 限流作为辅助防线；服务端试用记录存于 Redis（生产推荐，跨实例且重启不失效），未配置 Redis 时回退单实例内存，**服务重启/冷启动即清零**（本地开发验证时注意此行为）
- **统计边界**: 服务端**仅记录匿名聚合计数**——每日调用总数、系统 Key 次数、用户 Key 次数、失败次数、去重设备数。其中去重设备数用 Redis **HyperLogLog** 估算（固定大小的基数草图），**服务端不保存原始设备标识**。**不记录问题内容、不记录 IP、不记录单次调用明细**；聚合数据保留 30 天。查询接口为 `GET /api/admin/stats`（需 Bearer 鉴权）

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 项目地址: [GitHub Repository](https://github.com/HammerRoot/indigo-tarot.git)
- 问题反馈: [GitHub Issues](https://github.com/HammerRoot/indigo-tarot/issues)

---

**🌟 如果这个项目对你有帮助，请给个 Star ⭐**

_"塔罗不是预测未来，而是照见内心的明镜"_