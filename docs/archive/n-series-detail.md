# 运维台账 N 系列：条目过程记录

> **归档日期**：2026-09-18 ｜ **条目状态**：N1–N11 均已完成
>
> ⚠️ **本文是历史记录，不描述当前状态。** 台账的**现状**见 [`OPERATIONS.md`](../OPERATIONS.md) §二；
> 本文只保存各条目完成时的过程细节（根因、排查、实测数据、踩坑），供日后复盘。
>
> **本文只负责**：N 系列条目的过程记录。
> **本文不写**：当前状态（→ [`OPERATIONS.md`](../OPERATIONS.md)）、部署步骤（→ [`DEPLOYMENT.md`](../DEPLOYMENT.md)）。

---

## N1 监控告警配置

**为什么刻意不自建 Uptime Kuma**：监控与被监控同机，机器一挂两者同时失效——自建等于没有监控。

**配置明细**：
- UptimeRobot（免费版，5 分钟间隔，通知=邮件）两条：
  ① Keyword 监控——地址 `http://<SERVER_IP>`，关键字填「塔罗」；
  ② `/api/health` 监控——探 Redis 故障（503），与 ① 交叉验证。
- 腾讯云云监控三条阈值策略：CPU>80% / 内存>85% / 磁盘>85%（持续 5 分钟，满足条件=任意），
  通知绑微信公众号（短信每月 1000 条免费额度）。

## N2 `/api/health` 健康检查端点

**为什么需要**：Redis 配了却连不上时，配额/试用/限流会整套**静默降级为内存实现**，
而站点首页仍返回 200、看起来一切正常——纯页面探测发现不了这种故障。
`/api/health` 在此时返回 **503**，成为唯一能探到该状态的信号。

## N3 来源审计（聚合统计 + 查询接口）

**决策为仅聚合计数**：`lib/server/stats.ts` + `GET /api/admin/stats`，记录每日调用数 /
系统 Key / 用户 Key / 失败数 / 去重设备数。

**隐私边界**：不记 IP、不记问题内容、不记单次明细；去重设备数用 Redis HyperLogLog 估算，
**服务端不保存原始 deviceId**；聚合数据保留 30 天。

## N4 重启服务器验证 AOF

**实测记录**：重启前 `quota:count` = **4**、`trial:*` 键 **10** 个、`appendonly yes`；
控制台重启服务器后，两者**原样保留**、站点正常 → AOF 持久化生效。

## N5 PM2 内存上限与日志轮转

`max_memory_restart=500M`；`pm2-logrotate 3.0.0` 已装并 `pm2 save` 持久化到 `dump.pm2`。

## N6 依赖审计

**过程**：`npm audit` 报 15 项（1 critical / 10 high）→ 升级 `next` 16.1.6 → **16.3.5**
+ `npm audit fix` → **0 漏洞**。可选 CI 经评估不加（理由见 `migration-2026-09.md` §13）。

## N7 分支处置

`feature/less-modules` 已删除（其方向被决策 D4/O2 取代，最后提交 `3e40e49`）；
`feat/tencent-migration` 已并入 main。

## N9 Redis 故障静默降级无告警

**问题**：Redis 挂掉时配额/试用/限流失效，站点仍 200，且当时是空 error handler → 无人知晓。

**修复**：给 UptimeRobot 加 `/api/health` 监控（该端点在 Redis 连不上时返回 503）。
至此无需再改空 error handler——**用外部探测而非应用内告警**覆盖该盲区。

## N10 443 丢包黑洞

**症状**：部分访客完全打不开站点，卡在超时页。请求到不了 nginx，
**UptimeRobot 与云监控都直连 HTTP、全部绿灯**，监控完全发现不了。

**根因**：Chrome 的 HTTPS Upgrades 会把 `http://` 升级到 `https://`；本机 443 被防火墙
**丢包**（`Connection timed out`），于是"失败"变成"等待"，浏览器的回落逻辑等不到信号。

**修复**：腾讯云防火墙**放行** 443 → 服务器上本无监听者、内核直接回 RST → 443 变为
**快速拒绝**（`Connection refused`）→ 浏览器得以回落 HTTP。

**验证**：手机蜂窝网络 / 关闭 Clash 后实测 `http://<SERVER_IP>` 正常打开。

**两个坑**：
1. 改「防火墙**模板**」不会同步到实例，必须直接改「实例**防火墙**」——曾因此把 22/80 一起弄丢、致全站 502。
2. 本机 **Clash 会把 443 扭曲成** `ERR_CONNECTION_CLOSED`，验证时须关 Clash 或给该 IP 加直连。

**教训**：此类故障（请求到不了 nginx）监控全绿也发现不了，只能靠真机实测。

## N11 部署方式从 tar 切到 git

**动机**：旧 tar 覆盖流程推导出三个额外复杂度——① 服务器直连 GitHub 超时，须走 `ghfast.top`
镜像 curl；② tar 只覆盖不删除，须手工对账残留文件；③ tar 无版本概念，须手工维护
`.deployed-sha` 回退锚点。三者**全部源于用 tar 而非 git**。

**服务器文件清点**（切换前，用 `comm` 三方对比仓库与服务器）：
- **无 tar 残留**（不存在"仓库已删、服务器仍在"的文件）
- 仓库外文件仅三个：`.env.local`（`.gitignore` 保护）、`.deployed-sha`（切换后淘汰）、
  `next-env.d.ts`（Next 自动生成）
- 结论：**不需要 `git clean`**，原地 `git init` 即可，规避了 `git clean -fdx` 误删 `.env.local` 的风险

**镜像连通性实测**（2026-09-18）：`git clone --depth 1 https://ghfast.top/https://github.com/HammerRoot/indigo-tarot.git`
成功，236 objects / 29.44 MiB / 4.59 MiB/s。

**边界**：刻意**不做 CI/CD 自动部署**——项目纪律要求发布终点是人确认（见 `README.md` 决策 D16）。
上限是"人 ssh 上去跑一条命令"。

## 附：`ADMIN_TOKEN` 轮换调查（未执行，暂缓）

**实测现状**：生产 token 与本地 `.env.local` **完全相同**（比对指纹一致）；长度 32 hex（强随机）；
`.env.local` 从未被 git 跟踪；唯一副本（Vercel 环境变量）已于 Q2 清理。

**判定**：低风险卫生项，非活跃漏洞。唯一站得住的理由是——生产与本地共用同一值，
笔记本失窃即等于生产管理权失窃。

**触发条件**（满足任一即执行轮换）：设备丢失/送修、`.env.local` 外发、需向他人演示服务器。

**操作**：改服务器 `.env.local` + `pm2 restart`（无需重新 build，已实测环境变量为运行时读取）。
