# 部署文档

> **本文只负责**：环境变量、本地开发、生产部署步骤、成本控制、管理接口、上线检查清单。
> **本文不写**：迁移历史与事故经过（→ [`archive/`](./archive/)）、运维待办与当前状态
> （→ [`OPERATIONS.md`](./OPERATIONS.md)）、条目状态与决策记录（→ [`SPEC.md`](./SPEC.md)）。
>
> indigo-tarot 的环境变量配置与部署指南。本地开发参考 [`README.md`](../README.md)。
>
> 当前生产环境为**腾讯云轻量应用服务器 + 自建 Redis**（`http://<SERVER_IP>/`）。

## 一、环境变量清单

所有变量均为**服务端专用**（无 `NEXT_PUBLIC_` 前缀，不会暴露到浏览器）。

| 变量名 | 必填 | 默认值 | 用途 |
|---|---|---|---|
| `DEEPSEEK_API_KEY` | ✅ 必填 | — | 系统 Key：免费试用与每日熔断配额的资金来源 |
| `ADMIN_TOKEN` | ✅ 必填 | — | 管理接口 `/api/admin/quota`、`/api/admin/stats` 的 Bearer 认证 |
| `REDIS_HOST` | ⚠️ 强烈推荐 | — | 试用/限流/配额计数的持久化存储地址 |
| `REDIS_PORT` | 可选 | `6379` | Redis 端口 |
| `REDIS_PASSWORD` | ⚠️ 强烈推荐 | — | Redis 访问密码 |
| `QUOTA_DAILY_LIMIT` | 可选 | `50` | 系统 Key 每日熔断阈值 |
| `DEEPSEEK_API_URL` | 可选 | `https://api.deepseek.com/v1` | DeepSeek 接口地址 |

> 参考 [`.env.example`](../.env.example)（占位值，不含真实密钥）。
>
> **Redis 判定逻辑**：代码只认 `REDIS_HOST` + `REDIS_PASSWORD` 同时存在（见 [`lib/server/upstash.ts`](../lib/server/upstash.ts) 的 `hasRedisConfig()`）。二者缺一即回退**单实例内存**，服务重启/冷启动计数清零，免费试用会"复活"。
>
> **熔断阈值不会因漏配而失效**：`QUOTA_DAILY_LIMIT` 未设置、为空、非数字或 ≤ 0 时，一律回退到 **50**（判定为 `Number.isFinite(v) && v > 0`，见 [`lib/server/quota.ts`](../lib/server/quota.ts) 的 `resolveLimit()`）——即"忘记配"只会用默认上限，不会变成无上限。**唯一解除上限的方式**是管理接口 `POST /api/admin/quota` 传 `{"enabled":false}` 关闭熔断（见第五节）。
>
> ⚠️ **改完环境变量必须重启 PM2 进程才生效**：`pm2 restart indigo-tarot`（无需重新 build）。

## 二、本地开发

```bash
npm install
cp .env.example .env.local   # 填写 DEEPSEEK_API_KEY 与 ADMIN_TOKEN
npm run dev                  # http://localhost:3000
```

本地通常不配 Redis（回退内存实现，重启清零）——验证"每设备一次试用"等行为时需注意此特性。若要本地复现生产行为，用 Docker 起一个 Redis 并填 `REDIS_*` 即可。

## 三、生产部署（腾讯云自建）

### 3.1 首次部署

完整执行记录（购买、上传代码、安装 Node/Redis/PM2、防火墙）见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §4。要点：

1. **Redis 必须持久化**：`requirepass` 设强密码 + `appendonly yes`，且只监听 `127.0.0.1`（勿暴露公网）。
2. **环境变量写入服务器** `/root/indigo-tarot/.env.local`（权限 600）。
3. **构建与启动**（应用监听 **3000**，80 由 Nginx 占用）：
   ```bash
   npm ci && npm run build
   pm2 start npm --name indigo-tarot --max-memory-restart 500M -- start -- -p 3000
   pm2 save && pm2 startup
   ```

   > ⚠️ **重建 PM2 进程时务必带上 `-p 3000 --max-memory-restart 500M` 并执行 `pm2 save`**，
   > 否则重启后应用会回到 80 端口与 Nginx 冲突。
