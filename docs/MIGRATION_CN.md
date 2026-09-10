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
| 每日配额 | 保持 50 不变（`QUOTA_DAILY_LIMIT=50`）；口径为**每天** 50 次（非每月），2026-09-10 已再次确认 |

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
- **已关闭自动发布**（2026-09-10 完成）：当前仓库**没有** `.github/workflows/` 文件，Vercel 自动部署来自 **Vercel for GitHub 的 Git 集成**（Vercel 控制台侧配置），已在 Vercel 控制台关闭：
  1. 登录 vercel.com → 打开项目 `indigo-tarot`。
  2. **Settings → Git → Connected Git Repository**。
  3. 点击 **Disconnect**（断开 Git 连接）。
  4. 断开后 push 到 GitHub 不再自动触发 Vercel 部署，Vercel 项目与已有部署保留。

---

## 十六、分支与发布说明

- **迁移分支**：`feat/tencent-migration`，已完成迁移相关 3 个提交并合并回 `main`：
  - `01db5a6` 存储层迁移到 ioredis
  - `c09d5c1` deviceId 改用 getRandomValues 兼容 HTTP
  - `1cd66fe` 部署文档与 spec 补充
- **发布分支**：`main`（已与迁移分支同步）。
- **服务器代码来源**：部署时取自 `feat/tencent-migration`；两分支合并后代码内容一致，后续更新以 `main` 为准。
- **发布方式**：手工部署（未配置 CI/CD，理由见「十四」）。更新命令：

```bash
cd /root/indigo-tarot
curl -L -o /tmp/code.tar.gz https://ghfast.top/https://github.com/HammerRoot/indigo-tarot/archive/refs/heads/main.tar.gz
tar -xzf /tmp/code.tar.gz --strip-components=1 -C /root/indigo-tarot
npm ci && npm run build && pm2 restart indigo-tarot
```

---

## 十七、监控与告警方案

### 17.1 先分清两层监控

「服务器是否正常运行」其实是两件独立的事，需要不同手段：

| 层面 | 含义 | 手段 |
|---|---|---|
| 服务器层 | 机器是否活着、CPU/内存/磁盘是否正常 | 腾讯云云监控（平台自带） |
| 网站层 | `http://124.221.231.18` 能否正常返回页面 | **外部**可用性探测（第三方） |

关键点：网站层必须用**外部**探测。服务器内部脚本在整机宕机时自己也停了，无法给你报信。

### 17.2 方案对比

| 方案 | 覆盖层 | 成本 | 说明 |
|---|---|---|---|
| A. 腾讯云云监控告警 | 服务器 | 免费 | 控制台 → 实例 → 监控 → 设置告警；支持阈值告警与「无数据告警」；通知渠道含邮件/短信/微信/电话 |
| B. 外部可用性监控（推荐） | 网站 | 免费 | 独立于本机。UptimeRobot 免费版：50 个监控、5 分钟间隔、支持 HTTP 状态码与关键字检查 |
| C. 服务器内自愈/巡检 | 应用 | 免费 | PM2 进程崩溃自动重启（已有）；可加 `max_memory_restart`；crontab 定时本地 curl 失败发 Webhook。**不能替代 A、B** |
| D. `/api/health` 健康检查端点 | 应用 | 需改代码 | 当前项目无健康检查端点；加后可校验 Redis 连通，配合 B 更准确 |

### 17.3 推荐组合（0 成本）

**第 1 步：UptimeRobot 关键字监控（最该做的一项）**

- 监控地址：`http://124.221.231.18`
- 监控类型选 **Keyword（关键字）**，检查页面是否包含「塔罗」等固定文案
- **为什么必须用关键字而非纯状态码**：本项目曾出现 80 端口被遗留 `sshd` 占用的情况，此时访问仍返回 HTTP 200，但内容是 `SSH-2.0-OpenSSH_8.9p1`。纯状态码监控发现不了这类故障，关键字监控才能抓到
- 免费版通知：邮件 + 5 种集成（Discord 等）；不含短信/电话
- 注意：探测节点主要在海外，从海外探测国内服务器一般可用，但偶有延迟

**第 2 步：腾讯云云监控告警策略**

- 资源类：CPU > 80%、内存 > 85%、磁盘 > 85%
- **「无数据」告警**：实例监控上报中断时触发（用于发现机器失联）
- 通知渠道绑定微信公众号，手机可第一时间收到
- 短信每月 1000 条免费配额（每个告警类型）

**第 3 步（可选）：应用自愈**

- PM2 配置 `max_memory_restart`（如 500M）防止内存长期累积
- 属自愈措施，降低故障概率，但不能替代告警

**关于自建 Uptime Kuma**：不建议。监控与被监控服务同机，服务器一挂两者同时失效，探测失去意义。

### 17.4 方案 D 说明（未实施）

如需更准确的健康检查，可新增 `app/api/health/route.ts`，返回应用与 Redis 连通状态，再配合 UptimeRobot HTTP 监控。当前未实施。

---

## 十八、用量与来源查询

### 18.1 Redis 键结构（实际存储）

