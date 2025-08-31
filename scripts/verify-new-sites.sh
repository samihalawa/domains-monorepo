#!/usr/bin/env bash
set -e

BASE="https://domains-monorepo.pages.dev"
SITES=(
  cryptoadiccion
  gptenespanol
  gptvenezuela
  gptaddicts
  gptautoweb
  gptmundo
  gptplugindatabase
  gptpowerpoint
  gptveteran
  maximagpt
)

ok=0; fail=0
for s in "${SITES[@]}"; do
  url="$BASE/$s/"
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$code" != "200" ]; then
    echo "[FAIL] $s -> HTTP $code"
    fail=$((fail+1))
    continue
  fi
  body=$(curl -s "$url")
  news=$(echo "$body" | grep -c "tally.so/embed/mY1V66" || true)
  cont=$(echo "$body" | grep -c "tally.so/embed/wz9VVq" || true)
  foot=$(echo "$body" | grep -c "Agents AI Limited" || true)
  if [ "$news" -gt 0 ] && [ "$cont" -gt 0 ] && [ "$foot" -gt 0 ]; then
    echo "[OK]   $s -> 200 + tally(news/contact) + footer present"
    ok=$((ok+1))
  else
    echo "[WARN] $s -> 200 but missing elements: N=$news C=$cont F=$foot"
    fail=$((fail+1))
  fi
done

echo "---"
echo "Passed: $ok  Failed: $fail"
exit 0

