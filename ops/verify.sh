#!/usr/bin/env bash
set -euo pipefail

echo "[verify] nginx config test"
sudo nginx -t >/dev/null

echo "[verify] health check via nginx"
curl -fsS -o /dev/null -I https://oa.donaldzhu.com/jeecg-boot/sys/randomImage/123

echo "[verify] backend direct health (local)"
curl -fsS -o /dev/null -I http://127.0.0.1:8080/jeecg-boot/sys/randomImage/123

echo "[verify] OK"
