# CONTEXT (Single Source of Truth)

## Production Access
- Domain: https://oa.donaldzhu.com
- Nginx: reverse proxy
- JeecgBoot base path: /jeecg-boot/
- Health endpoint: /jeecg-boot/sys/randomImage/123 (expect 200)

## Server
- OS: Ubuntu 24.04
- Public IPv4: 172.104.180.96
- Public IPv6: 2400:8901::2000:f6ff:fe15:8c77

## Ports / Services
- Nginx: 80/443
- Backend: 127.0.0.1:8080
- MySQL container: tritium-mysql (host port 13306)
- Redis container: tritium-redis

## Database (important)
- Schema: tritium
- Quartz prefix: QRTZ_ (uppercase)
- lower_case_table_names=0 (case-sensitive)

## Forbidden (never commit)
- *.key/*.crt/.env/application-prod*.yml
- Any real secrets/passwords/tokens

## Required Process (for AI or human)
- Before changes: run ops/preflight.sh and it must pass
- After changes: run ops/verify.sh and it must pass
- Record changes in docs/ai/CHANGELOG.md
