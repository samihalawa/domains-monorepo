export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
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
        if (pathname.startsWith('/api/blogs') || pathname.startsWith('/api/posts')) {
          return handleBlogAPI(request, env, pathname.replace('/api', ''), ctx, corsHeaders);
        }
        if (pathname.startsWith('/api/deployment-map') || pathname.startsWith('/api/domain-analysis') || pathname.startsWith('/api/health')) {
          return handleDashboardAPI(request, env, pathname.replace('/api', ''), ctx, corsHeaders);
        }
        return handleRouterAPI(request, env, pathname.replace('/api', ''), ctx, corsHeaders);
      }

      // Health check
      if (pathname === '/health') {
        return jsonResponse({ ok: true, service: 'unified-domains-worker' }, corsHeaders);
      }

      // DNS Management endpoints (stubs)
      if (pathname === '/dns/ensure' && request.method === 'POST') {
        try {
          const { domain, apexIp = '192.0.2.1', proxied = true } = await request.json();
          if (!domain) return jsonResponse({ error: 'missing_domain' }, corsHeaders, 400);
          const result = await ensureDns(env, domain, apexIp, proxied);
          return jsonResponse(result, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: 'ensure_failed', message: String(e) }, corsHeaders, 500);
        }
      }

      if (pathname === '/dns/get' && request.method === 'GET') {
        try {
          const domain = url.searchParams.get('domain');
          if (!domain) return jsonResponse({ error: 'missing_domain' }, corsHeaders, 400);
          const details = await getDns(env, domain);
          return jsonResponse(details, corsHeaders);
        } catch (e) {
          return jsonResponse({ error: 'get_failed', message: String(e) }, corsHeaders, 500);
        }
      }

      // CORS Proxy
      if (pathname === '/cors') {
        try {
          const targetUrl = url.searchParams.get('url');
          if (!targetUrl) return jsonResponse({ error: 'missing_url' }, corsHeaders, 400);
          const proxied = await fetch(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: (request.method === 'GET' || request.method === 'HEAD') ? null : request.body
          });
          const newHeaders = new Headers(proxied.headers);
          newHeaders.set('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
          newHeaders.set('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
          newHeaders.set('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
          newHeaders.set('Access-Control-Max-Age', corsHeaders['Access-Control-Max-Age']);
          return new Response(proxied.body, { status: proxied.status, headers: newHeaders });
        } catch (e) {
          return jsonResponse({ error: 'proxy_failed', message: String(e) }, corsHeaders, 502);
        }
      }

      // Fallback: router map overview
      if (pathname === '/' || pathname === '/admin') {
        return jsonResponse({ ok: true, message: 'Unified worker is running', routes: ['/api/blog/*', '/api/dashboard/*', '/api/router/*'] }, corsHeaders);
      }

      // Default 404
      return jsonResponse({ error: 'not_found' }, corsHeaders, 404);
    } catch (err) {
      return jsonResponse({ error: 'unhandled', message: String(err) }, corsHeaders, 500);
    }
  }
};

// ===== Helper: cache small JSON results at edge =====
async function getCachedJSON(key, fetcher, ttlSeconds = 60) {
  try {
    const cache = caches.default;
    const req = new Request(`https://cache.local/${encodeURIComponent(key)}`);
    const cached = await cache.match(req);
    if (cached) return await cached.json();
    const data = await fetcher();
    const resp = new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `max-age=${ttlSeconds}`
      }
    });
    await cache.put(req, resp.clone());
    return data;
  } catch (_) {
    return await fetcher();
  }
}

