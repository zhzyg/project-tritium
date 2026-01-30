#!/bin/bash
echo "--- Regression Test for Stage 4 MVP-1 ---"

BASE_URL="http://localhost:8080/jeecg-boot"

# 1. Test List Tasks (GET /bpm/task/my)
echo "1. Testing listMyTasks (GET /bpm/task/my)..."
curl -s -I "$BASE_URL/bpm/task/my" | grep "HTTP"

# 2. Test Process Vars (POST /bpm/process/vars) - Expect 405 if GET, 200/400/500 if POST
echo "2. Testing getProcessVars (POST /bpm/process/vars)..."
# Sending empty body might fail validation but proves endpoint exists
curl -s -X POST "$BASE_URL/bpm/process/vars" -H "Content-Type: application/json" -d '{}' -I | grep "HTTP"

# 3. Test Claim (POST /bpm/task/claim)
echo "3. Testing claimTask (POST /bpm/task/claim)..."
curl -s -X POST "$BASE_URL/bpm/task/claim" -H "Content-Type: application/json" -d '{}' -I | grep "HTTP"

echo "Regression Test Complete."
