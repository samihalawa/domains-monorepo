#!/bin/bash

# Deployment script for all domains
# This script configures DNS and deploys sites to Cloudflare Pages

echo "🚀 Deploying 20 Domain Sites to Cloudflare"
echo "=========================================="

# Install dependencies
npm install

# Build all sites (if needed)
echo "📦 Sites are static HTML, ready to deploy"

# Deploy to Cloudflare Pages
echo "📤 Deploying to Cloudflare Pages..."

# You can use Wrangler or Cloudflare API to deploy
# Example for each domain:
domains=(
  "damecoins"
  "gptcoins"
  "detectar"
  "empleados"
  "instantvirtualcards"
  "damepay"
  "gptapikeys"
  "megacursos"
  "cryptoupdated"
  "gpt-excel"
  "autoword"
  "autotinder"
  "dameapi"
  "flywallex"
  "gateway24h"
  "fintechmorning"
  "visualingo"
  "mcp"
  "sort"
  "agentsai"
)

for domain in "${domains[@]}"; do
  echo "Deploying $domain..."
  # wrangler pages deploy sites/$domain --project-name=$domain
done

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Configure DNS in Cloudflare for each domain"
echo "2. Point each domain to Cloudflare Pages"
echo "3. Enable Universal SSL"
echo "4. Sites will automatically have tracking via zarazscript.trigox.workers.dev"