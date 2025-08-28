# 🏗️ Domains Monorepo Architecture

## Current Structure

```
domains-monorepo/
├── workers/
│   ├── router/                    # Main domain routing worker
│   │   ├── wrangler.toml          # Config: domains-router
│   │   └── index.js               # Routes all 24 domains
│   └── dashboard-api/             # Dashboard API worker
│       ├── wrangler.toml          # Config: domains-dashboard-api
│       └── index.js               # API proxy for dashboard
│
├── sites/                         # Static content for all domains
│   ├── gptcoins/
│   ├── damecoins/
│   └── [24 domains total]/
│
├── dashboard/                     # Management dashboard
│   └── index.html                 # Serverless dashboard UI
│
└── scripts/                       # Utility scripts
    ├── deploy-all.sh
    └── verify-domains.js
```

## How It Works

### 1. Domain Serving Flow
```mermaid
User → gptcoins.com → DNS → domains-router Worker → Pages /sites/gptcoins/ → User
```

### 2. Dashboard API Flow  
```mermaid
Dashboard UI → dashboard-api Worker → Cloudflare/Netlify/GitHub APIs → Dashboard UI
```

## Deployment Commands

### Deploy Everything
```bash
# Deploy main router worker
wrangler deploy -c workers/router/wrangler.toml

# Deploy dashboard API worker
wrangler deploy -c workers/dashboard-api/wrangler.toml

# Pages deployment happens automatically via git push
```

### Individual Deployments
```bash
# Just the router
cd workers/router && wrangler deploy

# Just the dashboard API
cd workers/dashboard-api && wrangler deploy
```

## Worker Details

### domains-router Worker
- **Purpose**: Routes all 24 domains to their content
- **Deployment**: As Cloudflare Worker with custom routes
- **Domains Handled**: 24 domains (gptcoins.com, damecoins.com, etc.)
- **Source**: Fetches from domains-monorepo.pages.dev/[site]/

### domains-dashboard-api Worker  
- **Purpose**: API proxy for dashboard functionality
- **Deployment**: As standalone Worker
- **URL**: domains-dashboard-api.trigox.workers.dev
- **Features**: Cloudflare, Netlify, GitHub API integration

## Environment Variables

### Dashboard API Worker
```bash
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put NETLIFY_ACCESS_TOKEN
wrangler secret put GITHUB_TOKEN
```

## DNS Configuration

Each domain should have:
```
Type: CNAME
Name: @
Value: domains-router.[your-subdomain].workers.dev
```

Or use Worker Routes in Cloudflare Dashboard.