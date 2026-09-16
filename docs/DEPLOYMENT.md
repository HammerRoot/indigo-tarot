# 部署文档

> **本文只负责**：环境变量、本地开发、生产部署步骤、成本控制、管理接口、上线检查清单。
> **本文不写**：迁移历史与事故经过（→ [`archive/`](./archive/)）、运维待办与当前状态
> （→ [`OPERATIONS.md`](./OPERATIONS.md)）、代码条目状态（→ [`README.md`](./README.md)）。
>
> indigo-tarot 的环境变量配置与部署指南。本地开发参考 [`README.md`](../README.md)。
>
> 当前生产环境为**腾讯云轻量应用服务器 + 自建 Redis**（`http://<SERVER_IP>`），实际部署执行记录见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §4；未完成待办与上线前安全清单见 [`OPERATIONS.md`](./OPERATIONS.md)。

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

完整执行记录（购买、上传代码、安装 Node/Redis/PM2、防火墙）见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §4。要点：

1. **Redis 必须持久化**：`requirepass` 设强密码 + `appendonly yes`，且只监听 `127.0.0.1`（勿暴露公网）。
2. **环境变量写入服务器** `/root/indigo-tarot/.env.local`（权限 600）。
3. **构建与启动**（注意应用监听 **3000**，80 由 Nginx 占用）：
   ```bash
   npm ci && npm run build
   pm2 start npm --name indigo-tarot --max-memory-restart 500M -- start -- -p 3000
   pm2 save && pm2 startup
   ```
4. **Nginx 反向代理**（对外 80 → 应用 3000）：
   - 作用之一是**覆写 `X-Forwarded-For`**，使 IP 限流无法被客户端伪造的请求头绕过（详见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §16）；
   - 配置中 `proxy_buffering off` 是**必需项**——否则 SSE 逐字输出会退化成一次性刷出；
   - 配置文件 `/etc/nginx/sites-available/indigo-tarot`（完整内容见归档 §16.3）。
5. **防火墙**只放行必要端口（22、80）。
6. 改环境变量后必须**重启 PM2 进程**才生效（`pm2 restart indigo-tarot`，无需重新 build）。
7. ⚠️ 若需重建 PM2 进程，务必带上 `-p 3000 --max-memory-restart 500M` 并执行 `pm2 save`，否则重启后应用会回到 80 端口与 Nginx 冲突。

> ⚠️ 当前生产为 **HTTP 明文直连**（无 HTTPS），`crypto.subtle` 不可用 → API Key「记住」功能失效（刷新丢 Key），属固有限制。详见 [`OPERATIONS.md`](./OPERATIONS.md) 三、已知限制。

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

## 五之二、来源审计统计（聚合）

```bash
# 最近 7 天（默认）
curl http://<你的地址>/api/admin/stats \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 最近 30 天（上限 30）
curl "http://<你的地址>/api/admin/stats?days=30" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

返回示例：

```json
{
  "days": 7,
  "stats": [
    { "date": "2026-09-16", "calls": 12, "systemKey": 9, "userKey": 3, "failures": 1, "distinctDevices": 5 }
  ]
}
```

> **隐私边界**：该接口只返回聚合数字。不记录问题内容、不记录 IP、不记录单次调用明细；去重设备数用 Redis HyperLogLog 估算，服务端不保存原始设备标识。聚合数据保留 30 天后自动过期。
>
> 需要**更底层的排查**（如查某个 IP 的限流键、Redis 原始键结构）见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §14 的 redis-cli 速查。

## 六、上线前检查清单

- [ ] `DEEPSEEK_API_KEY` 已配置（系统 Key）
- [ ] `ADMIN_TOKEN` 已配置（**生产新值**，非本地/示例值）
- [ ] `REDIS_HOST` / `REDIS_PASSWORD` 已配置（否则计数不持久化，重启清零）
- [ ] Redis 已开启 AOF 且只监听 `127.0.0.1`
- [ ] 环境变量已配置并重启 PM2 进程
- [ ] DeepSeek 账户为固定充值余额
- [x] 重启服务器后验证计数不重置（✅ 2026-09-16 实测通过，见 [`OPERATIONS.md`](./OPERATIONS.md) 台账 N4）
- [x] 监控告警已配置（✅ 2026-09-16 完成，见 [`OPERATIONS.md`](./OPERATIONS.md) 台账 N1）
- [ ] 无痕窗口实测：不填 Key 占卜 1 次成功 → 再次占卜提示"免费试用已用完" → 填个人 Key 后可正常占卜

> Vercel 为历史部署平台，已停用并删除；历史处置记录见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §12。
