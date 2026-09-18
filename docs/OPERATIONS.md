# 运维现状与待办（腾讯云）

> **本文只负责**：**当前**部署现状、台账状态（N 任务 / Q 疑点）、已知限制与风险。
> **本文不写**：项目功能与技术栈（→ [`../README.md`](../README.md)）、环境变量与部署步骤
> （→ [`DEPLOYMENT.md`](./DEPLOYMENT.md)）、条目状态与决策记录（→ [`SPEC.md`](./SPEC.md)）、
> **一切过程与事故经过**（迁移 → [`archive/migration-2026-09.md`](./archive/migration-2026-09.md)；
> 运维条目 → [`archive/n-series-detail.md`](./archive/n-series-detail.md)）。
>
> 生产入口：`http://<SERVER_IP>`（HTTP 直连，免 VPN、免 ICP 备案）。
>
> **责任划分**：需要「平台账号 / 线上操作 / 业务决策」的归负责人；「代码改动与本地可验证」的归我。
>
> 文档总览与规则见 [`README.md`](./README.md)。

---

## 一、现状速览

| 维度 | 现状 |
|---|---|
| 入口 | `http://<SERVER_IP>`（腾讯云 Lighthouse，Ubuntu 22.04，实例 `<INSTANCE_ID>`） |
| 运行 | **Nginx（80，对外）→ PM2 `indigo-tarot`（127.0.0.1:3000）** + Node 20.19.0；两者均已配开机自启 |
| 状态存储 | 服务器自建 Redis（`127.0.0.1:6379`，requirepass + AOF） |
| 防滥用 | 免费试用（每设备 1 次）+ IP 限流（3h/5 次）+ 每日配额熔断（50 次/天，可开关） |
| 发布方式 | **人确认后手工触发**（无 CI/CD，决策 D16）。当前为 tar 覆盖；N11 已就绪，待服务器迁移到 git + `deploy.sh` |
| 监控告警 | ✅ 已配置：UptimeRobot（Keyword「塔罗」+ `/api/health` 双监控，5 分钟间隔，邮件通知）、腾讯云云监控三条阈值策略（CPU>80% / 内存>85% / 磁盘>85%，微信通知） |
| **传输层** | **HTTP 明文，无 HTTPS**（2026-09-16 已决策：接受现状）。443 已改为**快速拒绝**（N10，2026-09-17），浏览器可回落到 HTTP |

---

## 二、运维台账

> **本表只记状态**（是什么、完成没有、谁确认）。过程（根因、排查、实测数据、踩坑）在
> [`archive/n-series-detail.md`](./archive/n-series-detail.md)——需要复盘时再查，日常看本表即可。
>
> 两套编号：**N = 要做的事**，**Q = 要查的疑**。二者都会在完成后进本表，不另开章节。

### N 系列（任务）

| 编号 | 事项 | 现状 | 责任 |
|---|---|---|---|
| N1 | 监控告警配置（UptimeRobot + 腾讯云云监控） | ✅ 已完成（2026-09-16） | 你 |
| N2 | `/api/health` 健康检查端点 | ✅ 已完成并上线（2026-09-16） | 我 |
| N3 | 来源审计（聚合统计 + 查询接口，无 IP / 无问题内容 / 无单次明细） | ✅ 已完成并上线（2026-09-16） | 我 |
| N4 | AOF 持久化：重启服务器计数不重置 | ✅ 已验证（2026-09-16） | 你 |
| N5 | PM2 `max_memory_restart=500M` + 日志轮转 | ✅ 已完成（2026-09-16） | 我 |
| N6 | 依赖审计（`next` 升至 16.3.5，0 漏洞） | ✅ 已完成并上线（2026-09-16） | 我 |
| N7 | 分支处置 | ✅ 已完成（2026-09-16） | 我 |
| N8 | 补齐 Redis 分支测试（quota / rate-limit / trial，26 例） | ✅ 已完成（2026-09-16）→ [详情](./archive/n8-redis-branch-tests.md) | 我 |
| N9 | Redis 故障静默降级 → 已接入外部探测告警 | ✅ 已完成（2026-09-16） | 你 |
| N10 | 443 由丢包黑洞改为快速拒绝（避免访客彻底打不开） | ✅ 已完成（2026-09-17） | 你 |
| N11 | 部署方式由 tar 覆盖改为 git + `deploy.sh` | 🚧 **代码已就绪，服务器迁移待执行**（2026-09-18） | 我 |

### Q 系列（疑点）

**当前无未关闭疑点**——三项均已查清关闭，详细经过在 `archive/`：

