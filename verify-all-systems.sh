#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔍 COMPREHENSIVE SYSTEM VERIFICATION"
echo "=========================================="
echo ""

# Counter for passed/failed tests
PASSED=0
FAILED=0

# Function to test URL
test_url() {
    local url=$1
    local description=$2
    local expected_code=${3:-200}
    
    echo -n "Testing: $description... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $response)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $response, expected $expected_code)"
        ((FAILED++))
    fi
}

# Function to test API endpoint
test_api() {
    local url=$1
    local description=$2
    
    echo -n "Testing API: $description... "
    response=$(curl -s "$url")
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC} (Valid JSON)"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC} (Invalid response)"
        ((FAILED++))
    fi
}

echo "1️⃣  TESTING WORKER DEPLOYMENTS"
echo "================================"

# Test main workers
test_url "https://domains-monorepo.trigox.workers.dev" "Router Worker"
test_url "https://domains-dashboard-api.trigox.workers.dev" "Dashboard API Worker"
test_url "https://autoblog-cms.trigox.workers.dev/api/blogs" "Blog Worker API"

echo ""
echo "2️⃣  TESTING ROUTER API ENDPOINTS"
echo "================================="

test_api "https://domains-monorepo.trigox.workers.dev/api/router/map" "Router Map API"
test_api "https://domains-monorepo.trigox.workers.dev/api/router/health" "Router Health API"

echo ""
echo "3️⃣  TESTING DASHBOARD API ENDPOINTS"
echo "===================================="

test_api "https://domains-dashboard-api.trigox.workers.dev/api/status" "Dashboard Status API"
test_api "https://domains-dashboard-api.trigox.workers.dev/api/deployment-map" "Deployment Map API"
test_api "https://domains-dashboard-api.trigox.workers.dev/api/domains" "Domains API"

echo ""
echo "4️⃣  TESTING BLOG API ENDPOINTS"
echo "================================"

test_api "https://autoblog-cms.trigox.workers.dev/api/blogs" "List Blogs"
test_api "https://autoblog-cms.trigox.workers.dev/api/posts" "List Posts"

echo ""
echo "5️⃣  TESTING BLOG RENDERING"
echo "============================"

# Test blog preview through router
test_url "https://domains-monorepo.trigox.workers.dev/_preview/blog?domain=gptmundo.com" "GPT Mundo Blog Preview"
test_url "https://domains-monorepo.trigox.workers.dev/_preview/blog?domain=gptcoins.com" "GPT Coins Blog Preview"
test_url "https://domains-monorepo.trigox.workers.dev/_preview/blog?domain=empleados.ai" "Empleados AI Blog Preview"

echo ""
echo "6️⃣  TESTING STATIC SITES (via Cloudflare Pages)"
echo "================================================"

# Test some static sites through Pages
test_url "https://domains-monorepo.pages.dev/gptcoins/" "GPT Coins Static Site"
test_url "https://domains-monorepo.pages.dev/damecoins/" "DameCoins Static Site"
test_url "https://domains-monorepo.pages.dev/empleados/" "Empleados Static Site"
test_url "https://domains-monorepo.pages.dev/gptpowerpoint/" "GPT PowerPoint Static Site"

echo ""
echo "7️⃣  TESTING DOMAIN ROUTING (Sample Domains)"
echo "============================================="

# Test actual domain routing (these should redirect or serve content)
domains=(
    "gptcoins.com"
    "damecoins.com"
    "empleados.ai"
    "instantvirtualcards.com"
    "gptapikeys.com"
)

for domain in "${domains[@]}"; do
    test_url "https://$domain" "$domain routing"
done

echo ""
echo "8️⃣  TESTING BLOG POSTS"
echo "======================="

# Test specific blog posts through API
echo -n "Testing: Blog posts for gptmundo.com... "
posts=$(curl -s "https://autoblog-cms.trigox.workers.dev/api/posts?blog=gptmundo.com" | jq -r '.posts | length')
if [ "$posts" -gt 0 ]; then
    echo -e "${GREEN}✓ PASS${NC} ($posts posts found)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (No posts found)"
    ((FAILED++))
fi

echo ""
echo "=========================================="
echo "📊 VERIFICATION SUMMARY"
echo "=========================================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED!${NC}"
else
    echo -e "\n${YELLOW}⚠️ Some tests failed. Review the output above.${NC}"
fi

echo ""
echo "=========================================="
echo "📝 QUICK ACCESS LINKS"
echo "=========================================="
echo "Dashboard: https://domains-dashboard-api.trigox.workers.dev/"
echo "Blog Admin: https://autoblog-cms.trigox.workers.dev/admin"
echo "Router Map: https://domains-monorepo.trigox.workers.dev/api/router/map"
echo "Pages Preview: https://domains-monorepo.pages.dev/"
echo ""
