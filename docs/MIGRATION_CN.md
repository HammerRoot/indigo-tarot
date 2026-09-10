# 中国云迁移方案（腾讯云）

> 目标：把当前部署在 Vercel 上的 indigo-tarot 迁到中国大陆可访问的云平台，实现「无需 VPN 即可打开试用」。
>
> 使用场景：写在简历里，供 HR / 面试官正常打开试用；系统 Key 需要防滥用。
>
> 代码改动已完成（存储层已切换到 ioredis 连接 Redis），待部署。

---

## 一、已确认决策（2026-09-09）

| 事项 | 结论 |
|---|---|
| 部署方案 | 腾讯云轻量应用服务器（Lighthouse，VPS，2 核 2G） |
| 云账号 | 已有腾讯云账号（已实名） |
| 状态存储 | 服务器自建 Redis（持久化，重启不清零） |
| 访问方式 | 公网 IP + HTTP 直连（接受无 HTTPS），免 ICP 备案 |
| 使用对象 | HR / 面试官试用，需防滥用（保留免费试用/限流/配额策略） |

---

## 二、背景与目标

- 现状：项目部署在 Vercel（海外），中国大陆访问需要 VPN。
- 目标：迁移到腾讯云，中国大陆直连可访问，供 HR / 面试官稳定试用，同时防滥用。

---

## 三、现状梳理（代码事实）

| 维度 | 现状 | 迁移影响 |
|---|---|---|
| 框架 | Next.js 16 (App Router, React 19) + TypeScript | 需 Node.js 运行环境 |
| 渲染 | SSR + 流式 SSE（`/api/deepseek-stream`） | 传统服务器天然支持，无缓冲问题 |
| AI 服务 | DeepSeek API（`https://api.deepseek.com/v1`） | 国内直连，无需 VPN，无影响 |
| 状态存储 | Upstash Redis REST（试用/限流/配额计数） | 本次替换为服务器自建 Redis |
| 静态资源 | `public/tarot-images`（78 张 JPG，本地打包） | 无外部依赖 |
| 环境变量 | 全部服务端专用（无 `NEXT_PUBLIC_` 前缀） | 写入服务器 `.env.local` 即可 |
| CSP | 生产环境启用（`next.config.ts`） | 无需改动 |

**关键代码位置**