4. **PM2 日志轮转**——**不做这一步 PM2 日志会无限增长，最终写满磁盘**：
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   pm2 set pm2-logrotate:compress true
   ```
   > 核对当前生效值一律以 `pm2 conf pm2-logrotate` 为准。

### 3.2 日常更新（git 部署）

服务器直连 GitHub 超时，git remote 走 `ghfast.top` 镜像（2026-09-18 服务器实测 git clone 可用：
29.44 MiB / 4.59 MiB/s）。镜像为第三方代理服务，若日后失效需更换并同步更新 remote URL。

```bash
cd /root/indigo-tarot
./deploy.sh
```

`deploy.sh` 完成：记回退锚点 → `git fetch + reset --hard origin/main` → 构建重启 → 验证 → 打印回退提示。
`git reset --hard` 会**自动删除**仓库已删的文件、补上新增文件——不再需要手工对账（旧的 tar 覆盖流程已废弃）。

### 3.3 首次从 tar 迁移到 git（一次性）

若服务器当前仍是 tar 部署（目录不是 git 仓库），按以下步骤迁移一次，之后即可用 `deploy.sh`：

```bash
cd /root/indigo-tarot
# 1. 记下当前线上版本（迁移锚点）
cat .deployed-sha
# 2. 备份环境变量（命根子）
cp .env.local /root/.env.local.backup-$(date +%F)
# 3. 原地建立 git 仓库并拉到 main
git init
git remote add origin https://ghfast.top/https://github.com/HammerRoot/indigo-tarot.git
git fetch origin main
git reset --hard origin/main
# 4. 确认 .env.local 还在（git 不碰 .gitignore 里的文件）
test -f .env.local && echo "✓ .env.local 在" || cp /root/.env.local.backup-* .env.local
# 5. 构建并重启
npm ci && npm run build && pm2 restart indigo-tarot
# 6. 核对版本（应等于本次要部署的 SHA）
git rev-parse --short HEAD
```

> **安全性依据**：`.env.local` 在 `.gitignore`（`.env*` 规则）里，`git reset --hard` 不碰 untracked 文件，
> 因此不会被删；`next-env.d.ts` 由 Next 构建自动生成，同样安全。迁移后 `.deployed-sha` 不再需要
> （回退锚点由 `git rev-parse HEAD` 提供），留在原地无害，可随手删除。

### 3.4 部署回退

`deploy.sh` 用 `set -euo pipefail`：**构建失败即中断，`pm2 restart` 不执行，线上仍是旧版本，无需回退**。

若部署成功但新版本有问题，回退到旧版本：

```bash
cd /root/indigo-tarot
git reset --hard <旧版本SHA> && npm run build && pm2 restart indigo-tarot
```

旧版本 SHA 就是上次 `deploy.sh` 开头打印的「回退锚点」。

### 3.5 Nginx 反向代理（对外 80 → 应用 3000）

```bash
apt-get install -y nginx        # 安装时不会启动（80 被 Next 占用，属预期）
```

配置文件 `/etc/nginx/sites-available/indigo-tarot`：

```nginx
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;   # 关键：覆写而非追加
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_buffering off;      # 关键：SSE 流式必需，否则逐字输出退化为一次性刷出
        proxy_cache off;
        proxy_read_timeout 300s;  # AI 解读耗时可能超过默认 60s
    }
}
```

启用并校验：

```bash
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/indigo-tarot /etc/nginx/sites-enabled/indigo-tarot
nginx -t                       # 校验配置语法
systemctl start nginx
systemctl enable nginx         # 开机自启
```

> - ⚠️ **`X-Forwarded-For` 必须是 `$remote_addr`（覆写），不能改成 `$proxy_add_x_forwarded_for`（追加）**。追加会保留客户端自带的同名头，IP 限流即可被"换头换桶"绕过。
> - ⚠️ `proxy_buffering off` 是**必需项**——否则 SSE 逐字输出会退化成一次性刷出。
> - 改完本配置后：`nginx -t && systemctl reload nginx`（不断连接）。

### 3.6 防火墙与端口

**放行端口：22（SSH）、80（HTTP）、443。**

> ⚠️ **443 必须保持放行，不要关。** 本机没有监听 443 的服务——放行的目的正是让内核直接回 RST，
> 使 443 表现为**快速拒绝**而不是**丢包黑洞**。Chrome 的 HTTPS Upgrades 会把 `http://` 升级到
> `https://`；若 443 丢包，"失败"就变成"等待"，回落逻辑等不到信号，访客卡死在超时页。
> **只放 22、80 会重新引入该故障。**

**HTTP 明文直连的固有限制**：`crypto.subtle` 不可用 → 不可在前端持久化存储 API Key。如需 HTTPS，加域名 + ICP 备案 + 证书，现有前置 Nginx 直接加 443 server 块即可，应用侧零改动。

## 四、成本控制（重要）

系统 Key 是免费试用的付费来源，控制成本按以下层次：

1. **硬上限（必须）**：DeepSeek 账户用**固定充值余额** ——余额耗尽 API 自动 401，成本硬性封顶。
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

## 六、来源审计统计（聚合）

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

## 七、上线前检查清单

- [ ] 环境变量已配置并重启 PM2 进程：`DEEPSEEK_API_KEY`、`ADMIN_TOKEN`（**生产新值**，非本地/示例值）、`REDIS_HOST` / `REDIS_PASSWORD`
- [ ] Nginx 中 `X-Forwarded-For` 为 `$remote_addr`（**覆写**），非 `$proxy_add_x_forwarded_for`（追加）——退成追加态则 IP 限流可被伪造头绕过
- [ ] 腾讯云**实例防火墙**放行 22 / 80 / **443**——443 被关掉会让部分访客彻底打不开（丢包黑洞，见 §3.6 与 N10）；注意改「模板」不会同步到实例
- [ ] 无痕窗口实测：不填 Key 占卜 1 次成功 → 再次占卜提示"免费试用已用完" → 填个人 Key 后可正常占卜
