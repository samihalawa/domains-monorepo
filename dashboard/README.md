# 🌐 Serverless Domain Management Dashboard

A fully serverless dashboard for managing 80+ domains across Cloudflare and Netlify with real-time API integration and GitHub auto-commit functionality.

## Features

- **Real-time Data**: Live data from Cloudflare and Netlify APIs
- **Thumbnail Previews**: Visual previews of all live domains
- **Metadata Management**: Edit and save domain metadata
- **Auto-commit**: Changes automatically committed to GitHub
- **Search & Filter**: Find domains instantly
- **Fully Serverless**: No backend required, just static files + worker

## Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│                     │    │                     │    │                     │
│   Dashboard HTML    │◄───┤   API Worker       │◄───┤   External APIs     │
│   (Static)          │    │   (Cloudflare)      │    │   (CF, Netlify, GH) │
│                     │    │                     │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Setup Instructions

### 1. Deploy the API Worker

```bash
cd dashboard/

# Install wrangler if not installed
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Set environment variables
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put NETLIFY_ACCESS_TOKEN  
wrangler secret put GITHUB_TOKEN

# Deploy the worker
wrangler publish
```

### 2. Update Configuration

Edit `index.html` and update the `CONFIG.apiWorker` URL:

```javascript
const CONFIG = {
    apiWorker: 'https://your-worker-name.your-subdomain.workers.dev',
    // ...
};
```

### 3. Deploy Dashboard

The dashboard can be deployed alongside your existing domains monorepo:

**Option A: Subdirectory in existing Cloudflare Pages**
- Access at: `https://domains-monorepo.pages.dev/dashboard/`

**Option B: Separate deployment**
- Deploy as separate Cloudflare Pages project
- Point to `/dashboard` folder

## API Endpoints

### Cloudflare
- `GET /api/cloudflare/zones` - Get all zones
- `GET /api/cloudflare/zones/{id}/details` - Get zone details

### Netlify  
- `GET /api/netlify/sites` - Get all sites
- `GET /api/netlify/sites/{id}` - Get site details

### GitHub
- `GET /api/github/metadata` - Get metadata from projects-data.json
- `PUT /api/github/metadata` - Update metadata and commit
- `GET /api/github/repo` - Get repository info

## Environment Variables

Set these in your Cloudflare Worker:

```bash
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put NETLIFY_ACCESS_TOKEN
wrangler secret put GITHUB_TOKEN
```

### Getting API Tokens

**Cloudflare API Token:**
1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create token with Zone:Read permissions
3. Copy token value

**Netlify Access Token:**
1. Go to https://app.netlify.com/user/applications#personal-access-tokens
2. Generate new token
3. Copy token value

**GitHub Token:**
1. Go to https://github.com/settings/tokens
2. Generate new token with repo permissions
3. Copy token value

## Usage

1. **View Domains**: See all domains across platforms with live status
2. **Edit Metadata**: Add categories, notes, priorities to domains
3. **Save Changes**: Click "Save & Commit Changes" to persist to GitHub
4. **Search**: Use search box to filter through 80+ domains
5. **Preview**: Click preview button to see domain in iframe

## Features

### Real-time Dashboard
- Live domain status from APIs
- Thumbnail previews of websites
- Search and filter functionality
- Responsive design for mobile/desktop

### Metadata Management
- Add categories (AI/Tech, Crypto, Fintech, etc.)
- Add notes and descriptions
- Set priorities (High, Medium, Low)
- Project type classification

### Auto-commit to GitHub
- Changes saved to `projects-data.json`
- Automatic git commits with descriptive messages
- Maintains version history
- No manual git operations needed

## Troubleshooting

### Worker Deployment Issues
```bash
# Check worker logs
wrangler tail

# Test worker endpoints
curl https://your-worker.workers.dev/api/health
```

### API Issues
- Verify environment variables are set
- Check API token permissions
- Monitor rate limits

### Dashboard Issues  
- Check browser console for errors
- Verify worker URL in config
- Test API endpoints directly

## Development

To modify the dashboard:

1. Edit `index.html` for UI changes
2. Edit `api-worker.js` for API logic
3. Test locally with `wrangler dev`
4. Deploy with `wrangler publish`

## Security

- All API tokens stored as Cloudflare Worker secrets
- No sensitive data in client-side code
- CORS headers configured properly
- Authentication handled server-side