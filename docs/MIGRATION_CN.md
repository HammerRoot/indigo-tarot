# 中国云迁移方案（腾讯云）— 已完成部署

> **状态：✅ 已部署完成并调通（2026-09-10）**
>
> 公网访问地址：`http://124.221.231.18`（HTTP 直连，免 VPN、免 ICP 备案）
>
> 目标：把部署在 Vercel 上的 indigo-tarot 迁到中国大陆可访问的云平台，实现「无需 VPN 即可打开试用」，供 HR / 面试官打开试用，同时防止系统 Key 被滥用。

---

## 一、部署结果概览（当前状态）

| 维度 | 实际值 |
|---|---|
| 云平台 | 腾讯云轻量应用服务器（Lighthouse） |
| 实例 ID | `lhins-8zyqhgjq` |
| 公网 IP | `124.221.231.18` |
| 规格 | 4 核 4G 3M 带宽 / 上海 / 1 年 / 109 元（1.4 折） |
| 系统镜像 | Ubuntu 22.04 LTS |
| 访问方式 | 公网 IP + HTTP（80 端口直连，无 HTTPS） |
| 代码目录 | `/root/indigo-tarot`（分支 `feat/tencent-migration`） |
| 运行环境 | Node 20.19.0（`/opt/node`）+ Redis 6.0.16 + PM2 7.0.4 |
| 状态存储 | 服务器自建 Redis（`127.0.0.1:6379`，`requirepass` + AOF 持久化） |
| 已验证 | 抽牌流程 + AI 流式解析正常（用户实测通过） |

> 环境变量（`DEEPSEEK_API_KEY` / `ADMIN_TOKEN` / `REDIS_PASSWORD` 等）实际值见服务器 `/root/indigo-tarot/.env.local`，本文档不落明文密钥。

---

## 二、已确认决策（2026-09-09）

| 事项 | 结论 |
|---|---|
| 部署方案 | 腾讯云轻量应用服务器（Lighthouse） |
| 云账号 | 已有腾讯云账号（已实名） |
| 状态存储 | 服务器自建 Redis（持久化，重启不清零） |
| 访问方式 | 公网 IP + HTTP 直连（接受无 HTTPS），免 ICP 备案 |
| 使用对象 | HR / 面试官试用，需防滥用（保留免费试用/限流/配额策略） |
| 代码上传 | 提交并 push 到 GitHub，服务器拉取（`feat/tencent-migration` 分支） |
| 每日配额 | 保持 50 不变（`QUOTA_DAILY_LIMIT=50`） |

---

## 三、背景与目标

- 现状：项目原部署在 Vercel（海外），中国大陆访问需要 VPN。
- 目标：迁移到腾讯云，中国大陆直连可访问，供 HR / 面试官稳定试用，同时防滥用。

---

## 四、现状梳理（代码事实）

| 维度 | 现状 | 迁移影响 |
|---|---|---|
| 框架 | Next.js 16 (App Router, React 19) + TypeScript | 需 Node.js 运行环境 |
| 渲染 | SSR + 流式 SSE（`/api/deepseek-stream`） | 传统服务器天然支持，无缓冲问题 |
| AI 服务 | DeepSeek API（`https://api.deepseek.com/v1`） | 国内直连，无需 VPN，无影响 |
| 状态存储 | 原 Upstash Redis REST → 已改为服务器自建 Redis | ioredis 连接本机 Redis |
| 静态资源 | `public/tarot-images`（78 张 JPG，本地打包） | 无外部依赖 |
| 环境变量 | 全部服务端专用（无 `NEXT_PUBLIC_` 前缀） | 写入服务器 `.env.local` 即可 |
| CSP | 生产环境启用（`next.config.ts`） | 无需改动 |

**关键代码位置**

