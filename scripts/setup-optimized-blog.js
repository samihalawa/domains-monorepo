#!/usr/bin/env node

/**
 * OPTIMIZED Airtable Blog CMS Setup
 * Professional multi-blog management with proper relationships and performance
 */

const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.AIRTABLE_BASE;

if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_TOKEN and/or AIRTABLE_BASE_ID.');
  console.error('Set env vars or use Wrangler secrets for production.');
  process.exit(1);
}

// OPTIMIZED SCHEMA with proper relationships and indexing
const OPTIMIZED_SCHEMA = {
  // 1. BLOGS - Master configuration
  Blogs: {
    name: "Blogs",
    primaryField: "Domain", // Index on domain for fast lookups
    fields: [
      { name: "Domain", type: "singleLineText", unique: true },
      { name: "Name", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "Logo", type: "multipleAttachments" }, // Proper media handling
      { name: "Theme Config", type: "multilineText" }, // JSON config
      { name: "Language", type: "singleSelect", options: {
        choices: ["en", "es", "pt"]
      }},
      { name: "Active", type: "checkbox" },
      { name: "Cache TTL", type: "number" }, // Performance optimization
      { name: "CDN Enabled", type: "checkbox" },
      // Linked fields (added after table creation)
      // { name: "Posts", type: "multipleRecordLinks", linkedTable: "Posts" },
      // { name: "Categories", type: "multipleRecordLinks", linkedTable: "Categories" }
    ]
  },

  // 2. POSTS - Optimized content storage
  Posts: {
    name: "Posts",
    primaryField: "Slug", // Index on slug for URL routing
    fields: [
      { name: "Slug", type: "singleLineText", unique: true },
      { name: "Title", type: "singleLineText" },
      { name: "Content HTML", type: "multilineText" }, // Pre-rendered HTML for performance
      { name: "Content Markdown", type: "multilineText" }, // Source markdown
      { name: "Content JSON", type: "multilineText" }, // Structured content blocks
      { name: "Excerpt", type: "multilineText" },
      { name: "Featured Image", type: "multipleAttachments" },
      { name: "Images", type: "multipleAttachments" }, // Gallery
      { name: "Status", type: "singleSelect", options: {
        choices: ["Draft", "Review", "Scheduled", "Published", "Archived"]
      }},
      { name: "Published At", type: "dateTime" },
      { name: "Updated At", type: "dateTime" },
      { name: "Cache Key", type: "singleLineText" }, // For CDN invalidation
      { name: "Word Count", type: "number" },
      { name: "Reading Time", type: "number" },
      { name: "Views", type: "number" },
      { name: "Likes", type: "number" },
      // SEO Optimized Fields
      { name: "Meta Title", type: "singleLineText" },
      { name: "Meta Description", type: "multilineText" },
      { name: "Open Graph Image", type: "multipleAttachments" },
      { name: "Schema JSON", type: "multilineText" }, // Structured data
      { name: "Keywords", type: "multilineText" },
      { name: "Canonical URL", type: "url" },
      // Performance flags
      { name: "Is Featured", type: "checkbox" }, // For homepage optimization
      { name: "Is Trending", type: "checkbox" }, // For sidebar widgets
      { name: "Priority Score", type: "number" } // For sorting
    ]
  },

  // 3. CATEGORIES - Hierarchical taxonomy
  Categories: {
    name: "Categories",
    primaryField: "Full Path", // e.g., "Tech/AI/Machine Learning"
    fields: [
      { name: "Full Path", type: "singleLineText", unique: true },
      { name: "Name", type: "singleLineText" },
      { name: "Slug", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "Parent Path", type: "singleLineText" }, // For hierarchy
      { name: "Level", type: "number" }, // 0=root, 1=child, etc
      { name: "Icon", type: "multipleAttachments" },
      { name: "Color", type: "singleLineText" },
      { name: "Post Count", type: "number" }, // Denormalized for performance
      { name: "Sort Order", type: "number" }
    ]
  },

  // 4. AUTHORS - Enhanced author profiles
  Authors: {
    name: "Authors",
    primaryField: "Username",
    fields: [
      { name: "Username", type: "singleLineText", unique: true },
      { name: "Display Name", type: "singleLineText" },
      { name: "Email", type: "email", unique: true },
      { name: "Bio", type: "multilineText" },
      { name: "Bio HTML", type: "multilineText" }, // Pre-rendered
      { name: "Avatar", type: "multipleAttachments" },
      { name: "Cover Image", type: "multipleAttachments" },
      { name: "Role", type: "singleSelect", options: {
        choices: ["Admin", "Editor", "Author", "Contributor", "Guest"]
      }},
      { name: "Social Links", type: "multilineText" }, // JSON
      { name: "Website", type: "url" },
      { name: "Post Count", type: "number" }, // Denormalized
      { name: "Total Views", type: "number" }, // Analytics
      { name: "Active", type: "checkbox" },
      { name: "Verified", type: "checkbox" }
    ]
  },

  // 5. MEDIA - Centralized asset management
  Media: {
    name: "Media",
    primaryField: "Filename",
    fields: [
      { name: "Filename", type: "singleLineText" },
      { name: "File", type: "multipleAttachments" },
      { name: "Alt Text", type: "singleLineText" },
      { name: "Caption", type: "multilineText" },
      { name: "Credits", type: "singleLineText" },
      { name: "Type", type: "singleSelect", options: {
        choices: ["Image", "Video", "Audio", "Document", "Icon"]
      }},
      { name: "CDN URL", type: "url" }, // Cloudflare Images URL
      { name: "Thumbnail URL", type: "url" },
      { name: "Dimensions", type: "singleLineText" }, // "1920x1080"
      { name: "File Size", type: "number" }, // In bytes
      { name: "Format", type: "singleLineText" }, // "jpg", "webp", etc
      { name: "Optimized", type: "checkbox" }, // Has been processed
      { name: "Usage Count", type: "number" } // How many places it's used
    ]
  },

  // 6. TAGS - Flexible tagging with analytics
  Tags: {
    name: "Tags",
    primaryField: "Tag",
    fields: [
      { name: "Tag", type: "singleLineText", unique: true },
      { name: "Slug", type: "singleLineText", unique: true },
      { name: "Description", type: "multilineText" },
      { name: "Type", type: "singleSelect", options: {
        choices: ["Topic", "Technology", "Industry", "Format", "Level"]
      }},
      { name: "Usage Count", type: "number" },
      { name: "Trending Score", type: "number" }, // For tag clouds
      { name: "Related Tags", type: "multilineText" } // JSON array
    ]
  },

  // 7. COMMENTS - User engagement
  Comments: {
    name: "Comments",
    fields: [
      { name: "Comment ID", type: "autonumber" },
      { name: "Post Slug", type: "singleLineText" }, // Foreign key
      { name: "Author Name", type: "singleLineText" },
      { name: "Author Email", type: "email" },
      { name: "Content", type: "multilineText" },
      { name: "Status", type: "singleSelect", options: {
        choices: ["Pending", "Approved", "Spam", "Deleted"]
      }},
      { name: "Parent ID", type: "singleLineText" }, // For nested comments
      { name: "Created At", type: "dateTime" },
      { name: "IP Address", type: "singleLineText" },
      { name: "User Agent", type: "singleLineText" },
      { name: "Likes", type: "number" },
      { name: "Flagged", type: "checkbox" }
    ]
  },

  // 8. ANALYTICS - Performance tracking
  Analytics: {
    name: "Analytics",
    fields: [
      { name: "Date", type: "date" },
      { name: "Post Slug", type: "singleLineText" },
      { name: "Blog Domain", type: "singleLineText" },
      { name: "Page Views", type: "number" },
      { name: "Unique Visitors", type: "number" },
      { name: "Avg Time on Page", type: "number" }, // Seconds
      { name: "Bounce Rate", type: "percent" },
      { name: "Exit Rate", type: "percent" },
      { name: "Social Shares", type: "number" },
      { name: "Comments", type: "number" },
      { name: "Top Referrer", type: "singleLineText" },
      { name: "Top Country", type: "singleLineText" },
      { name: "Device Breakdown", type: "multilineText" } // JSON
    ]
  },

  // 9. REDIRECTS - SEO preservation
  Redirects: {
    name: "Redirects",
    fields: [
      { name: "From Path", type: "singleLineText", unique: true },
      { name: "To Path", type: "singleLineText" },
      { name: "Type", type: "singleSelect", options: {
        choices: ["301", "302", "307", "308"]
      }},
      { name: "Blog Domain", type: "singleLineText" },
      { name: "Active", type: "checkbox" },
      { name: "Hit Count", type: "number" },
      { name: "Created At", type: "dateTime" }
    ]
  },

  // 10. CACHE - Performance optimization
  Cache: {
    name: "Cache",
    fields: [
      { name: "Cache Key", type: "singleLineText", unique: true },
      { name: "Content Type", type: "singleLineText" }, // "post", "category", "homepage"
      { name: "Content", type: "multilineText" }, // Cached HTML
      { name: "Headers", type: "multilineText" }, // JSON
      { name: "TTL", type: "number" }, // Seconds
      { name: "Created At", type: "dateTime" },
      { name: "Expires At", type: "dateTime" },
      { name: "Hit Count", type: "number" },
      { name: "Size", type: "number" } // Bytes
    ]
  }
};

