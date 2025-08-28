#!/bin/bash

# 🚀 Domains Monorepo - Master Deployment Script
# Deploys both workers and manages the complete monorepo

set -e

echo "🌐 DOMAINS MONOREPO - COMPLETE DEPLOYMENT"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if logged in to Cloudflare
echo "1️⃣  Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare${NC}"
    echo "Please run: wrangler login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated with Cloudflare${NC}"
echo ""

# Deploy the main domain router worker
echo "2️⃣  Deploying Domain Router Worker..."
echo "   This routes all 24 domains to their /sites/ content"
cd workers/router
wrangler deploy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Domain Router deployed successfully${NC}"
else
    echo -e "${RED}❌ Domain Router deployment failed${NC}"
    exit 1
fi
cd ../..
echo ""

# Deploy the dashboard API worker
echo "3️⃣  Deploying Dashboard API Worker..."
echo "   This handles API calls for the management dashboard"
cd workers/dashboard-api
wrangler deploy
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Dashboard API deployed successfully${NC}"
else
    echo -e "${RED}❌ Dashboard API deployment failed${NC}"
    exit 1
fi
cd ../..
echo ""

# Check if secrets are set
echo "4️⃣  Checking API secrets configuration..."
cd workers/dashboard-api

# Check each secret
MISSING_SECRETS=()
for secret in CLOUDFLARE_API_TOKEN NETLIFY_ACCESS_TOKEN GITHUB_TOKEN; do
    if ! wrangler secret list 2>/dev/null | grep -q "$secret"; then
        MISSING_SECRETS+=($secret)
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing secrets: ${MISSING_SECRETS[@]}${NC}"
    echo ""
    echo "To set secrets, run:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "  wrangler secret put $secret --config workers/dashboard-api/wrangler.toml"
    done
else
    echo -e "${GREEN}✅ All secrets configured${NC}"
fi
cd ../..
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}📊 DEPLOYMENT SUMMARY${NC}"
echo "=========================================="
echo ""
echo "✅ Domain Router Worker:"
echo "   - Routes: 24 domains"
echo "   - Examples: gptcoins.com, damecoins.com, detectar.ai"
echo "   - Content from: /sites/[domain]/ folders"
echo ""
echo "✅ Dashboard API Worker:"
echo "   - URL: https://domains-dashboard-api.trigox.workers.dev"
echo "   - Features: Cloudflare, Netlify, GitHub API integration"
echo ""
echo "✅ Cloudflare Pages:"
echo "   - URL: https://domains-monorepo.pages.dev"
echo "   - Hosts: All /sites/ static content"
echo "   - Auto-deploys on git push"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Visit any of your domains to verify routing"
echo "2. Access dashboard at dashboard/index.html"
echo "3. Push to git to update Pages content"