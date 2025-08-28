#!/bin/bash

# Serverless Dashboard Deployment Script
# Deploys the API worker and sets up environment variables

set -e

echo "🚀 Deploying Serverless Domain Dashboard..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler is not installed. Installing..."
    npm install -g wrangler
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Please login to Cloudflare:"
    wrangler login
fi

# Load environment variables from ~/.env if it exists
if [ -f ~/.env ]; then
    echo "📋 Loading environment variables from ~/.env..."
    source ~/.env
else
    echo "⚠️  ~/.env file not found. You'll need to set secrets manually."
fi

# Deploy the worker
echo "🔧 Deploying API worker..."
wrangler publish

# Set environment variables if they exist
echo "🔐 Setting up environment variables..."

if [ ! -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "Setting CLOUDFLARE_API_TOKEN..."
    echo "$CLOUDFLARE_API_TOKEN" | wrangler secret put CLOUDFLARE_API_TOKEN
else
    echo "⚠️  CLOUDFLARE_API_TOKEN not found in ~/.env"
    echo "Please set it manually: wrangler secret put CLOUDFLARE_API_TOKEN"
fi

if [ ! -z "$NETLIFY_ACCESS_TOKEN" ]; then
    echo "Setting NETLIFY_ACCESS_TOKEN..."
    echo "$NETLIFY_ACCESS_TOKEN" | wrangler secret put NETLIFY_ACCESS_TOKEN
else
    echo "⚠️  NETLIFY_ACCESS_TOKEN not found in ~/.env"
    echo "Please set it manually: wrangler secret put NETLIFY_ACCESS_TOKEN"
fi

if [ ! -z "$GITHUB_TOKEN" ]; then
    echo "Setting GITHUB_TOKEN..."
    echo "$GITHUB_TOKEN" | wrangler secret put GITHUB_TOKEN
else
    echo "⚠️  GITHUB_TOKEN not found in ~/.env"
    echo "Please set it manually: wrangler secret put GITHUB_TOKEN"
fi

# Test the worker
echo "🧪 Testing API worker..."
WORKER_URL=$(wrangler whoami | grep "account" | cut -d'"' -f4 | head -1)

if [ ! -z "$WORKER_URL" ]; then
    FULL_URL="https://domains-dashboard-api.${WORKER_URL}.workers.dev/api/health"
    echo "Testing: $FULL_URL"
    
    if curl -s "$FULL_URL" | grep -q "ok"; then
        echo "✅ Worker is responding correctly!"
        echo ""
        echo "🎉 Deployment successful!"
        echo "📍 Worker URL: $FULL_URL"
        echo ""
        echo "📝 Next steps:"
        echo "1. Update CONFIG.apiWorker in index.html with your worker URL"
        echo "2. Deploy the dashboard HTML file"
        echo "3. Access your dashboard and test the functionality"
    else
        echo "❌ Worker health check failed"
        echo "Check the deployment and try again"
    fi
else
    echo "⚠️  Could not determine worker URL automatically"
    echo "Please check wrangler output above for your worker URL"
fi

echo ""
echo "📚 For more information, see README.md"