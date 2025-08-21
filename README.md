# Domains Monorepo - 20 Premium Domain Sites

This monorepo contains landing pages for 20 premium domains, all configured with Google Analytics tracking and Tally contact forms.

## 🌐 Domains Included

### Crypto & Finance (7 domains)
- **damecoins.com** - Cryptocurrency exchange platform
- **gptcoins.com** - AI-powered crypto trading
- **cryptoupdated.com** - Real-time crypto news
- **damepay.com** - Payment gateway solutions
- **instantvirtualcards.com** - Virtual debit cards
- **flywallex.com** - Digital wallet solutions
- **gateway24h.com** - 24/7 payment processing

### AI & Technology (8 domains)
- **detectar.ai** - AI content detection
- **empleados.ai** - AI HR management
- **autoword.ai** - AI content generation
- **autotinder.ai** - AI dating assistant
- **agentsai.ltd** - Autonomous AI agents
- **gptapikeys.com** - API management platform
- **gpt-excel.com** - AI-powered spreadsheets
- **mcp.blue** - Model Context Protocol

### Services & Education (5 domains)
- **megacursos.com** - Online learning platform
- **dameapi.com** - API development platform
- **fintechmorning.com** - Daily finance news
- **visualingo.app** - Visual language learning
- **sort.services** - Data organization platform

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install

# Generate all sites (already done)
node generate-sites.js

# Start local server
npm run dev

# Visit http://localhost:3000
```

### Testing Different Domains Locally
Add to your `/etc/hosts` file:
```
127.0.0.1 damecoins.com
127.0.0.1 gptcoins.com
127.0.0.1 detectar.ai
# ... add all domains
```

## 📊 Features

Each site includes:
- ✅ Responsive design with gradient backgrounds
- ✅ Google Analytics 4 tracking (G-1B4DCV3VGT)
- ✅ Tally contact form (mO2EYY)
- ✅ SEO-optimized meta tags
- ✅ Mobile-friendly layout
- ✅ Fast loading (pure HTML/CSS)

## 🎨 Site Customization

Each domain has custom:
- Brand colors and gradients
- Unique value propositions
- Industry-specific features
- Call-to-action buttons
- Feature descriptions

## 📦 Project Structure

```
domains-monorepo/
├── sites/                  # Individual domain sites
│   ├── damecoins/         # damecoins.com
│   ├── gptcoins/          # gptcoins.com
│   ├── detectar/          # detectar.ai
│   └── ...                # 17 more domains
├── shared/                # Shared templates
│   └── template.html      # Base HTML template
├── server.js              # Express server for local dev
├── generate-sites.js      # Site generator script
├── deploy.sh             # Deployment script
└── package.json          # Dependencies
```

## 🚢 Deployment

### Option 1: Cloudflare Pages (Recommended)
1. Push this repo to GitHub
2. Connect to Cloudflare Pages
3. Deploy each site folder
4. Configure custom domains

### Option 2: Single Server with Nginx
```nginx
server {
    server_name damecoins.com;
    root /var/www/domains-monorepo/sites/damecoins;
    index index.html;
}
# Repeat for each domain
```

### Option 3: Cloudflare Workers
Use the existing worker at `https://zarazscript.trigox.workers.dev/` to serve different content based on domain.

## 🔧 DNS Configuration

For each domain in Cloudflare:
```
Type: A
Name: @
Content: YOUR_SERVER_IP
Proxy: Enabled (orange cloud)
```

Or for Cloudflare Pages:
```
Type: CNAME
Name: @
Content: your-project.pages.dev
Proxy: Enabled
```

## 📈 Analytics

All domains are tracked with:
- **Google Analytics 4**: G-1B4DCV3VGT
- **Custom Dimensions**: Source domain tracking
- **Events**: Button clicks, form submissions
- **Cross-domain tracking**: User journey across all properties

View analytics at: https://analytics.google.com

## 🎯 Domain Status

| Domain | Content | DNS | SSL | Live |
|--------|---------|-----|-----|------|
| damecoins.com | ✅ | ❌ | ❌ | ❌ |
| gptcoins.com | ✅ | ❌ | ❌ | ❌ |
| detectar.ai | ✅ | ❌ | ❌ | ❌ |
| empleados.ai | ✅ | ❌ | ❌ | ❌ |
| instantvirtualcards.com | ✅ | ❌ | ❌ | ❌ |
| damepay.com | ✅ | ❌ | ❌ | ❌ |
| gptapikeys.com | ✅ | ❌ | ❌ | ❌ |
| megacursos.com | ✅ | ❌ | ❌ | ❌ |
| cryptoupdated.com | ✅ | ❌ | ❌ | ❌ |
| gpt-excel.com | ✅ | ❌ | ❌ | ❌ |
| autoword.ai | ✅ | ❌ | ❌ | ❌ |
| autotinder.ai | ✅ | ❌ | ❌ | ❌ |
| dameapi.com | ✅ | ❌ | ❌ | ❌ |
| flywallex.com | ✅ | ❌ | ❌ | ❌ |
| gateway24h.com | ✅ | ❌ | ❌ | ❌ |
| fintechmorning.com | ✅ | ❌ | ❌ | ❌ |
| visualingo.app | ✅ | ❌ | ❌ | ❌ |
| mcp.blue | ✅ | ❌ | ❌ | ❌ |
| sort.services | ✅ | ❌ | ❌ | ❌ |
| agentsai.ltd | ✅ | ❌ | ❌ | ❌ |

## 📝 To-Do

- [ ] Configure DNS for all domains in Cloudflare
- [ ] Deploy to Cloudflare Pages or server
- [ ] Enable SSL certificates
- [ ] Add more content to each site
- [ ] Implement contact form functionality
- [ ] Add blog/content sections
- [ ] SEO optimization
- [ ] Add social media links

## 💰 Domain Value

Estimated portfolio value: **$100,000+**

Premium domains:
- detectar.ai - $10,000+
- empleados.ai - $8,000+
- damecoins.com - $15,000+
- instantvirtualcards.com - $12,000+
- gptcoins.com - $10,000+

## 📞 Contact

- **Owner**: Sami Halawa
- **Portfolio**: samihalawa.com
- **Tracking**: GA4 (G-1B4DCV3VGT)

---

*All domains include automatic tracking via https://zarazscript.trigox.workers.dev/*