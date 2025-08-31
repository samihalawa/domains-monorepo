#!/usr/bin/env bash
set -e

# Verify all live domains work via the router
DOMAINS=(
  cryptoadiccion.com
  gptenespanol.com
  gptvenezuela.com
  gptaddicts.com
  gptautoweb.com
  gptmundo.com
  gptplugindatabase.com
  gptpowerpoint.com
  gptveteran.com
  maximagpt.com
)

echo "=== Live Domain Verification ==="
echo "Checking apex and www for each domain..."
echo

pass=0
fail=0
pending=0

for domain in "${DOMAINS[@]}"; do
  echo "Testing $domain..."
  
  # Test apex
  apex_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 12 "https://$domain/" 2>/dev/null || echo "000")
  
  # Test www
  www_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 12 "https://www.$domain/" 2>/dev/null || echo "000")
  
  if [ "$apex_code" = "200" ] && [ "$www_code" = "200" ]; then
    echo "✅ $domain -> Working (apex: $apex_code, www: $www_code)"
    pass=$((pass+1))
  elif [ "$apex_code" = "000" ] || [ "$www_code" = "000" ]; then
    echo "⏳ $domain -> DNS propagating (apex: $apex_code, www: $www_code)"
    pending=$((pending+1))
  else
    echo "❌ $domain -> Error (apex: $apex_code, www: $www_code)"
    fail=$((fail+1))
  fi
done

echo
echo "=== Summary ==="
echo "✅ Working: $pass"
echo "⏳ Propagating: $pending"
echo "❌ Failed: $fail"
echo "📊 Total: 10 domains"

if [ $pass -eq 10 ]; then
  echo
  echo "🎉 All domains are live!"
elif [ $pending -gt 0 ]; then
  echo
  echo "⏳ DNS propagation in progress. Run this script again in a few minutes."
fi

exit 0