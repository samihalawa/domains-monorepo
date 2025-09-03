# 🚀 Autoblog CMS - Complete Setup Guide

## Overview

The **Autoblog CMS** is a complete blogging platform integrated into your domains-monorepo that allows you to:
- 📝 Deploy blogs to any of your 32 domains
- 🤖 Generate content with Airtable AI
- 📊 Manage everything from a dashboard
- ⚡ Cache content globally with Cloudflare
- 📈 Track analytics and performance

## Architecture

```
Airtable (CMS + AI)
    ├── Blogs Table (configuration)
    ├── Posts Table (content + AI fields)
    └── ContentIdeas Table (brainstorming)
              ↓
    Blog Worker (Cloudflare)
    ├── Content rendering
    ├── API endpoints
    └── Cache management
              ↓
    Your Domains
    ├── gptcoins.com/blog
    ├── damecoins.com/blog
    └── [any domain]/blog
```

## Quick Setup (10 minutes)

### 1. Create Airtable Base

1. Go to [Airtable](https://airtable.com) and create a new base called "Autoblog CMS"
2. Create 3 tables with these exact names:
   - **Blogs**
   - **Posts** 
   - **ContentIdeas**

3. Get your credentials:
   - **API Token**: Account → Developer hub → Personal access tokens → Create token
   - **Base ID**: Open your base → Help menu → API documentation → Base ID (starts with `app`)

### 2. Configure Airtable Tables

#### Blogs Table Fields:
| Field Name | Type | Description |
|------------|------|-------------|
| name | Single line text | Blog name |
| domain | Single line text | Your domain |
| subpath | Single line text | URL path (e.g., /blog) |
| theme | Single select | default, minimal, magazine |
| description | Long text | Blog description |
| primaryColor | Single line text | Hex color |
| aiEnabled | Checkbox | Enable AI generation |
| aiTone | Single select | professional, casual, friendly |
| aiAudience | Single line text | Target audience |
| aiKeywords | Long text | SEO keywords |
| autoGenerate | Checkbox | Auto-generate content |
| postsPerWeek | Number | Posts to generate weekly |
| bufferSize | Number | Min posts to maintain |

#### Posts Table Fields:
| Field Name | Type | Description |
|------------|------|-------------|
| title | Single line text | Post title |
| slug | Single line text | URL slug |
| blogId | Single line text | Link to Blogs |
| content | Long text | Markdown content |
| aiContent | Long text | AI-generated content |
| excerpt | Long text | Post summary |
| status | Single select | Draft, Published, Scheduled |
| publishDate | Date & time | Publish date |
| author | Single line text | Author name |
| tags | Long text | Comma-separated tags |
| featuredImage | URL | Featured image URL |
| aiGenerated | Checkbox | AI-generated flag |

#### ContentIdeas Table Fields:
| Field Name | Type | Description |
|------------|------|-------------|
| topic | Single line text | Content idea |
| blogId | Single line text | Link to Blogs |
| keywords | Long text | Related keywords |
| priority | Single select | High, Medium, Low |
| converted | Checkbox | Converted to post |

### 3. Run Setup Script

```bash
# Set environment variables
export AIRTABLE_TOKEN=your_token_here
export AIRTABLE_BASE=appXXXXXXXXX

# Run setup
node scripts/setup-airtable-blog.js
```

### 4. Deploy Blog Worker

```bash
# Navigate to blog worker
cd workers/blog

# Create KV namespaces
wrangler kv:namespace create "BLOG_CACHE"
wrangler kv:namespace create "BLOG_CONFIG"

# Update wrangler.toml with KV IDs from output above

# Set secrets
wrangler secret put AIRTABLE_TOKEN
# Enter your token when prompted

wrangler secret put AIRTABLE_BASE
# Enter your base ID when prompted

# Deploy
wrangler deploy

cd ../..
```

### 5. Update Router Worker

The router worker has already been updated to forward blog requests. Just redeploy:

```bash
cd workers/router
wrangler deploy
cd ../..
```

### 6. Access Blog Manager

Open the blog manager dashboard:
```bash
open dashboard/blog-manager.html
```

Or visit it at any of your domains:
- https://yourdomain.com/dashboard/blog-manager.html

## Usage Guide

### Creating a Blog

1. Open Blog Manager dashboard
2. Click "New Blog"
3. Select domain and configure:
   - **Domain**: Choose from your 32 domains
   - **Subpath**: Where blog lives (e.g., `/blog`, `/news`, `/articles`)
   - **Theme**: Visual style
   - **AI Settings**: Tone, audience, keywords

### Generating Content with AI

#### Method 1: Dashboard
1. Select your blog
2. Go to Posts tab
3. Click "🤖 Generate with AI"
4. Enter title and keywords
5. AI generates complete article

#### Method 2: Airtable Automation
1. Create post in Airtable
2. Check "generateContent" checkbox
3. AI automatically generates content
4. Post appears as Draft

#### Method 3: Bulk Generation
Configure in Airtable:
- Set `autoGenerate = true`
- Set `postsPerWeek = 3`
- Set `bufferSize = 10`
- System maintains buffer automatically

### Publishing Workflow

1. **Draft**: Content created (AI or manual)
2. **Review**: Optional review stage
3. **Scheduled**: Set future publish date
4. **Published**: Live on your blog

### Blog URLs

Your blogs are accessible at:
- **Subdomain**: `blog.yourdomain.com`
- **Subpath**: `yourdomain.com/blog`
- **Custom path**: `yourdomain.com/news` (configurable)

### Features by URL

| URL | Content |
|-----|---------|
| `/blog` | Homepage with posts list |
| `/blog/post-slug` | Individual post |
| `/blog/feed.xml` | RSS feed |
| `/blog/sitemap.xml` | XML sitemap |

## AI Content Generation

### Airtable AI Features

The system leverages Airtable's native AI capabilities:

1. **AI Fields**: Auto-generate content when records created
2. **Prompts**: Customizable per blog's tone and audience
3. **Automation**: Trigger generation on schedule
4. **Quality**: GPT-4 level content generation

### AI Field Configuration

In Airtable, create an AI field for content generation:

```javascript
// AI Field prompt template
Generate a comprehensive blog post about {title}.

Context:
- Tone: {blog.aiTone}
- Audience: {blog.aiAudience}
- Keywords: {blog.aiKeywords}

Requirements:
- 800-1200 words
- SEO-optimized
- Include H2 and H3 sections
- Natural keyword integration
- Engaging introduction and conclusion

Format as Markdown.
```

## API Reference

### Blog API Endpoints

Base URL: `https://yourdomain.com/api`

#### List Blogs
```http
GET /api/blogs
```

#### Get Blog Posts
```http
GET /api/blogs/{blogId}/posts
```

#### Create Blog
```http
POST /api/blogs
Content-Type: application/json

{
  "name": "My Blog",
  "domain": "example.com",
  "subpath": "/blog",
  "aiEnabled": true
}
```

#### Generate AI Content
```http
POST /api/generate
Content-Type: application/json

{
  "blogId": "recXXXXX",
  "title": "Post Title",
  "keywords": "keyword1, keyword2"
}
```

#### Publish Post
```http
POST /api/posts/{postId}/publish
```

#### Clear Cache
```http
POST /api/cache/clear
Content-Type: application/json

{
  "blogId": "recXXXXX"
}
```

## Themes

### Default Theme
- Clean, modern design
- Optimized for readability
- Mobile responsive
- Custom colors

### Minimal Theme
- Ultra-simple layout
- Focus on content
- Fast loading
- Typography-focused

### Magazine Theme
- Grid layout
- Featured images
- Category navigation
- Newsletter signup

### Custom Themes
Add your theme in `workers/blog/index.js`:

```javascript
const templates = {
  yourtheme: {
    home: ({ blog, posts }) => `...`,
    post: ({ blog, post }) => `...`
  }
}
```

## Performance

### Caching Strategy

1. **KV Cache**: 1-hour TTL for rendered pages
2. **Config Cache**: 5-minute TTL for blog settings
3. **CDN Cache**: Cloudflare edge caching
4. **Preview Mode**: Bypass cache with `?preview=true`

### Cache Invalidation

- **Automatic**: On post publish/update
- **Manual**: Via dashboard or API
- **Scheduled**: Daily cache refresh

## Monitoring

### Analytics Dashboard

View in Blog Manager:
- Total posts
- Published vs drafts
- Views and shares
- AI generation stats

### Cloudflare Analytics

Monitor via Cloudflare dashboard:
- Request volume
- Cache hit rate
- Response times
- Geographic distribution

## Troubleshooting

### Common Issues

#### Blog not showing
1. Check domain mapping in router
2. Verify Airtable connection
3. Clear cache
4. Check worker logs

#### AI not generating
1. Verify AI fields in Airtable
2. Check API limits
3. Ensure aiEnabled = true
4. Review generation logs

#### Cache issues
1. Clear via dashboard
2. Use `?preview=true` to bypass
3. Check KV namespace bindings
4. Verify TTL settings

## Advanced Features

### Multi-language Blogs
```javascript
// In blog configuration
{
  "name": "Blog Internacional",
  "language": "es",
  "aiTone": "professional",
  "aiAudience": "Spanish speakers"
}
```

### Custom Domains
```javascript
// Route specific domains to blogs
const blogRoutes = {
  'blog.example.com': 'blog-id-1',
  'news.example.com': 'blog-id-2'
}
```

### Scheduled Publishing
- Set `scheduledDate` in Airtable
- Cron job publishes automatically
- Email notifications available

## Best Practices

1. **Content Strategy**
   - Maintain 10+ posts buffer
   - Schedule 2-3 posts weekly
   - Mix AI and manual content

2. **SEO Optimization**
   - Use descriptive slugs
   - Set meta descriptions
   - Include relevant keywords
   - Generate sitemaps

3. **Performance**
   - Enable caching
   - Optimize images
   - Minify output
   - Monitor metrics

## Cost Estimation

### Cloudflare (Free tier covers)
- 100k requests/day
- 10M KV reads/month
- Unlimited bandwidth

### Airtable
- Free: 1,200 records
- Plus ($10/mo): 5,000 records
- Pro ($20/mo): 50,000 records + AI

### Total Monthly Cost
- **Small blog**: $0 (free tiers)
- **Medium (5 blogs)**: $10/mo
- **Large (20+ blogs)**: $20/mo

## Support & Resources

- **Documentation**: [INDEX.md](./INDEX.md)
- **API Reference**: [API.md](./docs/API.md)
- **Dashboard**: [blog-manager.html](./dashboard/blog-manager.html)
- **Airtable Docs**: https://airtable.com/developers/web/api
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/

---

**Ready to launch your AI-powered blog network!** 🚀