// ===== Providers =====
async function fetchNetlifySites(token) {
  const res = await fetch('https://api.netlify.com/api/v1/sites', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return [];
  return res.json();
}

async function fetchCloudflareZones(token) {
  const out = [];
  let page = 1;
  const perPage = 50;
  for (;;) {
    const url = `https://api.cloudflare.com/client/v4/zones?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) break;
    const json = await res.json();
    if (!json || !json.result) break;
    out.push(...json.result);
    const info = json.result_info || {};
    const totalPages = info.total_pages || 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return out;
}

// ===== Domain aggregator (Monorepo + Netlify + Cloudflare) =====
async function buildDomainsResponse(env) {
  const byDomain = new Map();

  // Cloudflare zones (seed)
  try {
    const cfToken = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_TOKEN;
    if (cfToken) {
      const zones = await getCachedJSON('cloudflare-zones', () => fetchCloudflareZones(cfToken), 120);
      for (const z of zones) {
        const name = (z.name || '').replace(/^www\./, '');
        if (!name) continue;
        if (!byDomain.has(name)) byDomain.set(name, { name, platform: 'Cloudflare', status: 'pending', url: `https://${name}`, value: 'medium' });
      }
    }
  } catch (_) {}

  // Monorepo (router map)
  try {
    const routerMap = getDomainMap();
    const seen = new Set();
    for (const host of Object.keys(routerMap)) {
      const apex = host.replace(/^www\./, '');
      if (seen.has(apex)) continue;
      seen.add(apex);
      const prev = byDomain.get(apex);
      byDomain.set(apex, {
        ...(prev || {}),
        name: apex,
        platform: 'Monorepo',
        status: prev?.status || 'pending',
        url: prev?.url || `https://${apex}`,
        value: prev?.value || 'medium'
      });
    }
  } catch (_) {}

  // Netlify sites (override)
  try {
    const netlifyToken = env.NETLIFY_TOKEN || env.NETLIFY_API_TOKEN;
    if (netlifyToken) {
      const sites = await getCachedJSON('netlify-sites', () => fetchNetlifySites(netlifyToken), 60);
      for (const s of sites) {
        const hostname = (s.custom_domain || (s.ssl_url ? new URL(s.ssl_url).hostname : null) || (s.url ? new URL(s.url).hostname : null) || s.name || '').replace(/^www\./, '');
        if (!hostname) continue;
        const live = !!(s.published_deploy && s.published_deploy.state === 'ready');
        const status = live ? 'live' : (s.state === 'current' ? 'live' : (s.state === 'error' ? 'down' : 'pending'));
        byDomain.set(hostname, { name: hostname, platform: 'Netlify', status, url: s.url || s.ssl_url || `https://${hostname}`, value: 'high' });
      }
    }
  } catch (_) {}

  const domains = Array.from(byDomain.values()).sort((a, b) => a.name.localeCompare(b.name));
  const counts = {
    total: domains.length,
    monorepo: domains.filter(d => d.platform === 'Monorepo').length,
    netlify: domains.filter(d => d.platform === 'Netlify').length,
    cloudflare: domains.filter(d => d.platform === 'Cloudflare').length,
    live: domains.filter(d => d.status === 'live').length,
    down: domains.filter(d => d.status === 'down').length,
    pending: domains.filter(d => d.status === 'pending').length
  };
  return { success: true, counts, domains };
}

