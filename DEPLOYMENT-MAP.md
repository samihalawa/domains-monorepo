# 🗺️ Domain Deployment Map - Where Everything Lives

## ⚠️ DOMAINS WITH CONFLICTS (Exist in BOTH places)

These domains have BOTH a Netlify deployment AND a monorepo /sites/ folder:

| Domain | Netlify App | Monorepo Folder | **USE THIS →** |
|--------|-------------|-----------------|----------------|
| **agentsai.ltd** | agentsai.netlify.app | /sites/agentsai/ | **Netlify** (dedicated app) |
| **autotinder.ai** | autotinder.netlify.app | /sites/autotinder/ | **Netlify** (dedicated app) |
| **detectar.ai** | detectar-ai-platform.netlify.app | /sites/detectar/ | **Netlify** (dedicated platform) |

## ✅ NETLIFY-ONLY DOMAINS (Should NOT have /sites/ folder)

These premium domains have dedicated Netlify apps and should NOT be in the monorepo:

| Domain | Netlify App | Status | Notes |
|--------|-------------|--------|-------|
| **autorad.automedical.ai** | auto-rad.netlify.app | 🚀 Medical AI | Ultra-high value |
| **pime.ai** | pime-ai.netlify.app | 🚀 AI Platform | Very high value |
| **samihalawa.com** | samihalawa-unified.netlify.app | 👨‍💻 Personal | Your brand |
| **autoclient.ai** | papaya-biscotti-5572d9.netlify.app | 🤖 AI Services | High value |

## ✅ MONOREPO-ONLY DOMAINS (Served by domains-router)

These domains are ONLY in the monorepo and served through Cloudflare Worker:

| Domain | Folder | Status |
|--------|--------|--------|
| gptcoins.com | /sites/gptcoins/ | ✅ Active |
| damecoins.com | /sites/damecoins/ | ✅ Active |
| empleados.ai | /sites/empleados/ | ✅ Active |
| instantvirtualcards.com | /sites/instantvirtualcards/ | ✅ Active |
| gptapikeys.com | /sites/gptapikeys/ | ✅ Active |
| megacursos.com | /sites/megacursos/ | ✅ Active |
| cryptoupdated.com | /sites/cryptoupdated/ | ✅ Active |
| gpt-excel.com | /sites/gpt-excel/ | ✅ Active |
| autoword.ai | /sites/autoword/ | ✅ Active |
| dameapi.com | /sites/dameapi/ | ✅ Active |
| flywallex.com | /sites/flywallex/ | ✅ Active |
| gateway24h.com | /sites/gateway24h/ | ✅ Active |
| fintechmorning.com | /sites/fintechmorning/ | ✅ Active |
| visualingo.app | /sites/visualingo/ | ✅ Active |
| mcp.blue | /sites/mcp/ | ✅ Active |
| sort.services | /sites/sort/ | ✅ Active |
| apilord.com | /sites/apilord/ | ✅ Active |
| gptabsolute.com | /sites/gptabsolute/ | ✅ Active |
| gpthard.com | /sites/gpthard/ | ✅ Active |
| ministerio.ai | /sites/ministerio/ | ✅ Active |
| octbot.ai | /sites/octbot/ | ✅ Active |

## 🔧 ACTION ITEMS

### 1. Remove Conflicting Folders
These /sites/ folders should be REMOVED since they have Netlify apps:
```bash
rm -rf sites/agentsai
rm -rf sites/autotinder  
rm -rf sites/detectar
```

### 2. Update Router Worker
Remove these domains from `workers/router/index.js` domainMap since they're on Netlify:
- agentsai.ltd
- autotinder.ai
- detectar.ai

### 3. DNS Configuration
- **Netlify domains** → Point to Netlify (CNAME to [app-name].netlify.app)
- **Monorepo domains** → Point to domains-router Worker

## 📊 SUMMARY

- **7 domains** on Netlify (premium/dedicated apps)
- **21 domains** in monorepo (served by Worker)
- **3 conflicts** to resolve (remove from monorepo)
- **86 total domains** owned (most not deployed yet)