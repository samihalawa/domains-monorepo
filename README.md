# 🌐 Domains Monorepo

> **One repository to manage 86+ domains** with Cloudflare Workers, Pages, and Netlify integration.

## 🎯 What This Does

This monorepo manages your entire domain portfolio through:
- **24 Active Websites** served through Cloudflare Workers + Pages
- **86+ Total Domains** tracked via API integration
- **Serverless Dashboard** for real-time management
- **Auto-deployment** on git push

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR DOMAINS                             │
│  gptcoins.com, damecoins.com, detectar.ai, empleados.ai, etc.   │
└──────────────────────┬──────────────────────────────────────────┘
                       │ DNS
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAINS ROUTER WORKER                         │
│                  (workers/router/index.js)                       │
│         Routes each domain to its /sites/ folder content        │
└──────────────────────┬──────────────────────────────────────────┘
                       │ Fetches
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE PAGES                              │
│               (domains-monorepo.pages.dev)                       │
│            Hosts all /sites/[domain]/ static content            │
└─────────────────────────────────────────────────────────────────┘

                    SEPARATE SYSTEM
┌─────────────────────────────────────────────────────────────────┐
│                  DASHBOARD API WORKER                            │
│              (workers/dashboard-api/index.js)                    │
│        Handles Cloudflare/Netlify/GitHub API calls              │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Repository Structure

```
domains-monorepo/
├── workers/                    # All Cloudflare Workers
│   ├── router/                 # Main domain routing worker
│   │   ├── index.js           # Routes 24 domains to /sites/
│   │   └── wrangler.toml      # Worker configuration
│   └── dashboard-api/          # Dashboard API worker
│       ├── index.js           # API proxy for dashboard
│       └── wrangler.toml      # Worker configuration
│
├── sites/                      # Website content (24 domains)
│   ├── gptcoins/              # gptcoins.com content
│   ├── damecoins/             # damecoins.com content
│   ├── detectar/              # detectar.ai content
│   └── [21 more domains]/     # Other domain content
│
├── dashboard/                  # Management dashboard
│   └── index.html             # Serverless dashboard UI
│
├── deploy-all.sh              # Master deployment script
├── ARCHITECTURE.md            # Detailed architecture docs
└── CLAUDE.md                  # Complete domain reference
```

## 🚀 Quick Start

### Deploy Everything
```bash
./deploy-all.sh
```

### Deploy Individual Components
```bash
# Deploy domain router (serves all websites)
cd workers/router && wrangler deploy

# Deploy dashboard API
cd workers/dashboard-api && wrangler deploy

# Update website content (auto-deploys)
git push origin main
```

## 🌍 How Your Domains Work

### Example: When someone visits `gptcoins.com`

1. **DNS** → Points to Cloudflare
2. **Router Worker** → Receives request
3. **Content Fetch** → Gets `/sites/gptcoins/` from Pages
4. **Response** → Serves website to visitor

### All 24 Active Domains
- gptcoins.com
- damecoins.com  
- detectar.ai
- empleados.ai
- instantvirtualcards.com
- gptapikeys.com
- megacursos.com
- cryptoupdated.com
- gpt-excel.com
- autoword.ai
- autotinder.ai
- dameapi.com
- flywallex.com
- gateway24h.com
- fintechmorning.com
- visualingo.app
- mcp.blue
- sort.services
- agentsai.ltd
- apilord.com
- gptabsolute.com
- gpthard.com
- ministerio.ai
- octbot.ai

## 📊 Dashboard Access

The serverless dashboard provides:
- Real-time domain status
- Thumbnail previews
- Metadata editing
- GitHub auto-commit
- API integration

Access at: `dashboard/index.html`

## 🔧 Environment Variables

Set these for the dashboard API worker:
```bash
cd workers/dashboard-api
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put NETLIFY_ACCESS_TOKEN
wrangler secret put GITHUB_TOKEN
```

## 📝 Adding a New Domain

1. Create content folder:
```bash
mkdir sites/newdomain
echo "<h1>New Domain</h1>" > sites/newdomain/index.html
```

2. Update router worker:
```javascript
// In workers/router/index.js
const domainMap = {
  'newdomain.com': 'newdomain',
  // ... other domains
};
```

3. Deploy:
```bash
./deploy-all.sh
```

## 🛠️ Maintenance

- **Update content**: Edit files in `/sites/[domain]/`, then `git push`
- **Update routing**: Edit `workers/router/index.js`, then `wrangler deploy`
- **Update dashboard**: Edit `dashboard/index.html` or API worker
- **Check status**: Visit any domain or use dashboard

## 📚 Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture details
- [CLAUDE.md](CLAUDE.md) - Complete domain inventory
- [dashboard/README.md](dashboard/README.md) - Dashboard documentation

## 🤝 Support

For issues or questions about this monorepo structure, check the documentation or review the deployment logs.