# 🔮 塔罗占卜 Web 应用

一个基于 AI 的现代化塔罗牌占卜应用，提供智能牌阵推荐、流畅抽牌体验和深度解析。

## ✨ 功能特色

- **🤖 AI智能推荐** - 根据你的问题自动推荐最适合的塔罗牌阵
- **🎭 流畅抽牌体验** - 3D翻牌动画、洗牌效果、触感反馈
- **🧠 深度AI解析** - 结合问题背景，提供个性化的塔罗解读和指引
- **📚 历史记录** - 本地保存你的占卜历史，随时回顾
- **🎨 精美界面** - 专业神秘的视觉设计，响应式布局

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (React) + TypeScript
- **样式设计**: Tailwind CSS + Framer Motion
- **状态管理**: Zustand
- **AI服务**: DeepSeek API
- **部署平台**: Vercel

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd taro-you
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **配置环境变量**

   创建 `.env.local` 文件：

   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

4. **启动开发服务器**

   ```bash
   npm run dev
   ```

5. **访问应用**

   打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## 📖 使用指南

### 基础占卜流程

1. **输入问题** - 在首页输入你想要占卜的问题或困惑
2. **选择牌阵** - AI会根据你的问题推荐最适合的塔罗牌阵
3. **抽取卡牌** - 通过流畅的动画交互抽取塔罗牌
4. **获得解析** - 查看详细的AI解读和建议指引
5. **保存记录** - 占卜结果会自动保存到历史记录中

### 塔罗牌阵类型

- **单张牌** - 适合简单问题或日常指引
- **三牌阵** - 过去-现在-未来，适合时间线问题
- **celtic cross** - 凯尔特十字，适合复杂人生问题
- **关系牌阵** - 专门用于情感和人际关系问题

## 🗂️ 项目结构

```
taro-you/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   └── deepseek/      # AI解析接口
│   ├── draw/              # 抽牌页面
│   ├── result/            # 结果展示页面
│   ├── globals.css        # 全局样式
│   └── page.tsx           # 首页
├── lib/                   # 工具库
│   ├── deepseek.ts        # AI API调用
│   ├── store.ts           # 状态管理
│   └── tarot-data.ts      # 塔罗牌数据
├── public/                # 静态资源
└── ...配置文件
```

## 🎯 开发计划

### ✅ v1.0 MVP (已完成)

- [x] 用户问题输入
- [x] AI智能牌阵推荐
- [x] 流畅抽牌动画
- [x] AI深度解析
- [x] 历史记录功能
- [x] 响应式UI设计

### 🚀 v2.0 计划功能

- [ ] 用户注册登录系统
- [ ] 用户反馈功能
- [ ] 社交分享功能
- [ ] 多语言支持
- [ ] 微信小程序版本
- [ ] 高级牌阵和解读

## 🧩 塔罗牌体系

本应用基于完整的**韦特塔罗78张**体系：

- **大阿卡纳** (Major Arcana): 22张主牌，代表人生重大课题
- **小阿卡纳** (Minor Arcana): 56张副牌，代表日常生活各个方面
  - 权杖 (Wands): 火元素，代表行动和创造
  - 圣杯 (Cups): 水元素，代表情感和精神
  - 宝剑 (Swords): 风元素，代表思想和沟通
  - 钱币 (Pentacles): 土元素，代表物质和实践

## 🔧 开发命令

```bash
# 开发环境启动
npm run dev

# 生产构建
npm run build

# 生产环境启动
npm run start

# 代码检查
npm run lint
```

## 📝 API 文档

### DeepSeek AI 解析接口

**POST** `/api/deepseek`

请求体：

```json
{
  "question": "用户的问题",
  "cards": ["卡牌1", "卡牌2", "卡牌3"],
  "layout": "牌阵类型"
}
```

响应：

```json
{
  "interpretation": "AI解析结果"
}
```

## 🔒 隐私与数据

- **本地存储**: 历史记录仅保存在用户浏览器本地
- **API安全**: DeepSeek API密钥仅在服务端使用
- **无用户追踪**: 不收集任何个人敏感信息

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 项目地址: [GitHub Repository](https://github.com/HammerRoot/tarot-u.git)
- 问题反馈: [[GitHub Issues]](https://github.com/HammerRoot/tarot-u/issues)

---

**🌟 如果这个项目对你有帮助，请给个 Star ⭐**

_"塔罗不是预测未来，而是照见内心的明镜"_
