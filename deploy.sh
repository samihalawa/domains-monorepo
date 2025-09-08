#!/bin/bash
# Production Deployment Script for Domain Empire Dashboard

echo "🚀 Domain Empire Deployment Script"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    # Check for wrangler
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
        npm install -g wrangler
    else
        echo -e "${GREEN}✅ Wrangler CLI found${NC}"
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js not found. Please install Node.js${NC}"
        exit 1
    else
        echo -e "${GREEN}✅ Node.js found ($(node --version))${NC}"
    fi
    
    # Check for environment variables
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
        cp .env.example .env
        echo -e "${GREEN}✅ .env file created${NC}"
    else
        echo -e "${GREEN}✅ .env file exists${NC}"
    fi
}

# Deploy Cloudflare Worker
deploy_worker() {
    echo -e "\n${BLUE}Deploying Cloudflare Worker...${NC}"
    cd workers/unified
    
    # Deploy to production
    npx wrangler deploy --env production
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Worker deployed successfully${NC}"
        echo -e "${GREEN}   URL: https://unified-domains-worker-production.trigox.workers.dev${NC}"
    else
        echo -e "${RED}❌ Worker deployment failed${NC}"
        exit 1
    fi
    
    cd ../..
}

# Deploy Dashboard to Cloudflare Pages
deploy_dashboard() {
    echo -e "\n${BLUE}Deploying Dashboard to Cloudflare Pages...${NC}"
    
    # Build dashboard for production
    echo -e "${YELLOW}Building dashboard...${NC}"
    
    # Create dist directory
    mkdir -p dist
    
    # Copy dashboard files
    cp -r dashboard/* dist/
    
    # Update API endpoints to production
    sed -i '' "s|http://localhost:8787|https://unified-domains-worker-production.trigox.workers.dev|g" dist/index.html
    
    echo -e "${GREEN}✅ Dashboard built for production${NC}"
    
    # Deploy to Cloudflare Pages (if configured)
    if command -v wrangler &> /dev/null; then
        echo -e "${YELLOW}Deploying to Cloudflare Pages...${NC}"
        npx wrangler pages deploy dist --project-name=domain-empire-dashboard
    fi
}

# Health check
health_check() {
    echo -e "\n${BLUE}Running health checks...${NC}"
    
    # Check Worker health
    echo -e "${YELLOW}Checking Worker health...${NC}"
    HEALTH_RESPONSE=$(curl -s https://unified-domains-worker-production.trigox.workers.dev/health)
    
    if [[ $HEALTH_RESPONSE == *"\"ok\":true"* ]]; then
        echo -e "${GREEN}✅ Worker is healthy${NC}"
    else
        echo -e "${RED}❌ Worker health check failed${NC}"
    fi
    
    # Check domains API
    echo -e "${YELLOW}Checking Domains API...${NC}"
    DOMAINS_RESPONSE=$(curl -s https://unified-domains-worker-production.trigox.workers.dev/api/dashboard/domains | jq '.counts.total')
    
    if [ "$DOMAINS_RESPONSE" -gt 0 ]; then
        echo -e "${GREEN}✅ Domains API working (${DOMAINS_RESPONSE} domains found)${NC}"
    else
        echo -e "${RED}❌ Domains API check failed${NC}"
    fi
}

# Main deployment flow
main() {
    echo -e "${BLUE}Starting deployment process...${NC}\n"
    
    # Step 1: Check prerequisites
    check_prerequisites
    
    # Step 2: Deploy Worker
    deploy_worker
    
    # Step 3: Deploy Dashboard
    deploy_dashboard
    
    # Step 4: Health checks
    health_check
    
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${BLUE}=================================="
    echo -e "Dashboard URL: ${GREEN}https://domain-empire-dashboard.pages.dev${NC}"
    echo -e "API URL: ${GREEN}https://unified-domains-worker-production.trigox.workers.dev${NC}"
    echo -e "Health Check: ${GREEN}https://unified-domains-worker-production.trigox.workers.dev/health${NC}"
    echo -e "${BLUE}==================================${NC}\n"
}

# Run main function
main