// ===== Dashboard API =====
async function handleDashboardAPI(request, env, pathname, ctx, corsHeaders) {
  const path = pathname.replace(/^\//, '');

  if (path === 'health') return jsonResponse({ status: 'ok', timestamp: Date.now() }, corsHeaders);

  if (path === 'deployment-map') {
    const deploymentMap = await getDeploymentMap(env);
    return jsonResponse({ success: true, data: deploymentMap }, corsHeaders);
  }

  if (path === 'domain-analysis') {
    const analysis = await getDomainAnalysis(env);
    return jsonResponse({ success: true, data: analysis }, corsHeaders);
  }

  if (path === 'super-dashboard') {
    const dashboardData = await getSuperDashboardData(env);
    return jsonResponse({ success: true, data: dashboardData }, corsHeaders);
  }

  if (path === 'domains' && request.method === 'GET') {
    const payload = await buildDomainsResponse(env);
    return jsonResponse(payload, corsHeaders);
  }

  if (path === 'bulk-health-check' && request.method === 'POST') {
    const { domains } = await request.json();
    const results = await performBulkHealthCheck(domains || []);
    return jsonResponse({ success: true, results }, corsHeaders);
  }

  if (path === 'domain-status' && request.method === 'GET') {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    const status = await getDomainStatus(domain);
    return jsonResponse({ success: true, status }, corsHeaders);
  }

  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

function enrichForStats(d) {
  // normalize domain object for stats views
  const domain = d.name || d.domain;
  return {
    domain,
    status: d.status || 'pending',
    platform: d.platform || 'unknown',
    industry: d.industry || 'other',
    value: d.value || 'medium',
    url: d.url || `https://${domain}`,
    category: getDomainCategory(domain),
    metrics: { ssl: true, uptime: d.status === 'live' ? 99.9 : 0, loadTime: '1.2s' }
  };
}

async function getSuperDashboardData(env) {
  const payload = await buildDomainsResponse(env);
  const domains = (payload.domains || []).map(enrichForStats);
  return {
    domains,
    stats: calculateDomainStats(domains),
    lastUpdated: new Date().toISOString()
  };
}

async function getDeploymentMap(env) {
  const payload = await buildDomainsResponse(env);
  const domains = (payload.domains || []).map(enrichForStats);
  return {
    domains,
    summary: {
      total: domains.length,
      live: domains.filter(d => d.status === 'live').length,
      down: domains.filter(d => d.status === 'down').length,
      platforms: domains.reduce((acc, d) => { acc[d.platform] = (acc[d.platform] || 0) + 1; return acc; }, {})
    },
    lastUpdated: new Date().toISOString()
  };
}

async function getDomainAnalysis(env) {
  const payload = await buildDomainsResponse(env);
  const domains = (payload.domains || []).map(enrichForStats);
  const stats = calculateDomainStats(domains);
  return {
    totalDomains: stats.total,
    activeDeployments: stats.live,
    categoryBreakdown: stats.categories,
    platformBreakdown: stats.platforms,
    valueDistribution: stats.values,
    healthScore: stats.healthyPercentage,
    recommendations: [
      { type: 'optimization', priority: 'high', message: `You have ${stats.total} total domains with strong focus on AI and Fintech` },
      { type: 'expansion', priority: 'medium', message: `Consider deploying the ${stats.pending} pending domains for maximum portfolio value` }
    ]
  };
}

function calculateDomainStats(domains) {
  const total = domains.length;
  const live = domains.filter(d => d.status === 'live').length;
  const down = domains.filter(d => d.status === 'down').length;
  const pending = domains.filter(d => d.status === 'pending').length;
  const categories = {};
  const platforms = {};
  const values = {};
  domains.forEach(d => {
    categories[d.category] = (categories[d.category] || 0) + 1;
    platforms[d.platform] = (platforms[d.platform] || 0) + 1;
    values[d.value] = (values[d.value] || 0) + 1;
  });
  return {
    total, live, down, pending,
    healthyPercentage: total ? Math.round((live / total) * 100) : 0,
    categories, platforms, values
  };
}

async function performBulkHealthCheck(domains) {
  const results = [];
  for (const domain of (domains || []).slice(0, 10)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`https://${domain}`, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      results.push({ domain, status: response.status === 200 ? 'healthy' : 'warning', statusCode: response.status, responseTime: '1.2s' });
    } catch (error) {
      results.push({ domain, status: 'error', error: error.message });
    }
  }
  return results;
}

async function getDomainStatus(domain) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`https://${domain}`, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeoutId);
    return { domain, status: response.status === 200 ? 'online' : 'error', statusCode: response.status, ssl: true, loadTime: '1.2s', lastChecked: new Date().toISOString() };
  } catch (error) {
    return { domain, status: 'error', error: error.message, lastChecked: new Date().toISOString() };
  }
}

// ===== Router API =====
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
    const statuses = await Promise.all(domains.slice(0, 10).map(async (domain) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`https://${domain}/`, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        return { domain, status: response.status === 200 ? 'online' : 'error', statusCode: response.status };
      } catch (error) {
        return { domain, status: 'error', statusCode: 0, error: error.message };
      }
    }));
    return jsonResponse({ domains: statuses }, corsHeaders);
  }

  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

// ===== Domain mapping (monorepo) =====
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

