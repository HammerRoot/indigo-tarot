# 部署文档（Vercel）

> indigo-tarot 的 Vercel 部署与环境变量配置指南。本地开发参考 `README.md`。

## 一、环境变量清单

所有变量均为**服务端专用**（无 `NEXT_PUBLIC_` 前缀，不会暴露到浏览器）。

| 变量名 | 必填 | 默认值 | 用途 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ 必填 | — | 系统 Key：免费试用与每日熔断配额的资金来源 |
| `ADMIN_TOKEN` | ✅ 必填 | — | 管理接口 `/api/admin/quota` 的 Bearer 认证 |
| `UPSTASH_REDIS_REST_URL` | ⚠️ 强烈推荐 | — | 试用/限流/配额计数跨实例 + 持久化 |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ 强烈推荐 | — | 同上 |
| `QUOTA_DAILY_LIMIT` | 可选 | `50` | 系统 Key 每日熔断阈值 |
| `DEEPSEEK_API_URL` | 可选 | `https://api.deepseek.com/v1` | DeepSeek 接口地址 |

> 参考 `.env.example`（占位值，不含真实密钥）。

## 二、部署步骤

### 1. 连接仓库

方式 A（控制台）：
1. https://vercel.com → **Add New → Project**
2. 选择 `HammerRoot/indigo-tarot` 仓库 → 框架自动识别 Next.js → **Deploy**

方式 B（CLI）：
```bash
npm i -g vercel
vercel login
vercel
```

### 2. 配置环境变量

控制台：项目 → **Settings → Environment Variables**，逐个添加（见上表），环境勾选 **Production**（Preview 按需）。

⚠️ 配置完成后回到 **Deployments → 最新部署 → ⋯ → Redeploy**，环境变量**重新部署后才生效**。

### 3. 获取 Upstash Redis（生产强烈推荐）

不配置 Upstash 时，试用/限流/配额计数走**单实例内存**：多实例部署下不共享、重启即清零（含免费试用"一人一次"和每日 50 次配额都会失效）。

- 方式 A（最省事）：Vercel 项目 → **Integrations → Marketplace** → 搜索 **Upstash** → 安装，自动创建 Redis 并注入两个变量。
- 方式 B：https://console.upstash.com → 创建 Redis → 复制 **REST URL**（`https://xxx.upstash.io`）与 **REST Token** → 手动填入 Vercel。

## 三、成本控制（重要）

系统 Key 是免费试用的付费来源，控制成本按以下层次：

1. **硬上限（必须）**：DeepSeek 账户用**固定充值余额**（不用自动续费/信用卡扣款）——余额耗尽 API 自动 401，成本硬性封顶。
2. **代码层**：每日熔断 50 次（`/api/admin/quota` 可关/开）+ 每设备试用一次 + IP 限流 3h/5 次。
3. **持久化**：Upstash 保证计数跨实例、重启不清零。

## 四、管理接口（配额开关）

```bash
# 查询状态（开关 + 当天计数 + 阈值）
curl https://<你的域名>/api/admin/quota \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 关闭熔断（不限制系统 Key）
curl -X POST https://<你的域名>/api/admin/quota \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# 开启熔断（恢复每日 50 次限制，计数从关闭时刻继续，不清零）
curl -X POST https://<你的域名>/api/admin/quota \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

生成 ADMIN_TOKEN：
```bash
openssl rand -hex 16
```

## 五、上线前检查清单

- [ ] `DEEPSEEK_API_KEY` 已配置（系统 Key）
- [ ] `ADMIN_TOKEN` 已配置（**生产新值**，非本地/示例值）
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` 已配置（否则计数不持久化）
- [ ] 环境变量已 Redeploy
- [ ] DeepSeek 账户为固定充值余额
- [ ] 无痕窗口实测：不填 Key 占卜 1 次成功 → 再次占卜提示"免费试用已用完" → 填个人 Key 后可正常占卜
