/**
 * Optimized Blog Worker
 * Fast, cached, beautiful UI
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const domain = url.hostname;
    const path = url.pathname;
    
    // Cache key for KV store
    const cacheKey = `${domain}${path}`;
    
    // Try cache first (super fast)
    const cached = await env.KV?.get(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        }
      });
    }
    
    // Route handling
    if (path === '/' || path === '') {
      return handleHomepage(domain, env, ctx, cacheKey);
    } else if (path.startsWith('/post/')) {
      const slug = path.replace('/post/', '');
      return handlePost(slug, domain, env, ctx, cacheKey);
    } else if (path === '/api/posts') {
      return handleAPI(domain, env);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function handleHomepage(domain, env, ctx, cacheKey) {
  // Optimized query - only get what we need
  const response = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID || 'appLattdbxMhK4I0y'}/Posts?` +
    `filterByFormula=${encodeURIComponent(`AND({Blog Name}='${domain}',{Status}='Published')`)}` +
    `&fields[]=Title&fields[]=Slug&fields[]=Excerpt&fields[]=Featured Image&fields[]=Category&fields[]=Published Date` +
    `&sort[0][field]=Published Date&sort[0][direction]=desc&maxRecords=10`,
    {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_TOKEN || 'patn9EcWwQcOQtP2A.084bc3ecf3d4493db9e4bc215f31a10de83cb9486a1d277c4fdb8a869b379622'}`
      }
    }
  );
  
  const data = await response.json();
  const posts = data.records || [];
  
  const html = generateHomepageHTML(domain, posts);
  
  // Cache it
  if (env.KV) {
    ctx.waitUntil(env.KV.put(cacheKey, html, { expirationTtl: 3600 }));
  }
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=600'
    }
  });
}

async function handlePost(slug, domain, env, ctx, cacheKey) {
  const response = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID || 'appLattdbxMhK4I0y'}/Posts?` +
    `filterByFormula=${encodeURIComponent(`AND({Slug}='${slug}',{Blog Name}='${domain}',{Status}='Published')`)}` +
    `&maxRecords=1`,
    {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_TOKEN || 'patn9EcWwQcOQtP2A.084bc3ecf3d4493db9e4bc215f31a10de83cb9486a1d277c4fdb8a869b379622'}`
      }
    }
  );
  
  const data = await response.json();
  const post = data.records?.[0];
  
  if (!post) {
    return new Response('Post not found', { status: 404 });
  }
  
  const html = generatePostHTML(domain, post);
  
  // Cache it
  if (env.KV) {
    ctx.waitUntil(env.KV.put(cacheKey, html, { expirationTtl: 3600 }));
  }
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}

async function handleAPI(domain, env) {
  const response = await fetch(
    `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID || 'appLattdbxMhK4I0y'}/Posts?` +
    `filterByFormula=${encodeURIComponent(`AND({Blog Name}='${domain}',{Status}='Published')`)}` +
    `&fields[]=Title&fields[]=Slug&fields[]=Excerpt` +
    `&sort[0][field]=Published Date&sort[0][direction]=desc&maxRecords=20`,
    {
      headers: {
        'Authorization': `Bearer ${env.AIRTABLE_API_TOKEN || 'patn9EcWwQcOQtP2A.084bc3ecf3d4493db9e4bc215f31a10de83cb9486a1d277c4fdb8a869b379622'}`
      }
    }
  );
  
  const data = await response.json();
  
  return new Response(JSON.stringify({
    success: true,
    posts: data.records?.map(r => r.fields) || []
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// Beautiful, modern homepage
function generateHomepageHTML(domain, posts) {
  const getStockImage = (index) => {
    const images = [
      'https://picsum.photos/800/400?random=1',
      'https://picsum.photos/800/400?random=2',
      'https://picsum.photos/800/400?random=3',
      'https://picsum.photos/800/400?random=4',
      'https://picsum.photos/800/400?random=5'
    ];
    return images[index % images.length];
  };
  
  const blogThemes = {
    'gptmundo.com': { name: 'GPT Mundo', color: '#3B82F6', bg: '#1E40AF' },
    'gptcoins.com': { name: 'GPT Coins', color: '#F59E0B', bg: '#D97706' },
    'empleados.ai': { name: 'Empleados AI', color: '#10B981', bg: '#059669' },
    'default': { name: domain, color: '#6366F1', bg: '#4F46E5' }
  };
  
  const theme = blogThemes[domain] || blogThemes.default;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${theme.name} - AI-Powered Insights</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background: linear-gradient(to bottom, #F9FAFB, #F3F4F6);
        }
        
        .header {
            background: linear-gradient(135deg, ${theme.bg}, ${theme.color});
            color: white;
            padding: 2rem 0;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 2rem;
            font-weight: 700;
            text-decoration: none;
            color: white;
        }
        
        .nav {
            display: flex;
            gap: 2rem;
        }
        
        .nav a {
            color: rgba(255,255,255,0.9);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }
        
        .nav a:hover {
            color: white;
        }
        
        .hero {
            background: white;
            padding: 4rem 0;
            text-align: center;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .hero h1 {
            font-size: 3rem;
            color: #111827;
            margin-bottom: 1rem;
        }
        
        .hero p {
            font-size: 1.25rem;
            color: #6B7280;
            max-width: 600px;
            margin: 0 auto;
        }
        
        .posts-grid {
            padding: 3rem 0;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 2rem;
        }
        
        .post-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.07);
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
        }
        
        .post-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.15);
        }
        
        .post-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
        }
        
        .post-content {
            padding: 1.5rem;
        }
        
        .post-category {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: ${theme.color}22;
            color: ${theme.color};
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
        }
        
        .post-title {
            font-size: 1.5rem;
            color: #111827;
            margin-bottom: 0.75rem;
            font-weight: 700;
            line-height: 1.3;
        }
        
        .post-title a {
            color: inherit;
            text-decoration: none;
        }
        
        .post-excerpt {
            color: #6B7280;
            margin-bottom: 1rem;
            line-height: 1.6;
        }
        
        .post-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: #9CA3AF;
            font-size: 0.875rem;
        }
        
        .read-more {
            color: ${theme.color};
            font-weight: 500;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            transition: gap 0.2s;
        }
        
        .read-more:hover {
            gap: 0.5rem;
        }
        
        .footer {
            background: #111827;
            color: white;
            padding: 3rem 0;
            margin-top: 4rem;
        }
        
        .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }
        
        .footer-section h3 {
            margin-bottom: 1rem;
            color: #F3F4F6;
        }
        
        .footer-section a {
            color: #9CA3AF;
            text-decoration: none;
            display: block;
            padding: 0.25rem 0;
            transition: color 0.2s;
        }
        
        .footer-section a:hover {
            color: white;
        }
        
        .footer-bottom {
            border-top: 1px solid #374151;
            padding-top: 2rem;
            text-align: center;
            color: #6B7280;
        }
        
        @media (max-width: 768px) {
            .hero h1 { font-size: 2rem; }
            .posts-grid { grid-template-columns: 1fr; }
            .header-content { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <a href="/" class="logo">${theme.name}</a>
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="#latest">Latest</a>
                    <a href="#categories">Categories</a>
                    <a href="#about">About</a>
                </nav>
            </div>
        </div>
    </header>
    
    <section class="hero">
        <div class="container">
            <h1>Welcome to ${theme.name}</h1>
            <p>Discover the latest insights, tutorials, and updates in AI and technology</p>
        </div>
    </section>
    
    <main class="container">
        <div class="posts-grid">
            ${posts.map((record, index) => {
                const post = record.fields;
                const date = new Date(post['Published Date'] || Date.now()).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric' 
                });
                
                return `
                <article class="post-card" onclick="window.location.href='/post/${post.Slug}'">
                    <img src="${post['Featured Image'] || getStockImage(index)}" alt="${post.Title}" class="post-image" loading="lazy">
                    <div class="post-content">
                        ${post.Category ? `<span class="post-category">${post.Category}</span>` : ''}
                        <h2 class="post-title">
                            <a href="/post/${post.Slug}">${post.Title}</a>
                        </h2>
                        <p class="post-excerpt">${post.Excerpt || 'Click to read more about this exciting topic...'}</p>
                        <div class="post-meta">
                            <span>${date}</span>
                            <a href="/post/${post.Slug}" class="read-more">
                                Read more →
                            </a>
                        </div>
                    </div>
                </article>
                `;
            }).join('')}
        </div>
        
        ${posts.length === 0 ? `
        <div style="text-align: center; padding: 4rem 0; color: #6B7280;">
            <h2 style="margin-bottom: 1rem;">No posts yet</h2>
            <p>Check back soon for exciting content!</p>
        </div>
        ` : ''}
    </main>
    
    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>${theme.name}</h3>
                    <p style="color: #9CA3AF; line-height: 1.6;">
                        Your source for AI-powered insights and cutting-edge technology content.
                    </p>
                </div>
                <div class="footer-section">
                    <h3>Quick Links</h3>
                    <a href="/">Home</a>
                    <a href="#latest">Latest Posts</a>
                    <a href="#categories">Categories</a>
                    <a href="#about">About Us</a>
                </div>
                <div class="footer-section">
                    <h3>Categories</h3>
                    <a href="/category/ai">Artificial Intelligence</a>
                    <a href="/category/tech">Technology</a>
                    <a href="/category/business">Business</a>
                    <a href="/category/crypto">Cryptocurrency</a>
                </div>
                <div class="footer-section">
                    <h3>Follow Us</h3>
                    <a href="#">Twitter</a>
                    <a href="#">LinkedIn</a>
                    <a href="#">GitHub</a>
                    <a href="#">RSS Feed</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2025 ${theme.name}. All rights reserved. Powered by Cloudflare Workers.</p>
            </div>
        </div>
    </footer>
</body>
</html>`;
}

// Beautiful post page
function generatePostHTML(domain, postRecord) {
  const post = postRecord.fields;
  const date = new Date(post['Published Date'] || Date.now()).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });
  
  const blogThemes = {
    'gptmundo.com': { name: 'GPT Mundo', color: '#3B82F6', bg: '#1E40AF' },
    'gptcoins.com': { name: 'GPT Coins', color: '#F59E0B', bg: '#D97706' },
    'empleados.ai': { name: 'Empleados AI', color: '#10B981', bg: '#059669' },
    'default': { name: domain, color: '#6366F1', bg: '#4F46E5' }
  };
  
  const theme = blogThemes[domain] || blogThemes.default;
  
  // Convert markdown-like content to HTML
  const formatContent = (content) => {
    if (!content) return '<p>Content coming soon...</p>';
    
    return content
      .split('\n\n')
      .map(paragraph => {
        if (paragraph.startsWith('#')) {
          const level = paragraph.match(/^#+/)[0].length;
          const text = paragraph.replace(/^#+\s*/, '');
          return `<h${level + 1}>${text}</h${level + 1}>`;
        }
        if (paragraph.startsWith('- ')) {
          const items = paragraph.split('\n').map(item => 
            `<li>${item.replace(/^- /, '')}</li>`
          ).join('');
          return `<ul>${items}</ul>`;
        }
        return `<p>${paragraph}</p>`;
      })
      .join('\n');
  };
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.Title} - ${theme.name}</title>
    <meta name="description" content="${post['SEO Description'] || post.Excerpt || ''}">
    <meta name="keywords" content="${post.Keywords || ''}">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1F2937;
            background: #FFFFFF;
        }
        
        .header {
            background: linear-gradient(135deg, ${theme.bg}, ${theme.color});
            color: white;
            padding: 1.5rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 1.5rem;
            font-weight: 700;
            text-decoration: none;
            color: white;
        }
        
        .nav {
            display: flex;
            gap: 1.5rem;
        }
        
        .nav a {
            color: rgba(255,255,255,0.9);
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }
        
        .nav a:hover {
            color: white;
        }
        
        .article {
            max-width: 720px;
            margin: 0 auto;
            padding: 3rem 1rem;
        }
        
        .article-header {
            margin-bottom: 2rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .article-category {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: ${theme.color}22;
            color: ${theme.color};
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 1rem;
        }
        
        .article-title {
            font-size: 2.5rem;
            font-weight: 800;
            line-height: 1.2;
            color: #111827;
            margin-bottom: 1rem;
        }
        
        .article-meta {
            display: flex;
            gap: 2rem;
            color: #6B7280;
            font-size: 0.95rem;
        }
        
        .article-meta span {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .featured-image {
            width: 100%;
            max-height: 400px;
            object-fit: cover;
            border-radius: 12px;
            margin-bottom: 2rem;
        }
        
        .article-content {
            font-size: 1.125rem;
            line-height: 1.8;
            color: #374151;
        }
        
        .article-content h2 {
            font-size: 1.875rem;
            font-weight: 700;
            margin: 2rem 0 1rem;
            color: #111827;
        }
        
        .article-content h3 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 1.5rem 0 0.75rem;
            color: #1F2937;
        }
        
        .article-content p {
            margin-bottom: 1.5rem;
        }
        
        .article-content ul, .article-content ol {
            margin-bottom: 1.5rem;
            padding-left: 2rem;
        }
        
        .article-content li {
            margin-bottom: 0.5rem;
        }
        
        .article-content a {
            color: ${theme.color};
            text-decoration: underline;
        }
        
        .article-content a:hover {
            text-decoration: none;
        }
        
        .article-content blockquote {
            border-left: 4px solid ${theme.color};
            padding-left: 1.5rem;
            margin: 2rem 0;
            font-style: italic;
            color: #4B5563;
        }
        
        .article-content code {
            background: #F3F4F6;
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 0.9em;
        }
        
        .article-content pre {
            background: #1F2937;
            color: #F9FAFB;
            padding: 1.5rem;
            border-radius: 8px;
            overflow-x: auto;
            margin-bottom: 1.5rem;
        }
        
        .article-footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #E5E7EB;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 2rem;
        }
        
        .tag {
            padding: 0.375rem 0.875rem;
            background: #F3F4F6;
            color: #4B5563;
            border-radius: 20px;
            font-size: 0.875rem;
            text-decoration: none;
            transition: background 0.2s;
        }
        
        .tag:hover {
            background: #E5E7EB;
        }
        
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: ${theme.color};
            text-decoration: none;
            font-weight: 500;
            margin-bottom: 2rem;
            transition: gap 0.2s;
        }
        
        .back-link:hover {
            gap: 0.75rem;
        }
        
        .footer {
            background: #111827;
            color: white;
            padding: 2rem 0;
            margin-top: 4rem;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            .article-title { font-size: 2rem; }
            .article-content { font-size: 1rem; }
            .header-content { flex-direction: column; gap: 1rem; }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <a href="/" class="logo">${theme.name}</a>
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/#latest">Latest</a>
                    <a href="/#categories">Categories</a>
                </nav>
            </div>
        </div>
    </header>
    
    <main class="container">
        <article class="article">
            <a href="/" class="back-link">← Back to all posts</a>
            
            <header class="article-header">
                ${post.Category ? `<span class="article-category">${post.Category}</span>` : ''}
                <h1 class="article-title">${post.Title}</h1>
                <div class="article-meta">
                    <span>📅 ${date}</span>
                    <span>👤 ${post.Author || 'Editorial Team'}</span>
                    <span>⏱️ ${post['Reading Time'] || '5'} min read</span>
                </div>
            </header>
            
            ${post['Featured Image'] ? 
                `<img src="${post['Featured Image']}" alt="${post.Title}" class="featured-image">` : 
                `<img src="https://picsum.photos/800/400?random=${Date.now()}" alt="${post.Title}" class="featured-image">`
            }
            
            <div class="article-content">
                ${formatContent(post.Content)}
            </div>
            
            <footer class="article-footer">
                ${post.Tags ? `
                <div class="tags">
                    ${post.Tags.split(',').map(tag => 
                        `<a href="/tag/${tag.trim().toLowerCase()}" class="tag">#${tag.trim()}</a>`
                    ).join('')}
                </div>
                ` : ''}
                
                <a href="/" class="back-link">← Back to all posts</a>
            </footer>
        </article>
    </main>
    
    <footer class="footer">
        <div class="container">
            <p>© 2025 ${theme.name}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
}
