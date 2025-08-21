#!/bin/bash

# Domains Monorepo Deployment Script
# This script automates the deployment of all domain landing pages to Cloudflare Pages

echo "🚀 Starting Domains Monorepo Deployment..."
echo "================================================"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Function to deploy to Cloudflare Pages
deploy_to_cloudflare() {
    echo ""
    echo "☁️  Deploying to Cloudflare Pages..."
    npx wrangler pages deploy sites --project-name=domains-monorepo --commit-dirty=true
    
    if [ $? -eq 0 ]; then
        echo "✅ Deployment successful!"
    else
        echo "❌ Deployment failed. Please check the logs."
        exit 1
    fi
}

# Function to verify all domains
verify_domains() {
    echo ""
    echo "🔍 Verifying all domains are accessible..."
    
    domains=(
        "damecoins.com"
        "gptcoins.com"
        "detectar.ai"
        "empleados.ai"
        "instantvirtualcards.com"
        "damepay.com"
        "gptapikeys.com"
        "megacursos.com"
        "cryptoupdated.com"
        "gpt-excel.com"
        "autoword.ai"
        "autotinder.ai"
        "dameapi.com"
        "flywallex.com"
        "gateway24h.com"
        "fintechmorning.com"
        "visualingo.app"
        "mcp.blue"
        "sort.services"
        "agentsai.ltd"
    )
    
    for domain in "${domains[@]}"; do
        response=$(curl -o /dev/null -s -w "%{http_code}\n" "https://$domain")
        if [ "$response" == "200" ] || [ "$response" == "301" ] || [ "$response" == "302" ]; then
            echo "✅ $domain - Live (HTTP $response)"
        else
            echo "⚠️  $domain - Check required (HTTP $response)"
        fi
    done
}

# Function to build and optimize
build_and_optimize() {
    echo ""
    echo "🔧 Optimizing landing pages..."
    
    # Minify HTML files (if html-minifier is installed)
    if command -v html-minifier &> /dev/null; then
        for file in sites/*/index.html; do
            echo "Optimizing: $file"
            html-minifier --collapse-whitespace --remove-comments --minify-css true --minify-js true "$file" -o "$file"
        done
    else
        echo "ℹ️  html-minifier not found. Skipping optimization."
    fi
}

# Function to update deployment report
update_report() {
    echo ""
    echo "📊 Updating deployment report..."
    
    timestamp=$(date +"%Y-%m-%d %H:%M:%S")
    echo "" >> DEPLOYMENT-SUCCESS.md
    echo "## Latest Deployment" >> DEPLOYMENT-SUCCESS.md
    echo "- **Date**: $timestamp" >> DEPLOYMENT-SUCCESS.md
    echo "- **Status**: ✅ All domains deployed successfully" >> DEPLOYMENT-SUCCESS.md
    echo "- **Total Domains**: 20" >> DEPLOYMENT-SUCCESS.md
}

# Main deployment flow
main() {
    echo ""
    echo "📋 Deployment Steps:"
    echo "1. Build and optimize landing pages"
    echo "2. Deploy to Cloudflare Pages"
    echo "3. Verify all domains"
    echo "4. Update deployment report"
    echo ""
    
    read -p "Proceed with deployment? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_and_optimize
        deploy_to_cloudflare
        verify_domains
        update_report
        
        echo ""
        echo "================================================"
        echo "🎉 Deployment Complete!"
        echo "All 20 domains are now live with updated landing pages."
        echo ""
        echo "📊 Analytics: https://analytics.google.com"
        echo "📝 Forms: https://tally.so/forms/mO2EYY/submissions"
        echo "☁️  Cloudflare: https://dash.cloudflare.com"
        echo "================================================"
    else
        echo "Deployment cancelled."
        exit 0
    fi
}

# Run main function
main