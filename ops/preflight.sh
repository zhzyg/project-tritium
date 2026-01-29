#!/usr/bin/env bash
set -euo pipefail

echo "[preflight] nginx config test"
sudo nginx -t >/dev/null

echo "[preflight] listening ports (80/443)"
sudo ss -lntp | egrep ':(80|443)\b' || (echo "80/443 not listening" && exit 1)

echo "[preflight] health check via nginx"
curl -fsS -o /dev/null -I https://oa.donaldzhu.com/jeecg-boot/sys/randomImage/123

echo "[preflight] OK"
