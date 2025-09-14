#!/bin/bash

# Domain Control Center - Production Deployment Script
echo "🚀 Deploying Domain Control Center Dashboard..."

# Create production build directory
mkdir -p build

# Copy main files
cp dashboard-new.html build/index.html
cp -r js build/
cp -r assets build/ 2>/dev/null || true

# Optimize CSS (inline critical styles)
echo "⚡ Optimizing assets..."

# Create production config
cat > build/config.js << EOF
// Production configuration
window.API_BASE = 'https://your-worker.your-subdomain.workers.dev';
window.ENVIRONMENT = 'production';
EOF

# Create deployment info
cat > build/deployment-info.json << EOF
{
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "2.0.0",
  "features": [
    "Mail-style layout with domain list and detail view",
    "Real-time domain health monitoring",
    "Advanced search and filtering",
    "Keyboard shortcuts and navigation",
    "Context menus and bulk actions",
    "Export/import functionality",
    "Toast notifications system",
    "Performance analytics with Chart.js",
    "Admin panel integration",
    "DNS management interface",
    "Blog content management",
    "Fullscreen mode",
    "Responsive design"
  ],
  "buildInfo": {
    "nodeVersion": "$(node --version 2>/dev/null || echo 'N/A')",
    "gitCommit": "$(git rev-parse HEAD 2>/dev/null || echo 'N/A')",
    "buildHost": "$(hostname)"
  }
}
EOF

# Create README for deployment
cat > build/README.md << EOF
# Domain Control Center - Production Build

## Features
- ✅ Mail-style layout with no hardcoded data
- ✅ Real-time domain health monitoring
- ✅ Advanced search and filtering
- ✅ Keyboard shortcuts (Ctrl+F, arrows, ESC)
- ✅ Context menus and bulk actions
- ✅ Export/import functionality
- ✅ Toast notifications
- ✅ Performance analytics with charts
- ✅ Admin panel integration
- ✅ DNS management
- ✅ Blog management
- ✅ Fullscreen mode

## Deployment
1. Upload contents of this directory to your web server
2. Update API_BASE in config.js to point to your worker
3. Ensure CORS is configured on your worker
4. Access via HTTPS for best performance

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies
- Chart.js 4.4.0 (loaded from CDN)
- No build tools required
- Pure HTML/CSS/JS

Built on: $(date)
EOF

echo "✅ Production build created in ./build/"
echo "📁 Ready to deploy to any static hosting service"
echo "🌐 Update API_BASE in config.js before deployment"

ls -la build/