| 编号 | 疑点 | 结论 |
|---|---|---|
| Q1 | 客户端自带 `X-Forwarded-For` 是否可伪造限流键 | ✅ 已修复（2026-09-16，方案 A：前置 Nginx 覆写 `$remote_addr`，应用零改动）→ [归档 §16](./archive/migration-2026-09.md) |
| Q2 | Vercel 旧部署可绕过每日熔断 | ✅ 已关闭（2026-09-16，该平台已删除）→ [归档 §12](./archive/migration-2026-09.md) |
| Q3 | IP 限流地址来源 | ✅ 已澄清（正常客户端按真实 IP 生效）→ [归档 §15](./archive/migration-2026-09.md) |

---

## 三、已知限制与风险（未解决）

- **无 HTTPS**（已决策接受）：公网 IP 直连只能用 HTTP，无法绑标准证书。除观感外有实质影响——
  用户自填的 DeepSeek Key、问题内容、`ADMIN_TOKEN` 均明文过网。如需 HTTPS：加域名 + ICP 备案 + 证书，
  现有前置 Nginx 直接加 443 server 块即可，**应用侧零改动**。
- **HTTP 下 Web Crypto 受限**（同上，接受）：`crypto.subtle` 在非安全上下文不可用，API Key「记住」
  功能失效（刷新丢 Key），**上 HTTPS 才能恢复**。该限制在 UI 上已如实呈现（O6）：
  不可用时「记住 Key」整行不渲染，不出现"勾了却不生效"。
- **Redis / 服务器安全**：自建 Redis 只监听本机，仍需强密码；服务器放行 22 / 80 / **443**
  （**443 必须放行**，见 N10）；`.env.local` 权限已设 600；**SSH 密钥登录尚未启用**（改错即失联，
  非当前优先级）。
- **部署链路单点依赖第三方镜像**：服务器直连 GitHub 超时，`origin` 在迁移时被写死为 `ghfast.top` 镜像。
  该服务失效 ⇒ `git fetch` 失败 ⇒ **在找到替代镜像前无法部署**。影响面有限：`deploy.sh` 的
  `set -euo pipefail` 会让它在 fetch 处安全中断，**不污染线上**（线上仍是旧版本）。
  恢复：`git remote set-url origin <新镜像>/…`。详见 [`DEPLOYMENT.md`](./DEPLOYMENT.md) §3.2。
- **`ADMIN_TOKEN` 生产与本地共用同一值**（2026-09-16 决定暂缓轮换，判定为低风险卫生项）：
  生产与本地同值 → 设备失窃即等于生产管理权失窃。轮换操作：改服务器 `.env.local` + `pm2 restart`
  （无需重新 build）；触发条件（设备丢失/送修、文件外发、对外演示）与调查记录见
  [N 系列详情](./archive/n-series-detail.md)。
- **无调用日志**：出问题无法回溯「谁在什么时候用了什么」，只能看到计数（排查手段见[归档 §14.1](./archive/migration-2026-09.md)）。
- **Redis 故障时降级但无自动处置**：Redis 挂掉时配额/试用/限流**失效**，而站点仍返回 200、
  看起来一切正常。已有探测（UptimeRobot 的 `/api/health` 监控，N1/N9），但**没有自动恢复或阻断**
  ——探测到之后仍需人工处理。
- **公网 IP 持续被扫描**：错误日志中可见探测 Next.js Server Action 的请求（`Failed to find Server
  Action "x"`）。本项目**不使用 Server Actions**，Next 正确拒绝，**无实际影响**——属公网 IP 的
  正常背景噪音，也是及时升级依赖的理由之一。

---

## 四、归档索引

本文只留现状，**过程在归档**：

| 想查什么 | 去哪 |
|---|---|
| **N 系列各条目的过程**（根因、排查、实测数据、踩坑） | [`archive/n-series-detail.md`](./archive/n-series-detail.md) |
| N8 Redis 分支测试的全部内容 | [`archive/n8-redis-branch-tests.md`](./archive/n8-redis-branch-tests.md) |
| N11 部署方式切换的 spec | [`archive/n11-git-deploy.md`](./archive/n11-git-deploy.md) |
| 迁移过程与事故经过 | [`archive/migration-2026-09.md`](./archive/migration-2026-09.md)（章节见下） |

### `migration-2026-09.md` 章节索引

| 想查什么 | 归档章节 |
|---|---|
| 部署概览 / 已确认决策 | §1、§2 |
| 实际部署步骤（含环境变量、Redis、PM2、防火墙） | §4、§5 |
| 已完成的代码改动（ioredis 迁移、deviceId 兼容 HTTP） | §6 |
| 防滥用策略现状（试用/限流/配额/成本兜底） | §7 |
| 问题排查记录（6 项） | §10 |
| 分支、发布、Vercel 处置、CI/CD 结论 | §11、§12、§13 |
| 用量与来源查询速查（管理 API + redis-cli） | §14 |
| IP 限流疑点实测记录 | §15 |
| Nginx 反向代理接入（Q1 修复）：背景、架构变化、切换步骤、实测结果 | §16（**当前配置全文已移至 [`DEPLOYMENT.md`](./DEPLOYMENT.md) §三**） |