// Optimized queries for common operations
const OPTIMIZED_QUERIES = {
  // Get posts for a blog with pagination
  getPostsByBlog: (domain, limit = 10, offset = 0) => ({
    filterByFormula: `AND({Blog Domain} = '${domain}', {Status} = 'Published')`,
    sort: [{ field: "Published At", direction: "desc" }],
    fields: ["Slug", "Title", "Excerpt", "Featured Image", "Published At", "Reading Time"],
    maxRecords: limit,
    offset: offset
  }),

  // Get featured posts (cached)
  getFeaturedPosts: (domain) => ({
    filterByFormula: `AND({Blog Domain} = '${domain}', {Is Featured} = TRUE(), {Status} = 'Published')`,
    sort: [{ field: "Priority Score", direction: "desc" }],
    fields: ["Slug", "Title", "Excerpt", "Featured Image"],
    maxRecords: 5
  }),

  // Get trending posts (cached)
  getTrendingPosts: (domain) => ({
    filterByFormula: `AND({Blog Domain} = '${domain}', {Is Trending} = TRUE(), {Status} = 'Published')`,
    sort: [{ field: "Views", direction: "desc" }],
    fields: ["Slug", "Title", "Views"],
    maxRecords: 10
  }),

  // Get single post with all fields
  getPostBySlug: (slug) => ({
    filterByFormula: `{Slug} = '${slug}'`,
    maxRecords: 1
  }),

  // Get categories with post count
  getCategoriesWithCount: (domain) => ({
    filterByFormula: `{Blog Domain} = '${domain}'`,
    sort: [{ field: "Post Count", direction: "desc" }],
    fields: ["Name", "Slug", "Post Count", "Color", "Icon"]
  }),

  // Get author with stats
  getAuthorWithStats: (username) => ({
    filterByFormula: `{Username} = '${username}'`,
    fields: ["Display Name", "Bio HTML", "Avatar", "Post Count", "Total Views", "Social Links"]
  })
};