- 服务端共享模块：[lib/server/deepseek.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/deepseek.ts)、[lib/server/upstash.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/upstash.ts)、[lib/server/trial.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/trial.ts)、[lib/server/rate-limit.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/rate-limit.ts)、[lib/server/quota.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/quota.ts)
- 流式 SSE 路由：[app/api/deepseek-stream/route.ts](file:///Users/qiu/Developer/personal/indigo-tarot/app/api/deepseek-stream/route.ts)
- 设备标识：[lib/deviceId.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/deviceId.ts)

---

## 五、部署步骤（实际执行记录）

> 以下为真实执行的步骤，与早期草稿（2 核 2G / 3000 端口 / `git clone`）有差异，以本节为准。

### 1. 购买服务器

- 腾讯云轻量应用服务器（Lighthouse），实例 `lhins-8zyqhgjq`。
- 规格：4 核 4G 3M / 上海 / 1 年 / 109 元（1.4 折促销）。
- 系统镜像：Ubuntu 22.04 LTS（购买后可从控制台重装系统）。

### 2. 上传代码

- 本地改动 push 到 GitHub `feat/tencent-migration` 分支。
- 服务器直接 `git clone` GitHub 超时，改用 `ghfast.top` 镜像下载 tar.gz 并解压至 `/root/indigo-tarot`：

```bash
curl -L -o /tmp/indigo-tarot.tar.gz \
  https://ghfast.top/https://github.com/HammerRoot/indigo-tarot/archive/refs/heads/feat/tencent-migration.tar.gz
tar -xzf /tmp/indigo-tarot.tar.gz --strip-components=1 -C /root/indigo-tarot
```

### 3. 安装 Node 20 + Redis + PM2

```bash
# Node 20.19.0（npmmirror 二进制包，安装到 /opt/node）
# Redis 6.0.16（apt 源）
sudo apt-get install -y redis-server
# PM2 7.0.4，软链到 /usr/local/bin/pm2（否则 PATH 找不到）
```

### 4. 配置 Redis（密码 + AOF 持久化）

```bash
# requirepass 设置强密码；appendonly yes；只监听 127.0.0.1
sudo systemctl restart redis-server
sudo systemctl enable redis-server
redis-cli -a <REDIS_PASSWORD> --no-auth-warning ping   # 返回 PONG
```

### 5. 配置环境变量

服务器 `/root/indigo-tarot/.env.local`（实际值见服务器，不落明文）：

```bash
DEEPSEEK_API_KEY=sk-xxx
QUOTA_DAILY_LIMIT=50
ADMIN_TOKEN=xxx
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=xxx
```

### 6. 安装依赖并构建

```bash
cd /root/indigo-tarot
npm config set registry https://registry.npmmirror.com
npm ci
npm run build
```

### 7. 启动（80 端口）+ 开机自启

```bash
pm2 start npm --name indigo-tarot -- start -- -p 80
pm2 save
pm2 startup        # 生成并启用 systemd 服务 pm2-root，开机自动 resurrect
```

### 8. 开放防火墙

- 轻量服务器控制台 → 防火墙 → 放行 TCP 80。
- 访问地址：`http://124.221.231.18`。

---

## 六、状态存储说明（服务器自建 Redis）

- `trial` / `rate-limit` / `quota` 数据存到本机 Redis，开启 AOF 后**持久化、重启/冷启动不清零**，防滥用策略可靠。
- 只监听 `127.0.0.1`，不暴露公网端口，安全。
- 与 Upstash 语义等价：`SET/GET/EXISTS/INCR/EXPIRE` 全部由 Redis 原生支持。

---

## 七、代码改动（已完成）

### 改动 1：存储层迁移到 ioredis（commit `01db5a6`）

改动集中在 [lib/server/upstash.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/upstash.ts)：

1. `package.json` 增加依赖 `ioredis`。
2. `redisCommand` 实现从「Upstash REST fetch」换成「ioredis 执行命令」，返回结构 `RedisCommandResult[]` 不变。
3. 环境变量从 `UPSTASH_*` / `KV_*` 换成 `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`。
4. 其余调用方（`trial.ts` / `rate-limit.ts` / `quota.ts`）接口与语义不变。

### 改动 2：deviceId 兼容 HTTP 部署（commit `c09d5c1`）

- **问题**：`crypto.randomUUID()` 仅在 HTTPS / localhost 安全上下文可用，公网 IP 直连（HTTP）下为 `undefined`，导致设备标识生成失败 → AI 解析报错 `TypeError: crypto.randomUUID is not a function`。
- **修复**：[lib/deviceId.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/deviceId.ts) 改用 `crypto.getRandomValues()`（HTTP 下同样可用）手写 UUID v4。
- **验证**：`type-check` 通过，193 个测试全部通过。

> 连带说明：`crypto.subtle`（API Key 加密，见 `lib/apiKeyCrypto.ts`）同样只在安全上下文可用。HTTP 下 `crypto.subtle` 不可用，`setApiKey` 已通过 try/catch 降级为「不持久化 API Key」（内存中仍可用，刷新后需重填）。这是 HTTP 的固有限制，如需完整「记住 Key」功能需上 HTTPS。

---

## 八、面试官体验与防滥用的平衡

- **免费试用「每设备 1 次」**：保留；面试官想多试可填自己的 Key（填个人 Key 不经过限制）。
- **IP 限流「3 小时 5 次」**：保留作为辅助防线；仅对「使用系统 Key」生效。
- **每日配额**：保持 50（`QUOTA_DAILY_LIMIT`）。
- **成本兜底**：系统 Key 用 DeepSeek 固定充值余额，余额耗尽自动 401，成本硬封顶。

---

## 九、上线验证清单

- [x] 公网 IP 可直接打开首页（关闭 VPN）
- [x] 抽牌流程（选牌 → 翻牌 → 结果页）正常
- [x] AI 深度解析流式返回成功（出现「💡 核心建议」与「🔮 深度解析」）
- [x] 历史记录正常保存/读取
- [ ] 重启服务器后，免费试用/每日配额计数不重置（Redis AOF 持久化生效）——待重启验证

---

## 十、成本

| 项目 | 实际 |
|---|---|
| 轻量应用服务器（4 核 4G 3M / 上海 / 1 年） | 109 元（1.4 折） |
| 自建 Redis | 0 元 |
| DeepSeek | 沿用固定充值余额，无新增 |

> 服务器约使用 2 个月（简历用途），不开启自动续费。

---

## 十一、风险与注意事项

- **无 HTTPS**：公网 IP 直连只能用 HTTP，无法绑标准证书。对简历试用场景可接受；如需 HTTPS，后续加域名 + ICP 备案 + SSL 证书。
- **HTTP 下 Web Crypto 限制**：`crypto.randomUUID` / `crypto.subtle` 在非安全上下文不可用。`randomUUID` 已通过 `getRandomValues` 修复；API Key「记住」功能在 HTTP 下不可用（刷新丢 Key），这是固有限制。
- **Redis 密码**：自建 Redis 虽只监听本机，仍要设置强密码。
- **服务器安全**：只放行必要端口（22、80），建议 SSH 用密钥登录。
- **SSE 流式**：轻量服务器常驻进程下无缓冲问题。

---

## 十二、部署过程遇到的问题与解决

| # | 问题 | 根因 | 解决 |
|---|---|---|---|
| 1 | 本地 SSH 连接服务器失败（`kex_exchange_identification: Connection closed`） | 本地 Mac Clash Verge TUN 模式劫持所有 SSH 流量 | 放弃本地 SSH，改用腾讯云网页「自动化助手」（TAT）以 root 身份下发命令 |
| 2 | `pm2` 命令未找到 | Node 装在 `/opt/node`，pm2 在 `/opt/node/bin` | `ln -sf /opt/node/bin/pm2 /usr/local/bin/pm2` |
| 3 | 服务器直接 `git clone` GitHub 超时 | 服务器到 GitHub 网络不通 | 用 `ghfast.top` 镜像下载 tar.gz |
| 4 | 端口 80 被遗留 sshd 占用，访问返回 `SSH-2.0-...` | 之前临时 sshd 监听 80 未清理 | 从 `ss -ltnp` 提取 pid 并 kill，再启动 PM2 |
| 5 | 浏览器端 AI 解析报错 `crypto.randomUUID is not a function` | Web Crypto API 在 HTTP 非安全上下文不可用 | deviceId 改用 `getRandomValues` 手写 UUID（commit `c09d5c1`） |

---

## 十三、后续待办

- [x] `pm2 startup` 开机自启（systemd 服务 `pm2-root` 已 enable，开机自动 `pm2 resurrect`）
- [ ] 关闭 Vercel 自动发布（见「十五」）
- [x] CI/CD 评估（见「十四」，结论：暂不加）

---

## 十四、CI/CD 评估：是否需要 main 分支自动部署到腾讯云

**结论：暂不加，维持手工部署。** 理由：

1. **使用周期短**：约 2 个月（简历用途），且改动频率低，一次性部署已够用，投入产出比低。
2. **网络不稳定**：GitHub Actions runner 在海外，SSH 到国内腾讯云服务器延迟高、易失败（本次部署中服务器直连 GitHub 就超时，反向亦然）。
3. **安全成本**：需要把服务器 SSH 私钥放入 GitHub Secrets，增加密钥泄露面；本机 SSH 已被 Clash TUN 劫持，自动化 SSH 链路本身也不可靠。
4. **手工部署成本低**：更新只需在 OrcaTerm 里执行一条命令（curl 下载 + build + pm2 restart）。

**若将来要加**，推荐方案（供参考，未实施）：

- 用 `appleboy/ssh-action`（GitHub Actions）SSH 到服务器执行 `git pull` + `npm ci` + `npm run build` + `pm2 restart`。
- 前置条件：服务器 22 端口对公网开放、配置 SSH 密钥登录、GitHub Secrets 存 `HOST` / `USERNAME` / `SSH_KEY`。
- 更稳妥的替代：用腾讯云 CODING DevOps / 自建 webhook（国内链路，网络更稳）。

---

## 十五、Vercel 处理

- **保留**：Vercel 项目与生产地址 `https://indigo-tarot.vercel.app/` 暂不删除，作对照。
- **关闭自动发布**：当前仓库**没有** `.github/workflows/` 文件，Vercel 自动部署来自 **Vercel for GitHub 的 Git 集成**（Vercel 控制台侧配置），需在 Vercel 控制台关闭：
  1. 登录 vercel.com → 打开项目 `indigo-tarot`。
  2. **Settings → Git → Connected Git Repository**。
  3. 点击 **Disconnect**（断开 Git 连接）。
  4. 断开后 push 到 GitHub 不再自动触发 Vercel 部署，Vercel 项目与已有部署保留。
