/**
 * Unified Domains Worker - Complete System
 * Combines router, blog CMS, and dashboard API functionality
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const pathname = url.pathname;
    
    // CORS headers for API access
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Blog API Routes
      if (pathname.startsWith('/api/blog/')) {
        return handleBlogAPI(request, env, pathname.replace('/api/blog', ''), ctx, corsHeaders);
      }
      
      // Dashboard API Routes
      if (pathname.startsWith('/api/dashboard/')) {
        return handleDashboardAPI(request, env, pathname.replace('/api/dashboard', ''), ctx, corsHeaders);
      }
      
      // Router API Routes
      if (pathname.startsWith('/api/router/')) {
        return handleRouterAPI(request, env, pathname.replace('/api/router', ''), ctx, corsHeaders);
      }
      
      // Legacy API routes for backwards compatibility
      if (pathname.startsWith('/api/')) {
        // Check if it's a blog API
        if (pathname.startsWith('/api/blogs') || pathname.startsWith('/api/posts')) {
          return handleBlogAPI(request, env, pathname.replace('/api', ''), ctx, corsHeaders);
        }
        // Check if it's dashboard API
        if (pathname.startsWith('/api/deployment-map') || pathname.startsWith('/api/domain-analysis') || pathname.startsWith('/api/health')) {
          return handleDashboardAPI(request, env, pathname.replace('/api', ''), ctx, corsHeaders);
        }
        // Router API
        return handleRouterAPI(request, env, pathname.replace('/api', ''), ctx, corsHeaders);
      }

      // Health check
      if (pathname === "/health") {
        return jsonResponse({ ok: true, service: 'unified-domains-worker' }, corsHeaders);
      }

      // DNS Management endpoints
      if (pathname === "/dns/ensure" && request.method === 'POST') {
        try {
          const { domain, apexIp = '192.0.2.1', proxied = true } = await request.json();
          if (!domain) return jsonResponse({ error: 'missing_domain' }, corsHeaders, 400);
          const result = await ensureDns(env, domain, apexIp, proxied);
          return jsonResponse(result, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: 'ensure_failed', message: String(e) }, corsHeaders, 500);
        }
      }

      if (pathname === "/dns/get" && request.method === 'GET') {
        try {
          const domain = url.searchParams.get('domain');
          if (!domain) return jsonResponse({ error: 'missing_domain' }, corsHeaders, 400);
          const details = await getDns(env, domain);
          return jsonResponse(details, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: 'get_failed', message: String(e) }, corsHeaders, 500);
        }
      }

      // CORS Proxy functionality
      if (pathname === "/cors") {
        try {
          const targetUrl = url.searchParams.get('url');
          if (!targetUrl) return jsonResponse({ error: 'missing_url' }, corsHeaders, 400);
          
          const response = await fetch(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
          });
          
          if (request.method === 'OPTIONS') {
            return new Response(null, { status: 200, headers: corsHeaders });
          }
          
          const responseHeaders = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            responseHeaders.set(key, value);
          });
          
          return new Response(response.body, {
            status: response.status,
            headers: responseHeaders
          });
        } catch (e) {
          return jsonResponse({ error: 'cors_failed', message: String(e) }, corsHeaders, 500);
        }
      }

      // Redirect functionality
      if (pathname === "/redirect") {
        try {
          const targetUrl = url.searchParams.get('url');
          const code = parseInt(url.searchParams.get('code') || '302');
          
          if (!targetUrl) return jsonResponse({ error: 'missing_url' }, corsHeaders, 400);
          if (![301, 302, 307, 308].includes(code)) return jsonResponse({ error: 'invalid_code' }, corsHeaders, 400);
          
          return Response.redirect(targetUrl, code);
        } catch (e) {
          return jsonResponse({ error: 'redirect_failed', message: String(e) }, corsHeaders, 500);
        }
      }

      // Blog routing
      if (pathname.startsWith('/blog') || hostname.startsWith('blog.')) {
        return handleBlogRoutes(request, env, pathname, hostname);
      }

      // Blog preview proxy
      if (pathname === '/_preview/blog') {
        const hostParam = url.searchParams.get('host');
        const pathParam = url.searchParams.get('path') || '/blog';
        if (!hostParam) {
          return jsonResponse({ error: 'missing_host_param' }, corsHeaders, 400);
        }
        return handleBlogRoutes(request, env, pathParam, hostParam.replace(/^www\./, ''));
      }

      // RSS/Sitemap for main sites
      if (pathname === '/feed.xml' || pathname === '/rss.xml' || pathname === '/sitemap.xml') {
        return handleBlogRoutes(request, env, pathname, hostname);
      }

      // Admin dashboard
      if (pathname === '/admin' || pathname === '/dashboard') {
        return serveDashboard();
      }

      // Domain routing - Map domains to their Pages deployment paths
      const folder = getDomainFolder(hostname);
      if (folder) {
        const pagesUrl = `https://domains-monorepo.pages.dev/${folder}${pathname}`;
        return fetch(pagesUrl);
      }

      // Default response
      return new Response('Domain not configured', { status: 404 });
      
    } catch (error) {
      return jsonResponse({ error: error.message }, corsHeaders, 500);
    }
  }
};

// Blog API Handler
async function handleBlogAPI(request, env, pathname, ctx, corsHeaders) {
  const path = pathname.replace(/^\//, '');
  
  // Test endpoint
  if (path === 'test') {
    return jsonResponse({
      status: 'ok',
      hasToken: !!env.AIRTABLE_TOKEN,
      hasBase: !!env.AIRTABLE_BASE,
      timestamp: new Date().toISOString()
    }, corsHeaders);
  }
  
  // List all blogs
  if (path === 'blogs' && request.method === 'GET') {
    const blogs = await getAllBlogs(env);
    return jsonResponse(blogs, corsHeaders);
  }
  
  // Get posts (with optional domain filter)
  if (path === 'posts' && request.method === 'GET') {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    const blogId = url.searchParams.get('blog');
    
    if (domain) {
      const blog = await getBlogByDomain(domain, env);
      if (!blog) {
        return jsonResponse({ error: 'Blog not found for domain' }, corsHeaders, 404);
      }
      const posts = await getBlogPosts(blog.id, env);
      return jsonResponse({ success: true, blog, posts: posts.posts }, corsHeaders);
    } else if (blogId) {
      const posts = await getBlogPosts(blogId, env);
      return jsonResponse({ success: true, posts: posts.posts }, corsHeaders);
    } else {
      const allPosts = await getAllPosts(env);
      return jsonResponse({ success: true, posts: allPosts }, corsHeaders);
    }
  }
  
  // Generate content (stub)
  if (path === 'generate' && request.method === 'POST') {
    return jsonResponse({ success: true, message: 'Content generation stub - integrate with AI service' }, corsHeaders);
  }
  
  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

// Dashboard API Handler  
async function handleDashboardAPI(request, env, pathname, ctx, corsHeaders) {
  const path = pathname.replace(/^\//, '');
  
  if (path === 'health') {
    return jsonResponse({ status: 'ok', timestamp: Date.now() }, corsHeaders);
  }
  
  if (path === 'deployment-map') {
    const deploymentMap = await getDeploymentMap(env);
    return jsonResponse({ success: true, data: deploymentMap }, corsHeaders);
  }
  
  if (path === 'domain-analysis') {
    const analysis = await getDomainAnalysis(env);
    return jsonResponse({ success: true, data: analysis }, corsHeaders);
  }
  
  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

// Router API Handler
async function handleRouterAPI(request, env, pathname, ctx, corsHeaders) {
  const path = pathname.replace(/^\//, '');
  
  if (path === 'map') {
    const domainMap = getDomainMap();
    return jsonResponse({ domains: domainMap }, corsHeaders);
  }
  
  if (path === 'health') {
    return jsonResponse({ ok: true, service: 'router' }, corsHeaders);
  }
  
  if (path === 'domains/status') {
    const domains = Object.keys(getDomainMap());
    const statuses = await Promise.all(
      domains.slice(0, 10).map(async (domain) => { // Limit to first 10 for performance
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          const response = await fetch(`https://${domain}/`, { 
            method: 'HEAD',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          return { 
            domain, 
            status: response.status === 200 ? 'online' : 'error',
            statusCode: response.status 
          };
        } catch (error) {
          return { 
            domain, 
            status: 'error', 
            statusCode: 0,
            error: error.message 
          };
        }
      })
    );
    
    return jsonResponse({ domains: statuses }, corsHeaders);
  }
  
  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

// Blog Routes Handler
async function handleBlogRoutes(request, env, pathname, hostname) {
  const originalHostname = request.headers.get('X-Original-Host') || hostname;
  
  // Try to get blog config from hostname
  const blog = await getBlogByDomain(originalHostname, env);
  
  if (!blog) {
    return serveSetupPage(originalHostname);
  }
  
  // Generate page based on path
  let blogPath = pathname.replace(/^\/blog\/?/, '').replace(/\/$/, '');
  if (blogPath.startsWith('/')) blogPath = blogPath.slice(1);
  
  let response;
  
  if (!blogPath || blogPath === '') {
    response = await renderBlogHome(blog, env);
  } else if (blogPath === 'feed.xml' || blogPath === 'rss.xml') {
    response = await generateRSS(blog, env);
  } else if (blogPath === 'sitemap.xml') {
    response = await generateSitemap(blog, env);
  } else if (blogPath.startsWith('tag/')) {
    const tag = decodeURIComponent(blogPath.slice(4));
    response = await renderTagPage(blog, tag, env);
  } else {
    response = await renderBlogPost(blog, blogPath, env);
  }
  
  return response;
}

// Domain mapping
function getDomainMap() {
  return {
    'damecoins.com': 'damecoins',
    'www.damecoins.com': 'damecoins',
    'gptcoins.com': 'gptcoins',
    'www.gptcoins.com': 'gptcoins',
    'empleados.ai': 'empleados',
    'www.empleados.ai': 'empleados',
    'instantvirtualcards.com': 'instantvirtualcards',
    'www.instantvirtualcards.com': 'instantvirtualcards',
    'gptapikeys.com': 'gptapikeys',
    'www.gptapikeys.com': 'gptapikeys',
    'megacursos.com': 'megacursos',
    'www.megacursos.com': 'megacursos',
    'cryptoupdated.com': 'cryptoupdated',
    'www.cryptoupdated.com': 'cryptoupdated',
    'gpt-excel.com': 'gpt-excel',
    'www.gpt-excel.com': 'gpt-excel',
    'autoword.ai': 'autoword',
    'www.autoword.ai': 'autoword',
    'dameapi.com': 'dameapi',
    'www.dameapi.com': 'dameapi',
    'flywallex.com': 'flywallex',
    'www.flywallex.com': 'flywallex',
    'gateway24h.com': 'gateway24h',
    'www.gateway24h.com': 'gateway24h',
    'fintechmorning.com': 'fintechmorning',
    'www.fintechmorning.com': 'fintechmorning',
    'visualingo.app': 'visualingo',
    'www.visualingo.app': 'visualingo',
    'mcp.blue': 'mcp',
    'www.mcp.blue': 'mcp',
    'sort.services': 'sort',
    'www.sort.services': 'sort',
    'octbot.ai': 'octbot',
    'www.octbot.ai': 'octbot',
    'apilord.com': 'apilord',
    'www.apilord.com': 'apilord',
    'gptabsolute.com': 'gptabsolute',
    'www.gptabsolute.com': 'gptabsolute',
    'gpthard.com': 'gpthard',
    'www.gpthard.com': 'gpthard',
    'cryptoadiccion.com': 'cryptoadiccion',
    'www.cryptoadiccion.com': 'cryptoadiccion',
    'gptenespanol.com': 'gptenespanol',
    'www.gptenespanol.com': 'gptenespanol',
    'gptvenezuela.com': 'gptvenezuela',
    'www.gptvenezuela.com': 'gptvenezuela',
    'gptaddicts.com': 'gptaddicts',
    'www.gptaddicts.com': 'gptaddicts',
    'gptautoweb.com': 'gptautoweb',
    'www.gptautoweb.com': 'gptautoweb',
    'gptmundo.com': 'gptmundo',
    'www.gptmundo.com': 'gptmundo',
    'gptplugindatabase.com': 'gptplugindatabase',
    'www.gptplugindatabase.com': 'gptplugindatabase',
    'gptpowerpoint.com': 'gptpowerpoint',
    'www.gptpowerpoint.com': 'gptpowerpoint',
    'gptveteran.com': 'gptveteran',
    'www.gptveteran.com': 'gptveteran',
    'maximagpt.com': 'maximagpt',
    'www.maximagpt.com': 'maximagpt'
  };
}

function getDomainFolder(hostname) {
  return getDomainMap()[hostname];
}

// Airtable functions (simplified)
async function airtableRequest(path, options = {}, env) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE) {
    throw new Error('Missing Airtable configuration');
  }
  
  const response = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE}${path}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }
  
  return response.json();
}

async function getBlogByDomain(domain, env) {
  const cleanDomain = domain.replace(/^www\./, '');
  
  try {
    const data = await airtableRequest(
      `/Blogs?filterByFormula=${encodeURIComponent(`{Domain}="${cleanDomain}"`)}`,
      {}, env
    );
    
    if (data.records && data.records.length > 0) {
      return {
        id: data.records[0].id,
        ...data.records[0].fields,
        name: data.records[0].fields.Name || data.records[0].fields.name,
        domain: data.records[0].fields.Domain || data.records[0].fields.domain,
        description: data.records[0].fields.Description || data.records[0].fields.description
      };
    }
  } catch (error) {
    console.error('Error fetching blog by domain:', error);
  }
  
  return null;
}

async function getAllBlogs(env) {
  try {
    const data = await airtableRequest('/Blogs?maxRecords=100', {}, env);
    const uniqueBlogs = new Map();
    
    // Remove duplicates based on domain
    data.records.forEach(record => {
      const domain = record.fields.Domain || record.fields.domain;
      if (!uniqueBlogs.has(domain)) {
        uniqueBlogs.set(domain, {
          id: record.id,
          ...record.fields
        });
      }
    });
    
    return {
      success: true,
      blogs: Array.from(uniqueBlogs.values())
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getBlogPosts(blogId, env) {
  try {
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(
        `AND(SEARCH("${blogId}", ARRAYJOIN({Blog})), {Status}="Published")`
      )}&sort[0][field]=PublishedAt&sort[0][direction]=desc`,
      {}, env
    );
    
    return {
      success: true,
      posts: data.records.map(r => ({
        id: r.id,
        ...r.fields,
        title: r.fields.Title || r.fields.title,
        slug: r.fields.Slug || r.fields.slug,
        content: r.fields.Content || r.fields.content,
        excerpt: r.fields.Excerpt || r.fields.excerpt
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getAllPosts(env) {
  try {
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(`{Status}="Published"`)}&sort[0][field]=PublishedAt&sort[0][direction]=desc`,
      {}, env
    );
    
    return data.records.map(r => ({
      id: r.id,
      ...r.fields
    }));
  } catch (error) {
    return [];
  }
}

// Blog rendering functions
async function renderBlogHome(blog, env) {
  const posts = await getBlogPosts(blog.id, env);
  const html = getBlogTemplate(blog, posts.posts || [], 'home');
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

async function renderBlogPost(blog, slug, env) {
  try {
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(
        `AND(SEARCH("${blog.id}", ARRAYJOIN({Blog})), {Slug}="${slug}", {Status}="Published")`
      )}&maxRecords=1`,
      {}, env
    );
    
    if (!data.records || data.records.length === 0) {
      return new Response('Post not found', { status: 404 });
    }
    
    const post = {
      id: data.records[0].id,
      ...data.records[0].fields
    };
    
    post.contentHtml = convertMarkdownToHtml(post.Content || post.content || '');
    const html = getBlogTemplate(blog, [post], 'post');
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
    
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

async function renderTagPage(blog, tag, env) {
  try {
    const formula = `AND(SEARCH("${blog.id}", ARRAYJOIN({Blog})), {Status}="Published", FIND(LOWER("${tag}"), LOWER({Tags})))`;
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(formula)}&sort[0][field]=PublishedAt&sort[0][direction]=desc`,
      {}, env
    );
    
    const posts = data.records.map(r => ({ id: r.id, ...r.fields }));
    const html = getBlogTemplate({ ...blog, name: `${blog.name} — #${tag}` }, posts, 'home');
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

async function generateRSS(blog, env) {
  const posts = await getBlogPosts(blog.id, env);
  
  const items = (posts.posts || []).map(post => `
    <item>
      <title><![CDATA[${post.Title || post.title}]]></title>
      <description><![CDATA[${post.Excerpt || post.excerpt || ''}]]></description>
      <link>https://${blog.Domain || blog.domain}/blog/${post.Slug || post.slug}</link>
      <guid isPermaLink="true">https://${blog.Domain || blog.domain}/blog/${post.Slug || post.slug}</guid>
      <pubDate>${new Date(post.PublishedAt || post.publishDate).toUTCString()}</pubDate>
    </item>
  `).join('');
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${blog.Name || blog.name}</title>
    <description>${blog.Description || blog.description}</description>
    <link>https://${blog.Domain || blog.domain}/blog</link>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`;
  
  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

async function generateSitemap(blog, env) {
  const posts = await getBlogPosts(blog.id, env);
  
  const urls = [`
    <url>
      <loc>https://${blog.Domain || blog.domain}/blog</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
  `];
  
  (posts.posts || []).forEach(post => {
    urls.push(`
    <url>
      <loc>https://${blog.Domain || blog.domain}/blog/${post.Slug || post.slug}</loc>
      <lastmod>${new Date(post.PublishedAt || post.publishDate).toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.8</priority>
    </url>
    `);
  });
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('')}
</urlset>`;
  
  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// Simple markdown converter
function convertMarkdownToHtml(markdown) {
  return markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    .replace(/<p>- (.+)<\/p>/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
}

// Blog template
function getBlogTemplate(blog, posts, type) {
  const blogName = blog.Name || blog.name || 'Blog';
  const blogDescription = blog.Description || blog.description || '';
  
  if (type === 'post' && posts.length > 0) {
    const post = posts[0];
    return `<!DOCTYPE html>
<html>
<head>
    <title>${post.Title || post.title} - ${blogName}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
      h1 { color: #333; }
      .meta { color: #666; margin-bottom: 30px; }
    </style>
</head>
<body>
    <h1>${post.Title || post.title}</h1>
    <div class="meta">
      Published: ${new Date(post.PublishedAt || post.publishDate).toLocaleDateString()}
      ${post.Author || post.author ? ` • By ${post.Author || post.author}` : ''}
    </div>
    <div>${post.contentHtml}</div>
    <p><a href="/blog">← Back to ${blogName}</a></p>
</body>
</html>`;
  }
  
  return `<!DOCTYPE html>
<html>
<head>
    <title>${blogName}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
      h1 { color: #333; }
      .post { margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
      .post h2 a { color: #333; text-decoration: none; }
      .post h2 a:hover { color: #0066cc; }
      .meta { color: #666; font-size: 14px; }
      .empty { text-align: center; color: #666; margin: 80px 0; }
    </style>
</head>
<body>
    <h1>${blogName}</h1>
    ${blogDescription ? `<p>${blogDescription}</p>` : ''}
    
    ${posts.length > 0 ? posts.map(post => `
      <article class="post">
        <h2><a href="/blog/${post.Slug || post.slug}">${post.Title || post.title}</a></h2>
        ${post.Excerpt || post.excerpt ? `<p>${post.Excerpt || post.excerpt}</p>` : ''}
        <div class="meta">
          ${new Date(post.PublishedAt || post.publishDate).toLocaleDateString()}
          ${post.Author || post.author ? ` • ${post.Author || post.author}` : ''}
        </div>
      </article>
    `).join('') : '<div class="empty">No posts yet</div>'}
</body>
</html>`;
}

// Dashboard and utility functions
function serveDashboard() {
  return new Response(`<!DOCTYPE html>
<html>
<head>
    <title>Unified Domains Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
      .card { background: #f9f9f9; padding: 20px; border-radius: 8px; }
      .btn { background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <h1>🚀 Unified Domains Dashboard</h1>
    <div class="grid">
        <div class="card">
            <h3>Blog Management</h3>
            <p>Manage your multi-domain blogs</p>
            <a href="/api/blog/blogs" class="btn">View Blogs API</a>
        </div>
        <div class="card">
            <h3>Domain Router</h3>
            <p>Domain routing and management</p>
            <a href="/api/router/map" class="btn">View Domain Map</a>
        </div>
        <div class="card">
            <h3>System Status</h3>
            <p>Health and deployment status</p>
            <a href="/api/dashboard/health" class="btn">View Health</a>
        </div>
    </div>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function serveSetupPage(hostname) {
  return new Response(`<!DOCTYPE html>
<html>
<head>
    <title>Setup Blog - ${hostname}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: system-ui, sans-serif; max-width: 600px; margin: 100px auto; padding: 20px; text-align: center; }
      .setup-box { background: #f0f8ff; padding: 40px; border-radius: 10px; border: 2px solid #0066cc; }
    </style>
</head>
<body>
    <div class="setup-box">
        <h1>🚀 Blog Setup Required</h1>
        <p>No blog configured for <strong>${hostname}</strong></p>
        <p>Please configure this domain in your Airtable Blogs table.</p>
        <p><a href="/admin">Go to Admin Dashboard</a></p>
    </div>
</body>
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Placeholder functions for dashboard API
async function getDeploymentMap(env) {
  return {
    total_domains: Object.keys(getDomainMap()).length,
    cloudflare_zones: [],
    netlify_sites: [],
    monorepo_sites: Object.keys(getDomainMap()),
    generated_at: new Date().toISOString()
  };
}

async function getDomainAnalysis(env) {
  const domains = Object.keys(getDomainMap());
  return {
    total_domains: domains.length,
    active_deployments: domains.length,
    recommendations: [
      {
        type: "optimization",
        priority: "medium", 
        message: `You have ${domains.length} domains configured`
      }
    ]
  };
}

// Placeholder DNS functions
async function ensureDns(env, domain, apexIp, proxied) {
  return { domain, created: { apex: true, www: true } };
}

async function getDns(env, domain) {
  return { domain, records: [] };
}

// JSON response helper
function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}