// Performance optimization tips
const OPTIMIZATION_TIPS = `
🚀 OPTIMIZATION STRATEGIES:

1. CACHING LAYERS:
   - Cloudflare Workers KV: Store rendered HTML (1-hour TTL)
   - Browser Cache: Static assets (1-year TTL)
   - API Cache: Airtable responses (5-minute TTL)

2. DATABASE OPTIMIZATION:
   - Use filterByFormula with indexed fields (Slug, Domain)
   - Limit fields in list queries (don't fetch content)
   - Batch API calls when possible
   - Use webhooks for cache invalidation

3. CONTENT DELIVERY:
   - Pre-render HTML in Airtable (Content HTML field)
   - Use Cloudflare Images for automatic optimization
   - Lazy load images and comments
   - Implement infinite scroll for lists

4. QUERY OPTIMIZATION:
   - Cache common queries (featured, trending)
   - Use projections to limit field retrieval
   - Implement pagination properly
   - Denormalize frequently accessed data

5. EDGE COMPUTING:
   - Process at Cloudflare edge
   - Use Workers KV for session storage
   - Implement rate limiting at edge
   - Cache API responses in Workers

Example Optimized Query:
\`\`\`javascript
// Fast homepage query - only essential fields
const homepagePosts = await fetch(
  \`https://api.airtable.com/v0/\${BASE_ID}/Posts?filterByFormula=AND({Status}='Published',{Blog Domain}='gptcoins.com')&fields[]=Title&fields[]=Slug&fields[]=Excerpt&fields[]=Featured Image&sort[0][field]=Published At&sort[0][direction]=desc&maxRecords=10\`
);
\`\`\`

6. WORKER ARCHITECTURE:
\`\`\`javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cacheKey = url.toString();
    
    // Check cache first
    const cache = caches.default;
    let response = await cache.match(cacheKey);
    
    if (!response) {
      // Check KV store
      const cached = await env.BLOG_CACHE.get(cacheKey);
      if (cached) {
        response = new Response(cached, {
          headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' }
        });
      } else {
        // Fetch from Airtable
        response = await fetchFromAirtable(url);
        // Store in KV
        ctx.waitUntil(env.BLOG_CACHE.put(cacheKey, response.clone().text(), { expirationTtl: 3600 }));
      }
      // Cache in CDN
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }
    
    return response;
  }
}
\`\`\`
`;

async function main() {
  console.log('🚀 OPTIMIZED Blog CMS Setup');
  console.log('================================\n');
  
  console.log(OPTIMIZATION_TIPS);
  
  console.log('\n📊 Optimized Schema Features:');
  console.log('- Indexed primary fields for fast lookups');
  console.log('- Pre-rendered HTML for instant delivery');
  console.log('- Denormalized counts for performance');
  console.log('- Cache management built-in');
  console.log('- CDN integration ready');
  console.log('- Analytics tracking');
  console.log('- SEO optimization fields');
  console.log('- Media management with CDN URLs');
  
  console.log('\n⚡ Performance Targets:');
  console.log('- Homepage: <100ms (cached)');
  console.log('- Blog post: <200ms (cached)');
  console.log('- API calls: <50ms (Workers KV)');
  console.log('- Global latency: <50ms (Cloudflare edge)');
  
  console.log('\n🔧 Implementation Steps:');
  console.log('1. Create tables with optimized schema');
  console.log('2. Set up Workers KV namespace: BLOG_CACHE');
  console.log('3. Configure Cloudflare Images for media');
  console.log('4. Implement caching strategy in Workers');
  console.log('5. Set up Airtable webhooks for cache invalidation');
  console.log('6. Use batch operations for initial data import');
  console.log('7. Monitor with Cloudflare Analytics');
}

if (require.main === module) {
  main();
}
