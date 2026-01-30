#!/bin/bash
echo "Testing Stage 4 MVP-1 APIs..."
# We expect 401/403 or 200 depending on auth, but at least connection works
curl -v http://localhost:8080/jeecg-boot/sys/randomImage/123 2>&1 | grep "HTTP"
echo "Done."
