# 部署文档

> indigo-tarot 的环境变量配置与部署指南。本地开发参考 [`README.md`](../README.md)。
>
> 当前生产环境为**腾讯云轻量应用服务器 + 自建 Redis**（`http://124.221.231.18`），实际部署执行记录见 [`MIGRATION_CN_ARCHIVE.md`](./MIGRATION_CN_ARCHIVE.md) §4；未完成待办与上线前安全清单见 [`MIGRATION_CN.md`](./MIGRATION_CN.md)。

## 一、环境变量清单

所有变量均为**服务端专用**（无 `NEXT_PUBLIC_` 前缀，不会暴露到浏览器）。

| 变量名 | 必填 | 默认值 | 用途 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ 必填 | — | 系统 Key：免费试用与每日熔断配额的资金来源 |
| `ADMIN_TOKEN` | ✅ 必填 | — | 管理接口 `/api/admin/quota` 的 Bearer 认证 |
| `REDIS_HOST` | ⚠️ 强烈推荐 | — | 试用/限流/配额计数的持久化存储地址 |
| `REDIS_PORT` | 可选 | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | ⚠️ 强烈推荐 | — | Redis 访问密码 |
| `QUOTA_DAILY_LIMIT` | 可选 | `50` | 系统 Key 每日熔断阈值 |
| `DEEPSEEK_API_URL` | 可选 | `https://api.deepseek.com/v1` | DeepSeek 接口地址 |

> 参考 [`.env.example`](../.env.example)（占位值，不含真实密钥）。
>
> **Redis 判定逻辑**：代码只认 `REDIS_HOST` + `REDIS_PASSWORD` 同时存在（见 [`lib/server/upstash.ts`](../lib/server/upstash.ts) 的 `hasRedisConfig()`）。二者缺一即回退**单实例内存**，服务重启/冷启动计数清零，免费试用会"复活"。

## 二、本地开发

```bash
npm install
cp .env.example .env.local   # 填写 DEEPSEEK_API_KEY 与 ADMIN_TOKEN
npm run dev                  # http://localhost:3000
```

本地通常不配 Redis（回退内存实现，重启清零）——验证"每设备一次试用"等行为时需注意此特性。若要本地复现生产行为，用 Docker 起一个 Redis 并填 `REDIS_*` 即可。

## 三、生产部署（腾讯云自建）

完整执行记录（购买、上传代码、安装 Node/Redis/PM2、防火墙）见 [`MIGRATION_CN_ARCHIVE.md`](./MIGRATION_CN_ARCHIVE.md) §4。要点：

1. **Redis 必须持久化**：`requirepass` 设强密码 + `appendonly yes`，且只监听 `127.0.0.1`（勿暴露公网）。
2. **环境变量写入服务器** `/root/indigo-tarot/.env.local`（权限 600）。
3. **构建与启动**：
   ```bash
   npm ci && npm run build
   pm2 start npm --name indigo-tarot -- start -- -p 80
   pm2 save && pm2 startup
   ```
4. **防火墙**只放行必要端口（22、80）。
5. 改环境变量后必须**重启 PM2 进程**才生效（`pm2 restart indigo-tarot`）。

> ⚠️ 当前生产为 **HTTP 明文直连**（无 HTTPS），`crypto.subtle` 不可用 → API Key「记住」功能失效（刷新丢 Key），属固有限制。详见 [`MIGRATION_CN.md`](./MIGRATION_CN.md) 三、已知限制。

## 四、成本控制（重要）

系统 Key 是免费试用的付费来源，控制成本按以下层次：

1. **硬上限（必须）**：DeepSeek 账户用**固定充值余额**（不用自动续费/信用卡扣款）——余额耗尽 API 自动 401，成本硬性封顶。
2. **代码层**：每日熔断 50 次（`/api/admin/quota` 可关/开）+ 每设备试用一次 + IP 限流 3h/5 次。
3. **持久化**：自建 Redis 的 AOF 保证计数重启不清零。

## 五、管理接口（配额开关）

```bash
# 查询状态（开关 + 当天计数 + 阈值）
curl http://<你的地址>/api/admin/quota \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 关闭熔断（不限制系统 Key）
curl -X POST http://<你的地址>/api/admin/quota \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled":false}'

# 开启熔断（恢复每日 50 次限制，计数从关闭时刻继续，不清零）
curl -X POST http://<你的地址>/api/admin/quota \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true}'
```

生成 ADMIN_TOKEN：

```bash
openssl rand -hex 16
```

> 用量明细（谁在什么时候用了多少）的查询方法见 [`MIGRATION_CN_ARCHIVE.md`](./MIGRATION_CN_ARCHIVE.md) §14。

## 六、上线前检查清单

- [ ] `DEEPSEEK_API_KEY` 已配置（系统 Key）
- [ ] `ADMIN_TOKEN` 已配置（**生产新值**，非本地/示例值）
- [ ] `REDIS_HOST` / `REDIS_PASSWORD` 已配置（否则计数不持久化，重启清零）
- [ ] Redis 已开启 AOF 且只监听 `127.0.0.1`
- [ ] 环境变量已配置并重启 PM2 进程
- [ ] DeepSeek 账户为固定充值余额
- [ ] 重启服务器后验证计数不重置（见 [`MIGRATION_CN.md`](./MIGRATION_CN.md) 待办 N4）
- [ ] 监控告警已配置（见 [`MIGRATION_CN.md`](./MIGRATION_CN.md) 待办 N1）
- [ ] 无痕窗口实测：不填 Key 占卜 1 次成功 → 再次占卜提示"免费试用已用完" → 填个人 Key 后可正常占卜

> Vercel 为历史部署平台，已停止使用（自动发布已关闭）；处置状态见 [`MIGRATION_CN.md`](./MIGRATION_CN.md) 疑点 Q2。