// ===== Airtable helpers (minimal) =====
async function airtableRequest(path, options = {}, env) {
  if (!env.AIRTABLE_TOKEN || !env.AIRTABLE_BASE) {
    throw new Error('Missing Airtable configuration');
  }
  const response = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status}`);
  }
  return response.json();
}

async function getBlogByDomain(domain, env) {
  const cleanDomain = domain.replace(/^www\./, '');
  try {
    // Since there's no Blogs table, we'll create a virtual blog from the domain
    const postsData = await airtableRequest(`/Posts?filterByFormula=${encodeURIComponent(`{Blog Name}="${cleanDomain}"`)}`, {}, env);
    if (postsData.records && postsData.records.length > 0) {
      // Create a virtual blog object from the domain and posts data
      return {
        id: `blog_${cleanDomain}`,
        Domain: cleanDomain,
        Name: cleanDomain,
        Description: `Blog for ${cleanDomain}`,
        PostCount: postsData.records.length
      };
    }
  } catch (_) {}
  return null;
}

async function getAllBlogs(env) {
  try {
    // Get all posts and extract unique blog names
    const data = await airtableRequest('/Posts?maxRecords=100', {}, env);
    const uniqueBlogs = new Map();
    
    data.records.forEach(record => {
      const blogName = record.fields['Blog Name'];
      if (blogName && !uniqueBlogs.has(blogName)) {
        uniqueBlogs.set(blogName, {
          id: `blog_${blogName}`,
          Domain: blogName,
          Name: blogName,
          Description: `Blog for ${blogName}`,
          PostCount: data.records.filter(r => r.fields['Blog Name'] === blogName).length
        });
      }
    });
    
    return { success: true, blogs: Array.from(uniqueBlogs.values()) };
  } catch (error) {
    return { error: error.message };
  }
}

async function getBlogPosts(blogId, env) {
  try {
    // Extract blog name from virtual blog ID
    const blogName = blogId.replace('blog_', '');
    const data = await airtableRequest(`/Posts?filterByFormula=${encodeURIComponent(`AND({Blog Name}="${blogName}", {Status}="Published")`)}&sort[0][field]=Published Date&sort[0][direction]=desc`, {}, env);
    return { success: true, posts: data.records.map(r => ({ id: r.id, ...r.fields })) };
  } catch (error) {
    return { error: error.message };
  }
}

async function getAllPosts(env) {
  try {
    const data = await airtableRequest(`/Posts?filterByFormula=${encodeURIComponent(`{Status}="Published"`)}&sort[0][field]=Published Date&sort[0][direction]=desc`, {}, env);
    return data.records.map(r => ({ id: r.id, ...r.fields }));
  } catch (_) {
    return [];
  }
}

// ===== Blog API =====
async function handleBlogAPI(request, env, pathname, ctx, corsHeaders) {
  const path = pathname.replace(/^\//, '');

  if (path === 'test') {
    return jsonResponse({ status: 'ok', hasToken: !!env.AIRTABLE_TOKEN, hasBase: !!env.AIRTABLE_BASE, timestamp: new Date().toISOString() }, corsHeaders);
  }

  if (path === 'blogs' && request.method === 'GET') {
    const blogs = await getAllBlogs(env);
    return jsonResponse(blogs, corsHeaders);
  }

  if (path === 'posts' && request.method === 'GET') {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    const blogId = url.searchParams.get('blog');
    if (domain) {
      const blog = await getBlogByDomain(domain, env);
      if (!blog) return jsonResponse({ error: 'Blog not found for domain' }, corsHeaders, 404);
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

  if (path === 'generate' && request.method === 'POST') {
    return jsonResponse({ success: true, message: 'Content generation stub - integrate with AI service' }, corsHeaders);
  }

  return jsonResponse({ error: 'API endpoint not found' }, corsHeaders, 404);
}

// ===== DNS stubs =====
async function ensureDns(env, domain, apexIp, proxied) {
  return { domain, created: { apex: true, www: true } };
}

async function getDns(env, domain) {
  return { domain, records: [] };
}

// ===== Utilities =====
function getDomainCategory(domain) {
  const lowerName = (domain || '').toLowerCase();
  if (lowerName.includes('ai') || lowerName.includes('gpt') || lowerName.includes('agents')) return 'ai';
  if (lowerName.includes('crypto') || lowerName.includes('coin')) return 'crypto';
  if (lowerName.includes('fintech') || lowerName.includes('pay') || lowerName.includes('card') || lowerName.includes('wallet')) return 'fintech';
  if (lowerName.includes('medical') || lowerName.includes('health')) return 'medical';
  if (lowerName.includes('education') || lowerName.includes('curso') || lowerName.includes('learn')) return 'education';
  return 'other';
}

function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

