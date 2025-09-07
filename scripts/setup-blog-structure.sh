#!/bin/bash

# Quick Blog Setup Script - Creates initial blog structure for top domains
# This script sets up the directory structure and configuration without requiring Airtable API

set -e

echo "🚀 Setting up blog infrastructure for top domains..."

# Top priority domains for blog deployment
DOMAINS=(
  "autoword.ai"
  "empleados.ai" 
  "gptabsolute.com"
  "damecoins.com"
  "apilord.com"
)

# Create blog directories and basic structure
for domain in "${DOMAINS[@]}"; do
  echo "📁 Setting up directory for $domain..."
  
  # Convert domain to directory name (remove dots)
  dir_name=${domain//./}
  
  # Create blog directory structure
  mkdir -p "sites/$dir_name/blog"
  mkdir -p "sites/$dir_name/assets"
  
  # Create basic blog configuration
  cat > "sites/$dir_name/blog/config.json" << EOF
{
  "domain": "$domain",
  "title": "$(echo $domain | sed 's/\./ /g' | sed 's/\b\w/\u&/g') Blog",
  "description": "Latest insights and updates from $domain",
  "author": "AI Content Team",
  "category": "$(echo $domain | grep -q 'ai\|gpt' && echo 'AI' || (echo $domain | grep -q 'coin\|fintech' && echo 'FINTECH' || echo 'API'))",
  "created": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "postsPerPage": 10,
  "enableComments": false,
  "socialLinks": {
    "twitter": "",
    "linkedin": "",
    "github": ""
  }
}
EOF

  # Create robots.txt
  cat > "sites/$dir_name/robots.txt" << EOF
User-agent: *
Allow: /

Sitemap: https://$domain/sitemap.xml
EOF

  # Create basic sitemap placeholder
  cat > "sites/$dir_name/sitemap.xml" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://$domain/</loc>
    <lastmod>$(date -u +"%Y-%m-%d")</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://$domain/blog/</loc>
    <lastmod>$(date -u +"%Y-%m-%d")</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
EOF

  echo "✅ Blog infrastructure created for $domain"
done

echo ""
echo "🎉 Blog setup completed for ${#DOMAINS[@]} domains:"
for domain in "${DOMAINS[@]}"; do
  echo "  ✅ $domain"
done

echo ""
echo "📋 Summary:"
echo "  • Blog directories created in sites/"
echo "  • Configuration files generated"
echo "  • SEO files (robots.txt, sitemap.xml) created"
echo "  • Ready for content deployment via worker cron"

echo ""
echo "🔧 Next steps:"
echo "  1. Deploy worker with cron triggers: npm run deploy"
echo "  2. Monitor automated content generation in worker logs"
echo "  3. Verify blog endpoints: /api/blog/{domain}/posts"
echo "  4. Set up domain routing for blog paths"
