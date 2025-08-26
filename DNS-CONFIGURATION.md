# DNS Configuration Documentation

## Overview
This document details the correct DNS configurations for all domains, separating those hosted on Netlify from those hosted on Cloudflare Pages.

## 🔧 DNS Restoration Completed

### Fixed Domains (Now Pointing to Netlify)
The following domains have been restored to point to their correct Netlify deployments:

| Domain | Netlify App | Status |
|--------|-------------|--------|
| **agentsai.ltd** | agentsai.netlify.app | ✅ Restored |
| **autotinder.ai** | autotinder.netlify.app | ✅ Restored |
| **detectar.ai** | detectar-ai-platform.netlify.app | ✅ Restored |

### DNS Record Configuration
For each Netlify domain, the following records were configured:
- **Root domain (@)**: CNAME pointing to `[app-name].netlify.app`
- **WWW subdomain**: CNAME pointing to `[app-name].netlify.app`
- **Proxying**: Disabled (Netlify handles SSL)

## 📦 Netlify-Hosted Domains

These domains are deployed via Netlify and should have their DNS pointing to Netlify apps:

| Domain | Netlify App | Repository |
|--------|-------------|------------|
| agentsai.ltd | agentsai.netlify.app | GitHub repo managed by Netlify |
| autotinder.ai | autotinder.netlify.app | GitHub repo managed by Netlify |
| detectar.ai | detectar-ai-platform.netlify.app | GitHub repo managed by Netlify |
| autorad.automedical.ai | auto-rad.netlify.app | GitHub repo managed by Netlify |
| pime.ai | pime-ai.netlify.app | GitHub repo managed by Netlify |
| samihalawa.com | samihalawa-unified.netlify.app | GitHub repo managed by Netlify |
| autoclient.ai | papaya-biscotti-5572d9.netlify.app | GitHub repo managed by Netlify |

### Netlify DNS Configuration
```
Type: CNAME
Name: @ (or root)
Value: [app-name].netlify.app
Proxy: Disabled
TTL: Auto

Type: CNAME  
Name: www
Value: [app-name].netlify.app
Proxy: Disabled
TTL: Auto
```

## ☁️ Cloudflare Pages Domains

These domains are part of the domains-monorepo and deployed via Cloudflare Pages:

| Domain | Target | Landing Page |
|--------|--------|--------------|
| damecoins.com | domains-monorepo.pages.dev | Crypto Exchange |
| gptcoins.com | domains-monorepo.pages.dev | AI Crypto |
| empleados.ai | domains-monorepo.pages.dev | HR Solutions |
| instantvirtualcards.com | domains-monorepo.pages.dev | Virtual Cards |
| damepay.com | domains-monorepo.pages.dev | Payment Gateway |
| gptapikeys.com | domains-monorepo.pages.dev | API Management |
| megacursos.com | domains-monorepo.pages.dev | Online Courses |
| cryptoupdated.com | domains-monorepo.pages.dev | Crypto News |
| gpt-excel.com | domains-monorepo.pages.dev | Excel AI |
| autoword.ai | domains-monorepo.pages.dev | AI Writing |
| dameapi.com | domains-monorepo.pages.dev | API Marketplace |
| flywallex.com | domains-monorepo.pages.dev | Digital Wallet |
| gateway24h.com | domains-monorepo.pages.dev | Payment Processing |
| fintechmorning.com | domains-monorepo.pages.dev | Fintech News |
| visualingo.app | domains-monorepo.pages.dev | Language Learning |
| mcp.blue | domains-monorepo.pages.dev | Model Protocol |
| sort.services | domains-monorepo.pages.dev | Sorting Services |

### Cloudflare Pages DNS Configuration
```
Type: CNAME
Name: @ (or root)
Value: domains-monorepo.pages.dev
Proxy: Enabled (Orange Cloud)
TTL: Auto

Type: CNAME
Name: www
Value: domains-monorepo.pages.dev
Proxy: Enabled (Orange Cloud)
TTL: Auto
```

## 🛠️ Management Scripts

### Restore Netlify DNS
```bash
# Restore DNS for domains that should point to Netlify
node restore-netlify-dns.js
```

### Verify All Domains
```bash
# Check current DNS configuration for all domains
node verify-all-domains.js
```

### Deploy to Cloudflare Pages
```bash
# Deploy landing pages to Cloudflare Pages
./deploy.sh
```

## 📊 API Tokens & Access

### Netlify
- **API Token**: `nfp_pDmgg5cmJKQsgnbojU3nGqHgwAtCri6k2699`
- **Dashboard**: https://app.netlify.com
- **CLI**: `netlify status`

### Cloudflare
- **Account ID**: `949026a4f73f2e00e5f3c9b43c79e6e8`
- **Dashboard**: https://dash.cloudflare.com
- **API Docs**: https://api.cloudflare.com

## ⚠️ Important Notes

1. **DNS Propagation**: Changes may take up to 48 hours to propagate globally
2. **SSL Certificates**: 
   - Netlify domains: SSL handled by Netlify (Let's Encrypt)
   - Cloudflare domains: SSL handled by Cloudflare (Universal SSL)
3. **Proxying**:
   - Netlify domains: Cloudflare proxy MUST be disabled
   - Cloudflare Pages: Cloudflare proxy should be enabled

## 🔍 Troubleshooting

### Domain Not Resolving
1. Check DNS propagation: `dig +short domain.com`
2. Verify CNAME records: `nslookup domain.com`
3. Check Cloudflare DNS settings
4. Verify Netlify custom domain settings

### SSL Certificate Issues
- **Netlify**: Check domain settings in Netlify dashboard
- **Cloudflare**: Ensure SSL/TLS mode is set to "Full" or "Full (strict)"

### Wrong Platform Routing
If a domain is routing to the wrong platform:
1. Run `node verify-all-domains.js` to check status
2. Use `node restore-netlify-dns.js` to fix Netlify domains
3. For Cloudflare Pages domains, update DNS in Cloudflare dashboard

## 📝 Change Log

### August 21, 2025
- Restored DNS for agentsai.ltd, autotinder.ai, and detectar.ai to point to Netlify
- Created verification and restoration scripts
- Documented all domain configurations

---

**Last Updated**: August 21, 2025
**Maintained By**: Sami Halawa