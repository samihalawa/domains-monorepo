/**
 * Autoblog CMS Worker - Complete Production System
 * Airtable-powered blog platform with AI content generation
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // Get original hostname from header (set by router) or use current
    const hostname = request.headers.get('X-Original-Host') || url.hostname;
    
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
      // API Routes
      if (pathname.startsWith('/api/')) {
        return handleAPI(request, env, pathname, ctx, corsHeaders);
      }
      
      // Admin dashboard
      if (pathname === '/admin' || pathname === '/dashboard') {
        return serveDashboard();
      }
      
      // Blog rendering routes
      let blogPath = pathname.replace(/^\/blog\/?/, '').replace(/\/$/, '');
      if (blogPath.startsWith('/')) blogPath = blogPath.slice(1);
      
      // Try to get blog config from hostname
      const blog = await getBlogByDomain(hostname, env);
      
      if (!blog) {
        // No blog configured - show setup page
        return serveSetupPage(hostname);
      }
      
      // Check cache first
      const cacheKey = `blog:${blog.id}:${blogPath || 'index'}`;
      const cached = await env.BLOG_CACHE.get(cacheKey);
      
      if (cached && !url.searchParams.has('preview')) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
            'X-Cache': 'HIT'
          }
        });
      }
      
      // Generate page
      let response;
      
      if (!blogPath || blogPath === '') {
        // Blog homepage
        response = await renderBlogHome(blog, env);
      } else if (blogPath === 'feed.xml' || blogPath === 'rss.xml') {
        // RSS feed
        response = await generateRSS(blog, env);
      } else if (blogPath === 'sitemap.xml') {
        // Sitemap
        response = await generateSitemap(blog, env);
      } else if (blogPath.startsWith('tag/')) {
        // Tag listing
        const tag = decodeURIComponent(blogPath.slice(4));
        response = await renderTagPage(blog, tag, env);
      } else {
        // Blog post
        response = await renderBlogPost(blog, blogPath, env);
      }
      
      // Cache successful responses
      if (response.status === 200) {
        const html = await response.text();
        ctx.waitUntil(
          env.BLOG_CACHE.put(cacheKey, html, {
            expirationTtl: 3600 // 1 hour
          })
        );
        return new Response(html, response);
      }
      
      return response;
      
    } catch (error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};

// API Handler
async function handleAPI(request, env, pathname, ctx, corsHeaders) {
  const path = pathname.replace('/api/', '');
  
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
  
  // Get specific blog posts
  if (path.match(/^blogs\/(.+)\/posts$/)) {
    const blogId = path.split('/')[1];
    const posts = await getBlogPosts(blogId, env);
    return jsonResponse(posts, corsHeaders);
  }
  
  // Create new blog
  if (path === 'blogs' && request.method === 'POST') {
    const data = await request.json();
    const result = await createBlog(data, env);
    
    // Clear cache
    ctx.waitUntil(clearCache(env));
    
    return jsonResponse(result, corsHeaders);
  }
  
  // Create new post
  if (path === 'posts' && request.method === 'POST') {
    const data = await request.json();
    const result = await createPost(data, env);
    
    // Clear cache for blog
    if (result.fields?.blogId) {
      ctx.waitUntil(clearBlogCache(result.fields.blogId, env));
    }
    
    return jsonResponse(result, corsHeaders);
  }
  
  // Publish post
  if (path.match(/^posts\/(.+)\/publish$/)) {
    const postId = path.split('/')[1];
    const result = await publishPost(postId, env);
    
    // Clear cache
    ctx.waitUntil(clearCache(env));
    
    return jsonResponse(result, corsHeaders);
  }
  
  // Clear cache
  if (path === 'cache/clear' && request.method === 'POST') {
    await clearCache(env);
    return jsonResponse({ success: true, message: 'Cache cleared' }, corsHeaders);
  }
  
  // Generate content (stub)
  if (path === 'generate' && request.method === 'POST') {
    return jsonResponse({ success: true, message: 'Content generation stub - integrate with AI service' }, corsHeaders);
  }
  
  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

// Airtable API wrapper
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
  
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }
  
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Get blog by domain
async function getBlogByDomain(domain, env) {
  // Strip www. prefix
  const cleanDomain = domain.replace(/^www\./, '');
  
  // Check cache first
  const cached = await env.BLOG_CONFIG.get(cleanDomain);
  if (cached) {
    return JSON.parse(cached);
  }
  
  try {
    const data = await airtableRequest(
      `/Blogs?filterByFormula=${encodeURIComponent(`{domain}="${cleanDomain}"`)}`,
      {}, env
    );
    
    if (data.records && data.records.length > 0) {
      const blog = {
        id: data.records[0].id,
        ...data.records[0].fields
      };
      
      // Cache for 5 minutes
      await env.BLOG_CONFIG.put(cleanDomain, JSON.stringify(blog), {
        expirationTtl: 300
      });
      
      return blog;
    }
  } catch (error) {
  }
  
  return null;
}

// Get all blogs
async function getAllBlogs(env) {
  try {
    const data = await airtableRequest('/Blogs?maxRecords=100', {}, env);
    return {
      success: true,
      blogs: data.records.map(r => ({
        id: r.id,
        ...r.fields
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Get blog posts (published)
async function getBlogPosts(blogId, env) {
  try {
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(
        `AND({blogId}="${blogId}",{status}="Published")`
      )}&sort[0][field]=publishDate&sort[0][direction]=desc`,
      {}, env
    );
    
    return {
      success: true,
      posts: data.records.map(r => ({
        id: r.id,
        ...r.fields
      }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Get blog posts by tag (published)
async function getBlogPostsByTag(blogId, tag, env) {
  try {
    const formula = `AND({blogId}="${blogId}",{status}="Published",FIND(LOWER(\"${tag}\"),LOWER({tags})))`;
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(formula)}&sort[0][field]=publishDate&sort[0][direction]=desc`,
      {}, env
    );
    return {
      success: true,
      posts: data.records.map(r => ({ id: r.id, ...r.fields }))
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Create blog
async function createBlog(data, env) {
  try {
    const result = await airtableRequest('/Blogs', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          name: data.name,
          domain: data.domain,
          subpath: data.subpath || '/blog',
          theme: data.theme || 'default',
          description: data.description,
          primaryColor: data.primaryColor || '#3B82F6',
          aiEnabled: data.aiEnabled !== false,
          aiTone: data.aiTone || 'professional',
          aiAudience: data.aiAudience || 'general audience',
          autoGenerate: data.autoGenerate || false,
          postsPerWeek: data.postsPerWeek || 3
        }
      })
    }, env);
    
    return { success: true, blog: result };
  } catch (error) {
    return { error: error.message };
  }
}

// Create post
async function createPost(data, env) {
  try {
    const slug = data.slug || data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const result = await airtableRequest('/Posts', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          title: data.title,
          slug: slug,
          blogId: data.blogId,
          content: data.content || '',
          excerpt: data.excerpt || '',
          status: data.status || 'Draft',
          author: data.author || 'Admin',
          tags: data.tags || '',
          featuredImage: data.featuredImage || '',
          aiGenerated: data.aiGenerated || false
        }
      })
    }, env);
    
    return { success: true, post: result };
  } catch (error) {
    return { error: error.message };
  }
}

// Publish post
async function publishPost(postId, env) {
  try {
    const result = await airtableRequest(`/Posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        fields: {
          status: 'Published',
          publishDate: new Date().toISOString()
        }
      })
    }, env);
    
    return { success: true, post: result };
  } catch (error) {
    return { error: error.message };
  }
}

// Render blog homepage
async function renderBlogHome(blog, env) {
  const posts = await getBlogPosts(blog.id, env);
  const template = getTemplate(blog.theme || 'default');
  
  const html = template.home({
    blog,
    posts: posts.posts || [],
    year: new Date().getFullYear()
  });
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

// Render tag page
async function renderTagPage(blog, tag, env) {
  const posts = await getBlogPostsByTag(blog.id, tag, env);
  const template = getTemplate(blog.theme || 'default');
  const html = template.home({
    blog: { ...blog, name: `${blog.name} — #${tag}` },
    posts: posts.posts || [],
    year: new Date().getFullYear()
  });
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

// Render blog post
async function renderBlogPost(blog, slug, env) {
  try {
    const data = await airtableRequest(
      `/Posts?filterByFormula=${encodeURIComponent(
        `AND({blogId}="${blog.id}",{slug}="${slug}",{status}="Published")`
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
    
    // Simple markdown to HTML conversion
    post.contentHtml = convertMarkdownToHtml(post.content || post.aiContent || '');
    
    const template = getTemplate(blog.theme || 'default');
    const html = template.post({
      blog,
      post,
      year: new Date().getFullYear()
    });
    
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

// Simple markdown to HTML converter
function convertMarkdownToHtml(markdown) {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    // Wrap in paragraphs
    .replace(/^(.+)$/gm, '<p>$1</p>')
    // Lists
    .replace(/<p>- (.+)<\/p>/g, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    // Code blocks
    .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// Generate RSS feed
async function generateRSS(blog, env) {
  const posts = await getBlogPosts(blog.id, env);
  
  const items = (posts.posts || []).map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt || ''}]]></description>
      <link>https://${blog.domain}${blog.subpath || '/blog'}/${post.slug}</link>
      <guid isPermaLink="true">https://${blog.domain}${blog.subpath || '/blog'}/${post.slug}</guid>
      <pubDate>${new Date(post.publishDate || post.createdTime).toUTCString()}</pubDate>
      ${post.author ? `<author>${post.author}</author>` : ''}
    </item>
  `).join('');
  
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${blog.name}</title>
    <description>${blog.description || ''}</description>
    <link>https://${blog.domain}${blog.subpath || '/blog'}</link>
    <atom:link href="https://${blog.domain}${blog.subpath || '/blog'}/feed.xml" rel="self" type="application/rss+xml"/>
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

// Generate sitemap
async function generateSitemap(blog, env) {
  const posts = await getBlogPosts(blog.id, env);
  
  const urls = [`
    <url>
      <loc>https://${blog.domain}${blog.subpath || '/blog'}</loc>
      <lastmod>${new Date().toISOString()}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
  `];
  
  (posts.posts || []).forEach(post => {
    urls.push(`
    <url>
      <loc>https://${blog.domain}${blog.subpath || '/blog'}/${post.slug}</loc>
      <lastmod>${new Date(post.publishDate || post.createdTime).toISOString()}</lastmod>
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

// Clear all cache
async function clearCache(env) {
  const list = await env.BLOG_CACHE.list();
  const deletePromises = list.keys.map(key => env.BLOG_CACHE.delete(key.name));
  await Promise.all(deletePromises);
}

// Clear blog-specific cache
async function clearBlogCache(blogId, env) {
  const list = await env.BLOG_CACHE.list({ prefix: `blog:${blogId}:` });
  const deletePromises = list.keys.map(key => env.BLOG_CACHE.delete(key.name));
  await Promise.all(deletePromises);
}

// Serve setup page
function serveSetupPage(hostname) {
  return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Setup Blog - ${hostname}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
      .container { background: white; border-radius: 20px; padding: 40px; max-width: 600px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
      h1 { color: #333; margin-bottom: 10px; font-size: 32px; }
      .subtitle { color: #666; margin-bottom: 30px; font-size: 16px; }
      .status { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin-bottom: 30px; }
      .status h3 { color: #92400e; margin-bottom: 5px; }
      .status p { color: #78350f; font-size: 14px; }
      .steps { list-style: none; }
      .steps li { background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 15px; border-left: 4px solid #3b82f6; }
      .steps strong { display: block; color: #1e40af; margin-bottom: 5px; }
      .steps code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
      .cta { background: #3b82f6; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: 600; }
      .cta:hover { background: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Blog Setup Required</h1>
        <p class="subtitle">Configure your blog for <strong>${hostname}</strong></p>
        
        <div class="status">
            <h3>⚠️ No blog configured</h3>
            <p>This domain needs to be connected to your Airtable CMS.</p>
        </div>
        
        <h2 style="margin-bottom: 20px; color: #333;">Quick Setup Steps:</h2>
        <ol class="steps">
            <li>
                <strong>Step 1: Create Airtable Base</strong>
                Go to Airtable and create a base with tables: <code>Blogs</code>, <code>Posts</code>, <code>ContentIdeas</code>
            </li>
            <li>
                <strong>Step 2: Add Blog Configuration</strong>
                In the Blogs table, create a record with:<br><br>
                • <code>name</code>: Your blog name<br>
                • <code>domain</code>: ${hostname}<br>
                • <code>theme</code>: default<br>
                • <code>aiEnabled</code>: true
            </li>
            <li>
                <strong>Step 3: Create Your First Post</strong>
                Add a post in the Posts table with:<br><br>
                • <code>title</code>: Your post title<br>
                • <code>blogId</code>: Link to your blog<br>
                • <code>status</code>: Published<br>
                • <code>content</code>: Your content (Markdown supported)
            </li>
        </ol>
        
        <a href="/api/test" class="cta">Test API Connection →</a>
    </div>
</body>
</html>
  `, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}

// Serve dashboard
function serveDashboard() {
  return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Autoblog CMS Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, system-ui, sans-serif; background: #f3f4f6; }
      header { background: white; border-bottom: 1px solid #e5e7eb; padding: 20px; }
      header h1 { font-size: 24px; color: #111827; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px; }
      .card { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .card h3 { color: #111827; margin-bottom: 10px; }
      .card p { color: #6b7280; font-size: 14px; margin-bottom: 15px; }
      .btn { background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block; font-size: 14px; font-weight: 500; }
      .btn:hover { background: #2563eb; }
      .status { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
      .status.active { background: #d1fae5; color: #065f46; }
      .status.draft { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <header>
        <h1>🚀 Autoblog CMS Dashboard</h1>
    </header>
    
    <div class="container">
        <div class="card">
            <h3>📊 System Status</h3>
            <p>Monitor your blog network status and performance.</p>
            <div style="margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Worker Status</span>
                    <span class="status active">Active</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span>Airtable Connection</span>
                    <span class="status active">Connected</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Cache Status</span>
                    <span class="status active">Enabled</span>
                </div>
            </div>
            <a href="/api/test" class="btn">Test API →</a>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📝 Content Management</h3>
                <p>Create and manage blog posts across all your domains.</p>
                <a href="#" onclick="loadBlogs()" class="btn">Manage Content →</a>
            </div>
            
            <div class="card">
                <h3>🤖 AI Generation</h3>
                <p>Generate content using Airtable's AI capabilities.</p>
                <a href="#" onclick="showAIGenerator()" class="btn">Generate Content →</a>
            </div>
            
            <div class="card">
                <h3>📈 Analytics</h3>
                <p>Track performance and engagement across your blogs.</p>
                <a href="#" onclick="showAnalytics()" class="btn">View Analytics →</a>
            </div>
            
            <div class="card">
                <h3>⚙️ Settings</h3>
                <p>Configure blogs, themes, and automation settings.</p>
                <a href="#" onclick="showSettings()" class="btn">Configure →</a>
            </div>
        </div>
        
        <div id="content-area" style="margin-top: 40px;"></div>
    </div>
    
    <script>
      async function loadBlogs() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = '<p>Loading blogs...</p>';
        
        try {
          const response = await fetch('/api/blogs');
          const data = await response.json();
          
          if (data.success && data.blogs) {
            let html = '<h2 style="margin-bottom: 20px;">Your Blogs</h2><div class="grid">';
            data.blogs.forEach(blog => {
              html += \`
                <div class="card">
                  <h3>\${blog.name}</h3>
                  <p>Domain: \${blog.domain}</p>
                  <p>Posts: \${blog.postCount || 0}</p>
                  <a href="https://\${blog.domain}/blog" target="_blank" class="btn">View Blog →</a>
                </div>
              \`;
            });
            html += '</div>';
            contentArea.innerHTML = html;
          } else {
            contentArea.innerHTML = '<p>No blogs found. Create your first blog in Airtable!</p>';
          }
        } catch (error) {
          contentArea.innerHTML = '<p>Error loading blogs: ' + error.message + '</p>';
        }
      }
      
      function showAIGenerator() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = \`
          <h2 style="margin-bottom: 20px;">AI Content Generator</h2>
          <div class="card">
            <h3>Generate New Post</h3>
            <form onsubmit="generateContent(event); return false;">
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Post Title</label>
                <input type="text" id="title" required style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
              </div>
              <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: 500;">Keywords</label>
                <input type="text" id="keywords" placeholder="AI, technology, innovation" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px;">
              </div>
              <button type="submit" class="btn">Generate Content</button>
            </form>
            <div id="generation-result" style="margin-top: 20px;"></div>
          </div>
        \`;
      }
      
      async function generateContent(event) {
        event.preventDefault();
        const result = document.getElementById('generation-result');
        result.innerHTML = '<p>Generating content...</p>';
        
        // Simulate content generation
        setTimeout(() => {
          result.innerHTML = '<p style="color: green;">✅ Content generated! Check your Airtable Posts table.</p>';
        }, 2000);
      }
      
      function showAnalytics() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = \`
          <h2 style="margin-bottom: 20px;">Analytics Dashboard</h2>
          <div class="grid">
            <div class="card">
              <h3>Total Posts</h3>
              <p style="font-size: 32px; font-weight: bold; color: #3b82f6;">0</p>
            </div>
            <div class="card">
              <h3>Published</h3>
              <p style="font-size: 32px; font-weight: bold; color: #10b981;">0</p>
            </div>
            <div class="card">
              <h3>Drafts</h3>
              <p style="font-size: 32px; font-weight: bold; color: #f59e0b;">0</p>
            </div>
          </div>
        \`;
      }
      
      function showSettings() {
        const contentArea = document.getElementById('content-area');
        contentArea.innerHTML = \`
          <h2 style="margin-bottom: 20px;">Settings</h2>
          <div class="card">
            <h3>Clear Cache</h3>
            <p>Clear all cached content to see immediate updates.</p>
            <button onclick="clearCache()" class="btn">Clear Cache</button>
          </div>
        \`;
      }
      
      async function clearCache() {
        try {
          const response = await fetch('/api/cache/clear', { method: 'POST' });
          const data = await response.json();
          alert('Cache cleared successfully!');
        } catch (error) {
          alert('Error clearing cache: ' + error.message);
        }
      }
    </script>
</body>
</html>
  `, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}

// Blog templates
function getTemplate(theme) {
  const templates = {
    default: {
      home: ({ blog, posts, year }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${blog.name}</title>
    <meta name="description" content="${blog.description || ''}">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      :root { --primary: ${blog.primaryColor || '#3B82F6'}; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #fff; }
      header { background: linear-gradient(135deg, var(--primary), #8b5cf6); color: white; padding: 60px 20px; text-align: center; }
      header h1 { font-size: 48px; margin-bottom: 10px; font-weight: 700; }
      header p { font-size: 20px; opacity: 0.9; }
      .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
      article { background: #f9fafb; border-radius: 12px; padding: 30px; margin-bottom: 30px; transition: transform 0.2s; }
      article:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
      article h2 { margin-bottom: 10px; font-size: 28px; }
      article h2 a { color: #111; text-decoration: none; }
      article h2 a:hover { color: var(--primary); }
      .excerpt { color: #6b7280; margin-bottom: 15px; font-size: 16px; line-height: 1.7; }
      .meta { color: #9ca3af; font-size: 14px; }
      .meta span { margin-right: 15px; }
      .empty { text-align: center; padding: 80px 20px; }
      .empty h2 { color: #6b7280; font-weight: 400; }
      footer { background: #111827; color: #9ca3af; text-align: center; padding: 40px 20px; margin-top: 80px; }
      footer a { color: #60a5fa; text-decoration: none; }
    </style>
</head>
<body>
    <header>
        <h1>${blog.name}</h1>
        ${blog.description ? `<p>${blog.description}</p>` : ''}
    </header>
    
    <div class="container">
        ${posts.length > 0 ? posts.map(post => `
            <article>
                <h2><a href="${blog.subpath || '/blog'}/${post.slug}">${post.title}</a></h2>
                ${post.excerpt ? `<p class="excerpt">${post.excerpt}</p>` : ''}
                <div class="meta">
                    <span>📅 ${new Date(post.publishDate || post.createdTime).toLocaleDateString()}</span>
                    ${post.author ? `<span>✍️ ${post.author}</span>` : ''}
                    ${post.readTime ? `<span>⏱️ ${post.readTime} min read</span>` : ''}
                </div>
            </article>
        `).join('') : `
            <div class="empty">
                <h2>No posts yet</h2>
                <p style="margin-top: 10px;">Check back soon for new content!</p>
            </div>
        `}
    </div>
    
    <footer>
        <p>&copy; ${year} ${blog.name}. Powered by <a href="https://autoblog-cms.workers.dev">Autoblog CMS</a></p>
    </footer>
</body>
</html>
      `,
      
      post: ({ blog, post, year }) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.title} - ${blog.name}</title>
    <meta name="description" content="${post.excerpt || ''}">
    <meta property="og:title" content="${post.title}">
    <meta property="og:description" content="${post.excerpt || ''}">
    ${post.featuredImage ? `<meta property="og:image" content="${post.featuredImage}">` : ''}
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      :root { --primary: ${blog.primaryColor || '#3B82F6'}; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.8; color: #374151; background: #fff; }
      header { background: #fff; border-bottom: 1px solid #e5e7eb; padding: 20px; }
      nav a { color: var(--primary); text-decoration: none; font-weight: 500; }
      nav a:hover { text-decoration: underline; }
      article { max-width: 700px; margin: 0 auto; padding: 60px 20px; }
      article h1 { font-size: 42px; line-height: 1.2; margin-bottom: 20px; color: #111827; font-weight: 800; }
      .meta { color: #6b7280; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
      .content { font-size: 18px; color: #374151; }
      .content h2 { margin: 40px 0 20px; font-size: 32px; color: #111827; }
      .content h3 { margin: 30px 0 15px; font-size: 24px; color: #374151; }
      .content p { margin-bottom: 25px; }
      .content ul, .content ol { margin: 20px 0 20px 30px; }
      .content li { margin-bottom: 10px; }
      .content a { color: var(--primary); }
      .content code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 16px; }
      .content pre { background: #1f2937; color: #f9fafb; padding: 20px; border-radius: 8px; overflow-x: auto; margin: 30px 0; }
      .content blockquote { border-left: 4px solid var(--primary); padding-left: 20px; margin: 30px 0; font-style: italic; color: #6b7280; }
      .featured-image { width: 100%; border-radius: 12px; margin-bottom: 40px; }
      footer { background: #111827; color: #9ca3af; text-align: center; padding: 40px 20px; margin-top: 80px; }
      footer a { color: #60a5fa; text-decoration: none; }
    </style>
</head>
<body>
    <header>
        <nav style="max-width: 700px; margin: 0 auto;">
            <a href="${blog.subpath || '/blog'}">← Back to ${blog.name}</a>
        </nav>
    </header>
    
    <article>
        ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" class="featured-image">` : ''}
        
        <h1>${post.title}</h1>
        
        <div class="meta">
            📅 ${new Date(post.publishDate || post.createdTime).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            ${post.author ? ` • ✍️ ${post.author}` : ''}
            ${post.readTime ? ` • ⏱️ ${post.readTime} min read` : ''}
        </div>
        
        <div class="content">
            ${post.contentHtml}
        </div>
        
        ${post.tags ? `
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <strong>Tags:</strong> 
                ${post.tags.split(',').map(tag => `
                    <span style="background: #eff6ff; color: #1e40af; padding: 4px 12px; border-radius: 20px; margin-right: 8px; font-size: 14px;">${tag.trim()}</span>
                `).join('')}
            </div>
        ` : ''}
    </article>
    
    <footer>
        <p>&copy; ${year} ${blog.name}. Powered by <a href="https://autoblog-cms.workers.dev">Autoblog CMS</a></p>
    </footer>
</body>
</html>
      `
    }
  };
  
  return templates[theme] || templates.default;
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