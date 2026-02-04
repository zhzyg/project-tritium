#!/bin/bash
# ops/wait_backend_ready.sh
# Wait for backend (/jeecg-boot/) to be ready

BASE_URL=${1:-"https://oa.donaldzhu.com"}
MAX_RETRIES=${WAIT_BACKEND_MAX_RETRIES:-30}
RETRY_INTERVAL=${WAIT_BACKEND_RETRY_INTERVAL:-3}

echo "⏳ Waiting for backend ready at $BASE_URL/jeecg-boot/ ..."

for i in $(seq 1 $MAX_RETRIES); do
  CODE=$(curl -k -sS -o /dev/null -w "%{http_code}" "$BASE_URL/jeecg-boot/")
  if [[ "$CODE" == "200" || "$CODE" == "302" ]]; then
    echo "✅ Backend is READY (HTTP $CODE) after $((i * RETRY_INTERVAL))s"
    exit 0
  fi
  echo "... still waiting ($i/$MAX_RETRIES), last code: $CODE"
  sleep $RETRY_INTERVAL
done

echo "❌ TIMEOUT: Backend not ready after $((MAX_RETRIES * RETRY_INTERVAL))s"
exit 1
