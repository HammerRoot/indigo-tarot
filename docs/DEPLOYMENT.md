# 部署文档

> **本文只负责**：环境变量、本地开发、生产部署步骤、成本控制、管理接口、上线检查清单。
> **本文不写**：迁移历史与事故经过（→ [`archive/`](./archive/)）、运维待办与当前状态
> （→ [`OPERATIONS.md`](./OPERATIONS.md)）、代码条目状态（→ [`README.md`](./README.md)）。
>
> indigo-tarot 的环境变量配置与部署指南。本地开发参考 [`README.md`](../README.md)。
>
> 当前生产环境为**腾讯云轻量应用服务器 + 自建 Redis**（`http://<SERVER_IP>`），实际部署执行记录见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §4；运维台账与上线前安全清单见 [`OPERATIONS.md`](./OPERATIONS.md)。

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
> **熔断阈值不会因漏配而失效**：`QUOTA_DAILY_LIMIT` 未设置、为空、非数字或 ≤ 0 时，一律回退到 **50**
> （判定为 `Number.isFinite(v) && v > 0`，见 [`lib/server/quota.ts`](../lib/server/quota.ts) 的 `resolveLimit()`）——
> 即"忘记配"只会用默认上限，不会变成无上限。**唯一解除上限的方式**是管理接口
> `POST /api/admin/quota` 传 `{"enabled":false}` 关闭熔断（见第五节）。

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

   **日志轮转**（`pm2-logrotate`）——**不做这一步 PM2 日志会无限增长**，最终写满磁盘：

   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   pm2 set pm2-logrotate:retain 7
   pm2 set pm2-logrotate:compress true
   ```

   > **线上生效值**（2026-09-17 `pm2 conf pm2-logrotate` 实测）：
   > `max_size 10M` / `retain 7` / `compress true` / `dateFormat YYYY-MM-DD_HH-mm-ss`
   > / `workerInterval 30` / `rotateInterval 0 0 * * *`（每日 0 点轮转）/ `rotateModule true`。
   > **核对当前值一律以 `pm2 conf pm2-logrotate` 为准。**

4. **更新部署（拉取 `main` 覆盖）**——服务器直连 GitHub 超时，走 `ghfast.top` 镜像：

   ```bash
   cd /root/indigo-tarot
   curl -L -o /tmp/code.tar.gz \
     https://ghfast.top/https://github.com/HammerRoot/indigo-tarot/archive/refs/heads/main.tar.gz
   tar -xzf /tmp/code.tar.gz --strip-components=1 -C /root/indigo-tarot
   npm ci && npm run build && pm2 restart indigo-tarot
   ```

   > ⚠️ **`tar` 只覆盖和新增，从不删除。** 仓库里删掉的文件会一直留在服务器工作树上，
   > 而 `next build` **会对测试文件做类型检查**——一个引用已删符号的旧测试文件足以让
   > 生产构建失败（2026-09-17 实际发生过：残留的 `lib/__tests__/grid.test.ts` 引用已删除的
   > `gridClassFor`，构建报 `TS2305` 直接失败）。
   >
   > **每次更新前先对账服务器独有文件**（`tar` 包里有的一律不动）：
   >
   > ```bash
   > tar -tzf /tmp/code.tar.gz | sed 's|^[^/]*/||' | grep -v '/$' | sort > /tmp/expected.txt
   > find . -type f -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' \
   >   -not -name '.env.local' -not -name 'next-env.d.ts' -not -name '.deployed-sha' \
   >   -not -name '*.log' | sed 's|^\./||' | sort > /tmp/actual.txt
   > comm -23 /tmp/actual.txt /tmp/expected.txt   # 输出的即"服务器有、仓库已删"
   > ```
   >
   > 上面排除的两个名字都是**误报**，缺了它们每次都会出现在清单里：
   > - `next-env.d.ts`：被 `.gitignore` 忽略、不进 tar 包，但由 Next 构建时自动生成、服务器上本该存在；
   > - `.deployed-sha`：见下文「部署回退」的版本标记，是本机运维文件，本就不该进仓库。
   >
   > 同理，任何"服务器上理应存在但不在仓库里"的文件都属于这一类误报——**先把它们加进排除列表，
   > 而不是从服务器上删掉**。清单里出现不认识的条目时，先停下来核对再动手。
   >
   > 对照仓库确认后逐个 `rm`。**若出现不认识的条目先停下来核对**——该目录里可能有
   > 仓库之外的东西，不该盲删。
   >
   > 同理，**改了 `next.config.ts` 的 `images` 配置（尤其 `minimumCacheTTL`）后**，
   > `.next/cache/images` 里按旧配置写入的条目会继续按旧 TTL 下发，需要
   > `rm -rf .next/cache/images` 才会立即生效（不删则等其自然过期，属自愈）。

   **部署后验证（必做；通过后才更新 `.deployed-sha`）**

   ```bash
   pm2 status indigo-tarot                        # 期望 online
   curl -s localhost:3000/api/health              # 期望 {"status":"ok","checks":{"redis":"ok"}}
   curl -s -o /dev/null -w '%{http_code}\n' http://<SERVER_IP>/   # 期望 200
   pm2 logs indigo-tarot --lines 20 --nostream    # 无异常堆栈
   ```

   > - `/api/health` 返回 **503** 表示 **Redis 连不上**——此时配额/试用/限流已整套失效，
   >   而站点首页仍然返回 200、看起来一切正常。该端点已由 UptimeRobot 监控（见 [`OPERATIONS.md`](./OPERATIONS.md) 台账 N1）。
   > - 若本次改动触及 `next.config.ts` 的 `images`，额外确认优化图响应头仍是 `max-age=2592000`、`w=384`。
   > - **"看不出变化"不等于部署失败**：构建产物与运行时行为不变的改动，用户侧本就没有可观察差异
   >   （2026-09-17 的 G16 即如此，见 [`archive/g16-test-typecheck-scope.md`](./archive/g16-test-typecheck-scope.md) §6.1）。

5. **部署回退（部署坏了怎么恢复）**

   **部署前必做：记录回退锚点。** 锚点是**当前线上正在运行的版本**——即**上次部署时发布的那个 SHA**，
   **不是**你这次要部署的新版本。

   > ⚠️ 本文初稿把这条写反了（写成"本次部署前 `main` 停在的 commit"，那恰恰是**要部署的新版本**）。
   > 2026-09-17 实测暴露：部署前 `main` 已是 `c047e23`，但线上跑的是 `0ff5d65`，真正的锚点是后者。

   **线上跑的是哪个版本，查服务器上的版本标记**：

   ```bash
   cat /root/indigo-tarot/.deployed-sha
   ```

   > ⚠️ **首次使用时这个文件还不存在**：该标记是 2026-09-17 才引入的，此前部署的服务器上并没有它，
   > 第一次 `cat` 会报 `No such file or directory`。这**不代表没部署过**——按"当前线上正在运行的
   > 版本"把它建出来即可。**不确定线上跑的是哪个版本时不要猜**：锚点填错比没有锚点更危险。

   **每次部署成功并通过上文的「部署后验证」后，必须更新它**：

   ```bash
   # 在服务器上执行，SHA 取本地 `git rev-parse --short main` 的值
   echo "<SHA>" > /root/indigo-tarot/.deployed-sha
   ```

   > 该文件不属仓库、不进 `tar` 包，因此不会被覆盖——它只记录"这台机器当前跑的版本"。
   > **不更新它，下一次的锚点就又只能靠翻文档猜。**

   **部署失败（`build` 报错）**：`&&` 链保证 `pm2 restart` 不会执行，线上仍是旧版本，**无需回退**——排查后重试即可。这是被动保护，不要手动去动 pm2。

   **部署成功但新版本有问题**：用 `git revert` 回退（**不改写历史、不 force push**，符合本项目"不重写历史"的既有决策）：

   ```bash
   # 本地：新增一个反向提交，把 main 恢复到上一个好版本的行为
   git checkout main && git pull
   git revert <有问题的提交SHA> --no-edit
   git push origin main
   ```

   然后服务器**重新走一遍上文「更新部署」的覆盖流程**（tar 拉到 revert 后的 main）。

   > ⚠️ **回退与 `tar` 不删文件的交互**：`git revert` 只改变文件内容、不会删除"仍被跟踪"的文件。
   > 若被回退的提交**新增**了文件，revert 会让这些文件从 main 消失，但 tar 覆盖部署**不会删掉**
   > 服务器上对应的副本——残留文件继续留在服务器。纯新增且无人引用的文件（如 `tsconfig.test.json`）
   > 无害；但若新增的是 `app/` 下的路由，回退后该路由仍会被 Next 编译发布，需手动 `rm` 或跑
   > 上文「更新部署」的对账命令找出并清理。

6. **Nginx 反向代理**（对外 80 → 应用 3000）：

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

   > - ⚠️ **`X-Forwarded-For` 必须是 `$remote_addr`（覆写），不能改成 `$proxy_add_x_forwarded_for`（追加）**。
   >   追加会保留客户端自带的同名头，IP 限流即可被"换头换桶"绕过——这是已修复的疑点 Q1，
   >   配置一旦退回追加态即回归。检查清单里有对应的回归项。
   > - ⚠️ `proxy_buffering off` 是**必需项**——否则 SSE 逐字输出会退化成一次性刷出。
   > - 改完本配置后：`nginx -t && systemctl reload nginx`（不断连接）。
   > - 为什么需要前置 Nginx、以及接入当时的实测验证结果，见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §16。
7. **防火墙**只放行必要端口（22、80）。
8. 改环境变量后必须**重启 PM2 进程**才生效（`pm2 restart indigo-tarot`，无需重新 build）。
9. ⚠️ 若需重建 PM2 进程，务必带上 `-p 3000 --max-memory-restart 500M` 并执行 `pm2 save`，否则重启后应用会回到 80 端口与 Nginx 冲突。

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
- [ ] 无痕窗口实测：不填 Key 占卜 1 次成功 → 再次占卜提示"免费试用已用完" → 填个人 Key 后可正常占卜

> Vercel 为历史部署平台，已停用并删除；历史处置记录见 [`archive/migration-2026-09.md`](./archive/migration-2026-09.md) §12。