系统把防滥用数据存在服务器自建 Redis，键结构如下：

| 键 | 类型 | TTL | 含义 |
|---|---|---|---|
| `quota:enabled` | String | 永久 | 每日配额开关，`1` 开 / `0` 关 |
| `quota:count:YYYY-MM-DD` | String | 当天结束 | 当天系统 Key 调用次数（Asia/Shanghai 自然日） |
| `trial:{deviceId}` | String | 90 天 | 该设备已用过免费试用的标记 |
| `rl:system_{IP}` | String | 3 小时 | 该 IP 在 3 小时窗口内的系统 Key 调用次数 |

### 18.2 能查到什么、查不到什么

| 问题 | 能否回答 | 依据 |
|---|---|---|
| 今天总共被请求了多少次 | ✅ 能 | `quota:count:当天日期` |
| 今天还剩多少次 | ✅ 能 | `limit - count` |
| 配额开关当前状态 | ✅ 能 | `quota:enabled` |
| 有多少设备用过免费试用 | ✅ 能（数量） | `trial:*` 键数量 |
| 具体哪些设备用过 | ⚠️ 仅 deviceId | `trial:*` 键名；**不含 IP、不含时间** |
| 哪些 IP 调用过系统 Key | ⚠️ 仅最近 3 小时 | `rl:system_*`；**超过 3 小时自动过期，无历史** |
| 每次调用的时间/来源/问题内容 | ❌ 不能 | 系统未记录调用日志 |

**结论**：当前实现只服务于「防滥用计数」，不服务于「审计与统计」。历史来源明细需要新增代码才能记录。

### 18.3 查询方法一：管理员 API（查配额）

系统提供配额查询接口，需管理员令牌（值见服务器 `.env.local` 的 `ADMIN_TOKEN`）：

```bash
# 查询开关与当天计数
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost/api/admin/quota

# 返回示例
# {"enabled":true,"count":7,"limit":50}
```

也可通过公网访问：`http://124.221.231.18/api/admin/quota`

### 18.4 查询方法二：redis-cli（查来源明细）

在服务器（OrcaTerm，root 身份）执行：

```bash
# 读取密码
source /root/indigo-tarot/.env.local

# 今天用了多少次 + 还剩多少
NOW=$(TZ=Asia/Shanghai date +%F)
USED=$(redis-cli -a "$REDIS_PASSWORD" --no-auth-warning GET "quota:count:$NOW")
echo "今日已用: ${USED:-0} / 50，剩余: $((50 - ${USED:-0}))"

# 配额开关
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning GET quota:enabled

# 用过免费试用的设备列表（deviceId）
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern 'trial:*'

# 最近 3 小时有调用的 IP
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern 'rl:system_*'
```

### 18.5 IP 限流地址来源（实测确认，非缺陷）

代码取客户端 IP 的顺序是 `x-forwarded-for` → `x-real-ip` → 字面量 `"unknown"`（见 [route.ts](file:///Users/qiu/Developer/personal/indigo-tarot/app/api/deepseek-stream/route.ts#L85-L88)）。

曾一度怀疑：`next start` 直接监听 80 端口、前面无反向代理，两个请求头可能均缺失，导致所有用户限流键退化为 `rl:system_unknown`，使「每 IP 每 3 小时 5 次」变成全体共享 5 次。

**实测结论：该怀疑不成立。** 服务器上执行

```bash
source /root/indigo-tarot/.env.local
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern 'rl:*'
```

实际输出：

```
rl:system_::ffff:58.33.206.209
rl:system_::ffff:127.0.0.1
```

说明：

- Next.js 会基于 TCP 连接的远端地址写入 `x-forwarded-for`，因此无需 Nginx 也能取到真实 IP；
- `::ffff:` 前缀是 IPv4-mapped IPv6 表示法，`::ffff:58.33.206.209` 等价于 `58.33.206.209`，键值语义正确；
- `::ffff:127.0.0.1` 来自服务器本机 curl 诊断请求，属预期；
- **IP 限流按真实客户端 IP 生效，无需修复。**

> 附注：早期「浏览器端 AI 解析失败」的真实原因是 `crypto.randomUUID` 在 HTTP 非安全上下文不可用（见「十二」第 5 项），与 IP 限流无关，已修复。

### 18.6 增强方案（可选，需改代码，未实施）

若要完整的来源审计与历史统计，需要新增记录逻辑：

1. **调用日志**：在 [route.ts](file:///Users/qiu/Developer/personal/indigo-tarot/app/api/deepseek-stream/route.ts) 成功计数处，把 `时间 + IP + deviceId + 是否系统 Key` 写入 Redis List 或独立日志文件，保留 N 天后清理。
2. **统计接口**：新增管理员接口，按日聚合返回「调用总数 / 去重 IP 数 / 去重设备数」。
3. **前置代理**：加 Nginx 反代（当前 IP 限流已正常，非必需）；价值在于便于以后上 HTTPS、以及统一接管 80/443 端口。

> 以上三项均涉及代码改动，本次未实施，按需再评估。
