# 🌐 Domains Monorepo

[![Domains](https://img.shields.io/badge/domains-32-blue)](./INDEX.md)
[![Status](https://img.shields.io/badge/status-active-success)](./docs/API.md)
[![Platform](https://img.shields.io/badge/platform-Cloudflare-orange)](https://cloudflare.com)
[![License](https://img.shields.io/badge/license-private-red)](./LICENSE)

> **Unified platform managing 32+ domains through Cloudflare Workers and Pages**

## 🚀 Quick Start

```bash
# Deploy everything
./deploy-all.sh

# Check domain status
node scripts/verify-domains.js

# View dashboard
open https://domains-monorepo.pages.dev
```

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [📖 INDEX.md](./INDEX.md) | Complete project index & navigation |
| [🔌 API.md](./docs/API.md) | API reference & endpoints |
| [🏗️ ARCHITECTURE.md](./ARCHITECTURE.md) | System design & architecture |
| [🗺️ DEPLOYMENT-MAP.md](./DEPLOYMENT-MAP.md) | Deployment guide & configuration |
| [☁️ CLOUDFLARE-SETUP.md](./CLOUDFLARE-SETUP.md) | Cloudflare configuration |

## ✨ Key Features

- 🌍 **32 domains** managed from single repository
- ⚡ **<100ms latency** globally via Cloudflare edge
- 🔄 **Auto-deployment** on git push
- 📊 **Real-time monitoring** dashboard
- 🛡️ **DNS automation** with API
- 💳 **Payment ready** with SumUp integration
- 🎯 **99.9% uptime** guaranteed

## 🛠️ Setup

### Prerequisites
- Node.js 18+
- Cloudflare account
- Wrangler CLI

### Installation
```bash
# Clone repository
git clone [repo-url]
cd domains-monorepo

# Install Wrangler
npm i -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
./deploy-all.sh
```

## 📊 Domain Portfolio

### Active Domains (24)
```
💰 Financial: damecoins.com, cryptoupdated.com, flywallex.com
🤖 AI/Tech: gptcoins.com, detectar.ai, ministerio.ai, mcp.blue
📚 Education: megacursos.com, visualingo.app
🌎 Spanish: gptenespanol.com, gptvenezuela.com, gptmundo.com
```

### Premium Domains (7)
```
🏥 autorad.automedical.ai - Medical AI Radiology
🚀 pime.ai - Premium AI Platform
👨‍💻 samihalawa.com - Personal Brand
```

[View all domains →](./INDEX.md#domain-portfolio)

## 🏗️ Architecture

```
Cloudflare Edge Network
         │
    ┌────┴────┐
    │ Router  │ → Routes 24 domains
    │ Worker  │ → DNS management
    └────┬────┘ → CORS proxy
         │
    ┌────┴────┐
    │ Pages   │ → Static content
    │ Deploy  │ → Auto-deploy on push
    └─────────┘
```

## 📈 Performance

- **Response time**: <100ms globally
- **Worker execution**: <10ms
- **Cache hit rate**: >90%
- **Monthly requests**: Unlimited
- **Bandwidth**: Unlimited

## 🔧 Development

```bash
# Local development
npm run dev:router

# Add new domain
mkdir sites/newdomain
echo "<html>..." > sites/newdomain/index.html

# Deploy
npm run deploy
```

## 📝 Scripts

| Script | Description |
|--------|-------------|
| `verify-domains.js` | Check all domain status |
| `configure-dns.js` | Setup DNS records |
| `add-custom-domains.js` | Add to Cloudflare Pages |
| `deploy-all.sh` | Deploy everything |

## 🤝 Contributing

This is a private repository. For access or questions, contact the owner.

## 📄 License

**Private & Proprietary**  
© 2024 Sami Halawa. All rights reserved.

---

<div align="center">
  <strong>Built with ❤️ using Cloudflare Workers</strong>
  <br>
  <a href="https://cloudflare.com">Cloudflare</a> •
  <a href="./INDEX.md">Documentation</a> •
  <a href="./docs/API.md">API</a>
</div>