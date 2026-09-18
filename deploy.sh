#!/usr/bin/env bash
# 生产部署脚本（git 版，规格 N11）
#
# 用法：在服务器 /root/indigo-tarot 下执行 `./deploy.sh`
# 前置：该目录已是 git 仓库（首次从 tar 迁移的一次性步骤见 docs/DEPLOYMENT.md §三）
#
# 流程：记回退锚点 → 拉取并硬重置 main → 构建重启 → 验证 → 打印回退提示
# 不追求 CI/CD 自动部署——发布终点是人确认（见 docs/README.md 决策 D16）。
set -euo pipefail

# 回退锚点 = 当前线上版本（部署坏了用 git reset --hard <锚点> 回退）
PREV="$(git rev-parse --short HEAD)"
echo "回退锚点：${PREV}"

# 拉取并硬重置到 origin/main（自动删除仓库已删的文件）
git fetch origin main
git reset --hard origin/main

# 构建与重启（build 失败则 set -e 在此中断，pm2 不执行 → 线上仍是旧版）
npm ci
npm run build
pm2 restart indigo-tarot

# 验证
echo "--- 进程 ---"
pm2 status indigo-tarot
echo "--- 健康检查（应用 + Redis；503 = Redis 连不上）---"
curl -s localhost:3000/api/health
echo
echo "--- Nginx 链路（80 → 3000）---"
curl -s -o /dev/null -w 'HTTP %{http_code}\n' localhost

echo
echo "部署完成。当前版本：$(git rev-parse --short HEAD)"
echo "若需回退：git reset --hard ${PREV} && npm run build && pm2 restart indigo-tarot"
