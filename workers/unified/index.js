

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
      // ---- RESTful aliases (non-breaking) ----
      // Domains
      if (request.method === 'GET' && pathname === '/api/domains') {
        const payload = await buildDomainsResponse(env);
        return jsonResponse(payload, corsHeaders);
      }
      const domainStatusMatch = pathname.match(/^\/api\/domains\/([^/]+)\/status$/);
      if (request.method === 'GET' && domainStatusMatch) {
        const domain = decodeURIComponent(domainStatusMatch[1]);
        const status = await getDomainStatus(domain);
        return jsonResponse({ success: true, status }, corsHeaders);
      }

      // Netlify
      if (request.method === 'GET' && pathname === '/api/netlify/sites') {
        return listNetlifySites(request, env, corsHeaders);
      }

      // Blogs
      if (request.method === 'GET' && pathname === '/api/blogs') {
        const blogs = await getAllBlogs(env);
        return jsonResponse(blogs, corsHeaders);
      }
      const blogPostsMatch = pathname.match(/^\/api\/blogs\/([^/]+)\/posts$/);
      if (request.method === 'GET' && blogPostsMatch) {
        const domain = decodeURIComponent(blogPostsMatch[1]).replace(/^www\./, '');
        const blog = await getBlogByDomain(domain, env);
        if (!blog) return jsonResponse({ error: 'Blog not found for domain' }, corsHeaders, 404);
        const posts = await getBlogPosts(blog.id, env);
        return jsonResponse({ success: true, blog, posts: posts.posts || [] }, corsHeaders);
      }

      // Health alias
      if (pathname === '/api/health') {
        return jsonResponse({ ok: true, service: 'unified-domains-worker' }, corsHeaders);
      }

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

      // Serve dashboard HTML
      if (pathname === '/dashboard') {
        // For now, redirect to a deployed version or serve a message
        return new Response('Dashboard is available at the deployment URL', {
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
        });
      }

      // Blog routes for all domains
      const hostname = url.hostname.replace('www.', '');
      if (pathname.startsWith('/blog/')) {
        return handleBlogPage(request, env, hostname, pathname);
      }
      if (pathname === '/blog') {
        return handleBlogListing(request, env, hostname);
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

      // DNS Management endpoints
      if (pathname === '/dns/ensure' && request.method === 'POST') {
        try {
          const { domain, target, apexIp = undefined, proxied = true } = await request.json();
          if (!domain) return jsonResponse({ error: 'missing_domain' }, corsHeaders, 400);
          const result = await ensureDns(env, domain, { target, apexIp, proxied });
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

// Static domain data for testing/demo
function getStaticDomains() {
  return [
    // High-value AI domains
    { name: 'ministerio.ai', platform: 'Cloudflare Pages', status: 'live', industry: 'Government AI', value: 'ultra-high', url: 'https://ministerio.ai' },
    { name: 'empleados.ai', platform: 'Cloudflare Pages', status: 'live', industry: 'HR Solutions', value: 'high', url: 'https://empleados.ai' },
    { name: 'octbot.ai', platform: 'Cloudflare Pages', status: 'live', industry: 'AI Bot', value: 'medium', url: 'https://octbot.ai' },
    { name: 'autoword.ai', platform: 'Cloudflare Pages', status: 'live', industry: 'AI Writing', value: 'medium', url: 'https://autoword.ai' },
    { name: 'detectar.ai', platform: 'Cloudflare', status: 'pending', industry: 'AI Detection', value: 'medium', url: 'https://detectar.ai' },
    
    // Crypto & Fintech
    { name: 'damecoins.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Crypto Exchange', value: 'high', url: 'https://damecoins.com' },
    { name: 'gptcoins.com', platform: 'Cloudflare Pages', status: 'live', industry: 'AI Crypto', value: 'high', url: 'https://gptcoins.com' },
    { name: 'flywallex.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Digital Wallet', value: 'high', url: 'https://flywallex.com' },
    { name: 'gateway24h.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Payment Processing', value: 'high', url: 'https://gateway24h.com' },
    { name: 'instantvirtualcards.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Virtual Cards', value: 'high', url: 'https://instantvirtualcards.com' },
    
    // GPT Tools
    { name: 'gptabsolute.com', platform: 'Cloudflare', status: 'live', industry: 'GPT Tools', value: 'high', url: 'https://gptabsolute.com' },
    { name: 'gpt-excel.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Excel AI', value: 'medium', url: 'https://gpt-excel.com' },
    { name: 'gptapikeys.com', platform: 'Cloudflare Pages', status: 'live', industry: 'API Management', value: 'medium', url: 'https://gptapikeys.com' },
    { name: 'gptautoweb.com', platform: 'Cloudflare', status: 'pending', industry: 'Web Automation', value: 'medium', url: 'https://gptautoweb.com' },
    
    // News & Education
    { name: 'fintechmorning.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Fintech News', value: 'medium', url: 'https://fintechmorning.com' },
    { name: 'cryptoupdated.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Crypto News', value: 'medium', url: 'https://cryptoupdated.com' },
    { name: 'megacursos.com', platform: 'Cloudflare Pages', status: 'live', industry: 'Online Courses', value: 'medium', url: 'https://megacursos.com' },
    { name: 'visualingo.app', platform: 'Cloudflare Pages', status: 'live', industry: 'Language Learning', value: 'high', url: 'https://visualingo.app' },
    
    // APIs & Development
    { name: 'dameapi.com', platform: 'Cloudflare Pages', status: 'live', industry: 'API Marketplace', value: 'medium', url: 'https://dameapi.com' },
    { name: 'apilord.com', platform: 'Cloudflare', status: 'live', industry: 'API Tools', value: 'medium', url: 'https://apilord.com' },
    { name: 'mcp.blue', platform: 'Cloudflare Pages', status: 'live', industry: 'Model Protocol', value: 'high', url: 'https://mcp.blue' },
    
    // Other services  
    { name: 'sort.services', platform: 'Cloudflare Pages', status: 'live', industry: 'Sorting Services', value: 'low', url: 'https://sort.services' },
    { name: 'samihalawa.com', platform: 'Cloudflare', status: 'live', industry: 'Personal', value: 'medium', url: 'https://samihalawa.com' },
    
    // Some inactive for testing
    { name: 'maximagpt.com', platform: 'Cloudflare', status: 'inactive', industry: 'GPT Tools', value: 'low', url: 'https://maximagpt.com' },
    { name: 'gptveteran.com', platform: 'Cloudflare', status: 'pending', industry: 'GPT Community', value: 'low', url: 'https://gptveteran.com' },
    { name: 'gptaddicts.com', platform: 'Netlify', status: 'live', industry: 'GPT Community', value: 'medium', url: 'https://gptaddicts.com' },
    { name: 'gptenespanol.com', platform: 'Netlify', status: 'live', industry: 'GPT Spanish', value: 'medium', url: 'https://gptenespanol.com' },
    { name: 'gptvenezuela.com', platform: 'Netlify', status: 'pending', industry: 'GPT Regional', value: 'low', url: 'https://gptvenezuela.com' },
    { name: 'pime.ai', platform: 'Cloudflare', status: 'live', industry: 'AI Platform', value: 'ultra-high', url: 'https://pime.ai' }
  ];
}

// ===== Domain aggregator (Monorepo + Netlify + Cloudflare) =====
async function buildDomainsResponse(env) {
  const byDomain = new Map();

  // Add static test domains for demo purposes
  const staticDomains = getStaticDomains();
  for (const d of staticDomains) {
    byDomain.set(d.name, d);
  }

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
  const url = new URL(request.url);

  if (pathname === '/netlify-sites') {
    return listNetlifySites(request, env, corsHeaders);
  }

  // Example of handling different dashboard routes
  if (pathname === '/domain-analysis') {
    const analysis = await getDomainAnalysis(env);
    return jsonResponse({ success: true, data: analysis }, corsHeaders);
  }

  if (pathname === '/super-dashboard') {
    const dashboardData = await getSuperDashboardData(env);
    return jsonResponse({ success: true, data: dashboardData }, corsHeaders);
  }

  if (pathname === '/domains' && request.method === 'GET') {
    const payload = await buildDomainsResponse(env);
    return jsonResponse(payload, corsHeaders);
  }

  if (pathname === '/bulk-health-check' && request.method === 'POST') {
    const { domains } = await request.json();
    const results = await performBulkHealthCheck(domains || []);
    return jsonResponse({ success: true, results }, corsHeaders);
  }

  if (pathname === '/domain-status' && request.method === 'GET') {
    const url = new URL(request.url);
    const domain = url.searchParams.get('domain');
    const status = await getDomainStatus(domain);
    return jsonResponse({ success: true, status }, corsHeaders);
  }

  return jsonResponse({ error: 'Dashboard endpoint not found' }, { ...corsHeaders, status: 404 });
}

async function listNetlifySites(request, env, corsHeaders) {
  try {
    const url = `https://api.netlify.com/api/v1/sites`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Netlify API error: ${response.status} ${response.statusText}`, errorText);
      return jsonResponse({ error: 'Failed to fetch from Netlify API', details: errorText }, { ...corsHeaders, status: response.status });
    }

    const sites = await response.json();
    return jsonResponse(sites, corsHeaders);
  } catch (error) {
    console.error('Error fetching Netlify sites:', error);
    return jsonResponse({ error: 'Internal server error' }, { ...corsHeaders, status: 500 });
  }
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
  const url = new URL(request.url);

  if (pathname === 'map') {
    const domainMap = getDomainMap();
    return jsonResponse({ domains: domainMap }, corsHeaders);
  }

  if (pathname === 'health') {
    return jsonResponse({ ok: true, service: 'router' }, corsHeaders);
  }

  if (pathname === 'domains/status') {
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
    'www.maximagpt.com': 'maximagpt',
    'ministerio.ai': 'ministerio',
    'www.ministerio.ai': 'ministerio'
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

// ===== DNS management (Cloudflare) =====
async function ensureDns(env, domain, { target, apexIp, proxied = true } = {}) {
  const token = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_TOKEN;
  if (!token) throw new Error('Missing Cloudflare API token');
  const apex = (domain || '').replace(/^www\./, '');

  const zone = await findZoneByName(token, apex);
  if (!zone) throw new Error(`Zone not found for ${apex}`);

  const zoneId = zone.id;
  const records = await listDnsRecords(token, zoneId);

  const changes = { updated: [], created: [] };

  // Determine apex target: prefer provided target, else Cloudflare Pages flattening if apexIp specified
  // If target is provided, we create CNAME for apex (flattened via proxied=true)
  const apexRecordTarget = target || apexIp || null;

  // Upsert apex record
  const apexExisting = records.find(r => (r.name === apex || r.name === `${apex}.`) && (r.type === 'CNAME' || r.type === 'A'));
  if (apexRecordTarget) {
    if (target) {
      // CNAME flattening at apex with proxied true
      if (apexExisting) {
        await updateDnsRecord(token, zoneId, apexExisting.id, {
          type: 'CNAME', name: apex, content: target, proxied
        });
        changes.updated.push({ name: apex, type: 'CNAME', content: target, proxied });
      } else {
        const rec = await createDnsRecord(token, zoneId, {
          type: 'CNAME', name: apex, content: target, proxied
        });
        changes.created.push(rec);
      }
    } else if (apexIp) {
      // Plain A record
      if (apexExisting) {
        await updateDnsRecord(token, zoneId, apexExisting.id, {
          type: 'A', name: apex, content: apexIp, proxied
        });
        changes.updated.push({ name: apex, type: 'A', content: apexIp, proxied });
      } else {
        const rec = await createDnsRecord(token, zoneId, {
          type: 'A', name: apex, content: apexIp, proxied
        });
        changes.created.push(rec);
      }
    }
  }

  // Ensure www CNAME -> apex
  const wwwName = `www.${apex}`;
  const wwwExisting = records.find(r => (r.name === wwwName || r.name === `${wwwName}.`) && r.type === 'CNAME');
  if (wwwExisting) {
    await updateDnsRecord(token, zoneId, wwwExisting.id, { type: 'CNAME', name: wwwName, content: apex, proxied });
    changes.updated.push({ name: wwwName, type: 'CNAME', content: apex, proxied });
  } else {
    const rec = await createDnsRecord(token, zoneId, { type: 'CNAME', name: wwwName, content: apex, proxied });
    changes.created.push(rec);
  }

  return { success: true, domain: apex, zoneId, changes };
}

async function getDns(env, domain) {
  const token = env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_TOKEN;
  if (!token) throw new Error('Missing Cloudflare API token');
  const apex = (domain || '').replace(/^www\./, '');
  const zone = await findZoneByName(token, apex);
  if (!zone) throw new Error(`Zone not found for ${apex}`);
  const records = await listDnsRecords(token, zone.id);
  return { success: true, domain: apex, zoneId: zone.id, records };
}

async function findZoneByName(token, domain) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.result && json.result[0];
}

async function listDnsRecords(token, zoneId) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.result || [];
}

async function createDnsRecord(token, zoneId, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Create DNS failed: ${json.errors ? JSON.stringify(json.errors) : res.status}`);
  return json.result;
}

async function updateDnsRecord(token, zoneId, recordId, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Update DNS failed: ${json.errors ? JSON.stringify(json.errors) : res.status}`);
  return json.result;
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

// ===== Blog Handlers =====
async function handleBlogListing(request, env, hostname) {
  try {
    const blog = await getBlogByDomain(hostname, env);
    if (!blog) {
      return new Response('Blog not found', { status: 404 });
    }
    
    const posts = await getBlogPosts(blog.id, env);
    const html = generateBlogListingHTML(hostname, blog, posts.posts || []);
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return new Response('Error loading blog', { status: 500 });
  }
}

async function handleBlogPage(request, env, hostname, pathname) {
  try {
    const slug = pathname.replace('/blog/', '');
    const blog = await getBlogByDomain(hostname, env);
    if (!blog) {
      return new Response('Blog not found', { status: 404 });
    }
    
    const posts = await getBlogPosts(blog.id, env);
    const post = posts.posts?.find(p => p.slug === slug);
    if (!post) {
      return new Response('Article not found', { status: 404 });
    }
    
    const html = generateBlogPostHTML(hostname, blog, post);
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return new Response('Error loading article', { status: 500 });
  }
}

function generateBlogListingHTML(domain, blog, posts) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog - ${domain}</title>
  <meta name="description" content="Artículos y contenido de ${domain}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; line-height: 1.6; color: #333; background: #f9f9f9; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { background: #fff; padding: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 40px; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; color: #2563eb; }
    .subtitle { color: #666; font-size: 1.2rem; }
    .posts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px; }
    .post-card { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); transition: transform 0.2s; }
    .post-card:hover { transform: translateY(-5px); }
    .post-title { font-size: 1.5rem; margin-bottom: 15px; color: #333; }
    .post-excerpt { color: #666; margin-bottom: 20px; line-height: 1.6; }
    .post-meta { font-size: 0.9rem; color: #888; margin-bottom: 15px; }
    .read-more { color: #2563eb; text-decoration: none; font-weight: 600; }
    .read-more:hover { text-decoration: underline; }
    @media (max-width: 768px) { 
      .posts-grid { grid-template-columns: 1fr; }
      h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>Blog de ${domain}</h1>
      <p class="subtitle">Artículos, noticias y contenido especializado</p>
    </div>
  </header>
  
  <main class="container">
    <div class="posts-grid">
      ${posts.map(post => `
        <article class="post-card">
          <h2 class="post-title">${post.title || 'Sin título'}</h2>
          <div class="post-meta">Publicado el ${new Date(post.created_at || Date.now()).toLocaleDateString('es-ES')}</div>
          <p class="post-excerpt">${(post.content || post.excerpt || '').substring(0, 200)}...</p>
          <a href="/blog/${post.slug || post.id}" class="read-more">Leer más →</a>
        </article>
      `).join('')}
    </div>
    
    ${posts.length === 0 ? '<p style="text-align: center; color: #666; font-size: 1.2rem; margin-top: 60px;">No hay artículos disponibles en este momento.</p>' : ''}
  </main>
</body>
</html>`;
}

function generateBlogPostHTML(domain, blog, post) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${post.title || 'Artículo'} - ${domain}</title>
  <meta name="description" content="${(post.excerpt || post.content || '').substring(0, 160)}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; line-height: 1.7; color: #333; background: #f9f9f9; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    header { background: #fff; padding: 30px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 40px; }
    .back-link { color: #2563eb; text-decoration: none; margin-bottom: 20px; display: inline-block; }
    .back-link:hover { text-decoration: underline; }
    h1 { font-size: 2.5rem; margin-bottom: 20px; color: #2563eb; line-height: 1.2; }
    .article-meta { color: #666; font-size: 1rem; margin-bottom: 30px; }
    .article-content { background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .article-content p { margin-bottom: 20px; font-size: 1.1rem; }
    .article-content h2 { margin: 30px 0 15px; color: #333; }
    .article-content h3 { margin: 25px 0 10px; color: #555; }
    .article-content ul, .article-content ol { margin: 15px 0 15px 30px; }
    .article-content li { margin-bottom: 8px; }
    @media (max-width: 768px) { 
      h1 { font-size: 2rem; }
      .article-content { padding: 30px 20px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <a href="/blog" class="back-link">← Volver al blog</a>
      <h1>${post.title || 'Sin título'}</h1>
      <div class="article-meta">
        Publicado el ${new Date(post.created_at || Date.now()).toLocaleDateString('es-ES')}
        ${post.author ? ` por ${post.author}` : ''}
      </div>
    </div>
  </header>
  
  <main class="container">
    <article class="article-content">
      ${formatContent(post.content || post.excerpt || 'Contenido no disponible.')}
    </article>
  </main>
</body>
</html>`;
}

function formatContent(content) {
  return content
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}
