# Deployment Checklist (for Roo Code audit)

## Preflight
- [ ] nginx -t passes
- [ ] port 80/443 listening by nginx
- [ ] backend health endpoint returns 200 via Nginx: /jeecg-boot/sys/randomImage/123

## Database
- [ ] MySQL reachable
- [ ] Quartz tables exist with QRTZ_ prefix
- [ ] lower_case_table_names=0 confirmed

## Post-Change Verify
- [ ] ops/verify.sh passes
- [ ] No Quartz table missing errors in startup logs