- 服务端共享模块：[lib/server/deepseek.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/deepseek.ts)、[lib/server/upstash.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/upstash.ts)、[lib/server/trial.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/trial.ts)、[lib/server/rate-limit.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/rate-limit.ts)、[lib/server/quota.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/quota.ts)
- 流式 SSE 路由：[app/api/deepseek-stream/route.ts](file:///Users/qiu/Developer/personal/indigo-tarot/app/api/deepseek-stream/route.ts)
- 现有 Vercel 部署文档：[docs/DEPLOYMENT.md](file:///Users/qiu/Developer/personal/indigo-tarot/docs/DEPLOYMENT.md)

**结论**：业务代码运行环境无关；唯一改动点是「状态存储」从 Upstash REST 换成 ioredis 连接 Redis（见「七」），其余逻辑不动。

---

## 四、为什么选轻量应用服务器（而非 EdgeOne Pages）

- EdgeOne Pages 是无服务器多实例，SSE 流式可能有缓冲/超时限制，且接入外部 Redis 需走公网，配置更复杂。
- 轻量应用服务器是**单进程常驻**，SSE 天然稳定；Redis 直接自建在本机（`127.0.0.1`），零额外成本、低延迟，最贴合「两个月内试用 + 防滥用」的目标。

---

## 五、部署步骤（腾讯云轻量应用服务器）

### 1. 购买服务器

- 控制台：腾讯云轻量应用服务器（Lighthouse）。
- 建议规格：2 核 2G（锐驰型，无限流量），地域选国内（如广州/上海/北京）。
- 系统镜像：Ubuntu 22.04 LTS（或 24.04）。

### 2. 安装并配置 Redis（自建）

```bash
sudo apt-get install -y redis-server
# 设置访问密码（默认注释行是 # requirepass foobared）
sudo sed -i 's/^# requirepass .*/requirepass 你的强密码/' /etc/redis/redis.conf
# 开启 AOF 持久化（重启不丢数据）
sudo sed -i 's/^appendonly no/appendonly yes/' /etc/redis/redis.conf
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

- 只监听本机 `127.0.0.1`（默认），不暴露公网，安全。
- 记录密码（对应环境变量 `REDIS_PASSWORD`）。

### 3. 安装 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 确认 >= 20
```

### 4. 配置 npm 国内镜像（可选）

```bash
npm config set registry https://registry.npmmirror.com
```

### 5. 上传代码并安装依赖

```bash
git clone https://github.com/HammerRoot/indigo-tarot.git
cd indigo-tarot
npm ci
```

### 6. 配置环境变量

在项目根目录创建 `.env.local`：

```bash
DEEPSEEK_API_KEY=sk-你的系统key
ADMIN_TOKEN=$(openssl rand -hex 16)
QUOTA_DAILY_LIMIT=50
# DEEPSEEK_API_URL=https://api.deepseek.com/v1

# 自建 Redis（本机）
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=你的强密码
```

### 7. 构建并启动

```bash
npm run build
npm i -g pm2
pm2 start npm --name indigo-tarot -- start
pm2 save
pm2 startup   # 开机自启
```

默认监听 3000 端口。

### 8. 开放防火墙端口

- 轻量服务器控制台 → 防火墙 → 放行 TCP 3000。
- 访问地址：`http://<公网IP>:3000`。

---

## 六、状态存储说明（服务器自建 Redis）

- `trial` / `rate-limit` / `quota` 数据存到本机 Redis，开启 AOF 后**持久化、重启/冷启动不清零**，防滥用策略可靠。
- 只监听 `127.0.0.1`，不暴露公网端口，安全。
- 与 Upstash 语义等价：`SET/GET/EXISTS/INCR/EXPIRE` 全部由 Redis 原生支持。

---

## 七、代码改动（已完成，2026-09-09）

改动集中在 [lib/server/upstash.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/upstash.ts)，已完成并验证：

1. `package.json` 增加依赖 `ioredis`。
2. 把 `redisCommand` 的实现从「Upstash REST fetch」换成「ioredis 执行命令」，保持返回结构 `RedisCommandResult[]` 不变。
3. 环境变量从 `UPSTASH_*` / `KV_*` 换成 `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`，同步更新 `hasRedisConfig`。
4. 三个存储测试同步更新环境变量名，`type-check` 通过、193 个测试全通过。

其余调用方（[trial.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/trial.ts)、[rate-limit.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/rate-limit.ts)、[quota.ts](file:///Users/qiu/Developer/personal/indigo-tarot/lib/server/quota.ts)）接口与语义不变，**无需改动**。

---

## 八、面试官体验与防滥用的平衡

- **免费试用「每设备 1 次」**：保留；面试官想多试可填自己的 Key（已支持，填个人 Key 不经过限制）。
- **IP 限流「3 小时 5 次」**：保留作为辅助防线；仅对「使用系统 Key」生效，填个人 Key 不受限。
- **每日配额**：保持默认 50（`QUOTA_DAILY_LIMIT`），足以覆盖少数面试官试用，同时拦住爬虫大量消耗。
- **成本兜底**：系统 Key 用 DeepSeek 固定充值余额，余额耗尽自动 401，成本硬封顶。

---

## 九、上线验证清单

- [ ] 公网 IP 可直接打开首页（关闭 VPN）
- [ ] 不填 Key 占卜 1 次成功
- [ ] 再次占卜提示「免费试用已用完」
- [ ] 填个人 DeepSeek Key 后可正常占卜
- [ ] AI 内容逐字流式返回（SSE 正常，未被缓冲）
- [ ] 历史记录正常保存/读取
- [ ] 重启服务器后，免费试用/每日配额计数不重置（Redis 持久化生效）

---

## 十、成本估算（2 个月）

| 项目 | 估算 |
|---|---|
| 轻量应用服务器（2 核 2G，锐驰型约 45 元/月 × 2） | 约 90 元 |
| 自建 Redis | 0 元 |
| DeepSeek | 沿用固定充值余额，无新增 |

---

## 十一、风险与注意事项

- **无 HTTPS**：公网 IP 直连只能用 HTTP，无法绑标准证书。对简历试用场景可接受；如需 HTTPS，后续加域名 + ICP 备案 + SSL 证书。
- **Redis 密码**：自建 Redis 虽只监听本机，仍要设置强密码，避免本机其他进程或误开放时未授权访问。
- **服务器安全**：只放行必要端口（22、3000），建议 SSH 用密钥登录。
- **SSE 流式**：轻量服务器常驻进程下无缓冲问题，保持默认即可。

---

## 十二、已确认（收尾）

1. 访问方式：接受「公网 IP + HTTP」（无 HTTPS）。
2. 状态存储：服务器自建 Redis（零额外成本）。
3. 服务器规格：2 核 2G（锐驰型）。
4. 现有 Vercel 生产地址：`https://indigo-tarot.vercel.app/`（用于上线后对照验证）。

代码改动已完成并验证通过，可进入部署阶段。
