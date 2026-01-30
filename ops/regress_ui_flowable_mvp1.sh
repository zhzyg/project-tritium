#!/bin/bash
echo "Testing Stage 4 MVP-1 APIs..."
# Test GET /bpm/task/my
curl -v http://localhost:8080/jeecg-boot/bpm/task/my 2>&1 | grep "HTTP"
echo "Done."
