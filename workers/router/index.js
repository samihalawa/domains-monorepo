export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    const pathname = url.pathname;
    
    // DNS Management API endpoints
    if (pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: 'domains-monorepo' }), { 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if (pathname === "/dns/ensure" && request.method === 'POST') {
      try {
        const { domain, apexIp = '192.0.2.1', proxied = true } = await request.json();
        if (!domain) return jsonResponse({ error: 'missing_domain' }, 400);
        const result = await ensureDns(env, domain, apexIp, proxied);
        return jsonResponse(result);
      } catch (e) {
        return jsonResponse({ error: 'ensure_failed', message: String(e) }, 500);
      }
    }

    if (pathname === "/dns/get" && request.method === 'GET') {
      try {
        const domain = url.searchParams.get('domain');
        if (!domain) return jsonResponse({ error: 'missing_domain' }, 400);
        const details = await getDns(env, domain);
        return jsonResponse(details);
      } catch (e) {
        return jsonResponse({ error: 'get_failed', message: String(e) }, 500);
      }
    }

    // CORS Proxy functionality
    if (pathname === "/cors") {
      try {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) return jsonResponse({ error: 'missing_url' }, 400);
        
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
        });
        
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400'
        };
        
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
        return jsonResponse({ error: 'cors_failed', message: String(e) }, 500);
      }
    }

    // Redirect functionality
    if (pathname === "/redirect") {
      try {
        const targetUrl = url.searchParams.get('url');
        const code = parseInt(url.searchParams.get('code') || '302');
        
        if (!targetUrl) return jsonResponse({ error: 'missing_url' }, 400);
        if (![301, 302, 307, 308].includes(code)) return jsonResponse({ error: 'invalid_code' }, 400);
        
        return Response.redirect(targetUrl, code);
      } catch (e) {
        return jsonResponse({ error: 'redirect_failed', message: String(e) }, 500);
      }
    }

    // Check for blog routes first
    if (pathname.startsWith('/blog') || hostname.startsWith('blog.')) {
      // Forward to blog worker
      const blogWorkerUrl = `https://autoblog-cms.${env.WORKER_DOMAIN || 'workers.dev'}${pathname}`;
      
      // Add original hostname header for blog identification
      const headers = new Headers(request.headers);
      headers.set('X-Original-Host', hostname);
      
      return fetch(blogWorkerUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : null
      });
    }
    
    // RSS/Sitemap for main sites
    if (pathname === '/feed.xml' || pathname === '/rss.xml' || pathname === '/sitemap.xml') {
      const blogWorkerUrl = `https://autoblog-cms.${env.WORKER_DOMAIN || 'workers.dev'}${pathname}`;
      const headers = new Headers(request.headers);
      headers.set('X-Original-Host', hostname);
      return fetch(blogWorkerUrl, {
        method: request.method,
        headers: headers
      });
    }
    
    // Map domains to their Pages deployment paths
    // NOTE: Domains on Netlify (agentsai.ltd, autotinder.ai, detectar.ai) are NOT included here
    const domainMap = {
      'damecoins.com': 'damecoins',
      'www.damecoins.com': 'damecoins',
      'gptcoins.com': 'gptcoins',
      'www.gptcoins.com': 'gptcoins',
      // REMOVED: detectar.ai - has Netlify app (detectar-ai-platform.netlify.app)
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
      // REMOVED: autotinder.ai - has Netlify app (autotinder.netlify.app)
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
      // REMOVED: agentsai.ltd - has Netlify app (agentsai.netlify.app)
      'ministerio.ai': 'ministerio',
      'www.ministerio.ai': 'ministerio',
      'octbot.ai': 'octbot',
      'www.octbot.ai': 'octbot',
      'apilord.com': 'apilord',
      'www.apilord.com': 'apilord',
      'gptabsolute.com': 'gptabsolute',
      'www.gptabsolute.com': 'gptabsolute',
      'gpthard.com': 'gpthard',
      'www.gpthard.com': 'gpthard',

      // New domains (monorepo sites)
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

    const siteFolder = domainMap[hostname];
    
    // Serve dashboard at root for worker domain
    if (hostname.includes('workers.dev') && pathname === '/') {
      const dashboardHTML = getDashboardHTML();
      return new Response(dashboardHTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    // Dashboard API - Get all domains status
    if (pathname === "/api/domains/status") {
      try {
        const domains = Object.keys(domainMap).filter(d => !d.startsWith('www.'));
        const statuses = await Promise.all(
          domains.map(async (domain) => {
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
            } catch (e) {
              return { domain, status: 'offline', statusCode: 0 };
            }
          })
        );
        
        return jsonResponse({ 
          success: true, 
          domains: statuses,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        return jsonResponse({ error: 'status_check_failed', message: String(e) }, 500);
      }
    }

    // Dashboard route - serve the dashboard UI
    if (pathname === "/dashboard" || pathname === "/admin") {
      const dashboardHTML = getDashboardHTML();
      return new Response(dashboardHTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    
    if (siteFolder) {
      // Default to index.html for all paths
      const pagesUrl = `https://domains-monorepo.pages.dev/${siteFolder}/`;
      const response = await fetch(pagesUrl);
      
      // Return the response with proper headers
      return new Response(response.body, {
        status: response.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    
    // Default 404 response
    return new Response('Site not found', { status: 404 });
  }
};

// DNS Management Helper Functions
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { 
    status, 
    headers: { 'Content-Type': 'application/json' } 
  });
}

async function cfFetch(env, path, init) {
  const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init && init.headers ? init.headers : {})
    }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`CF API ${r.status}: ${JSON.stringify(data)}`);
  return data;
}

async function getZoneId(env, domain) {
  const data = await cfFetch(env, `/zones?name=${encodeURIComponent(domain)}`);
  return data.result && data.result[0] ? data.result[0].id : null;
}

async function getDns(env, domain) {
  const zoneId = await getZoneId(env, domain);
  if (!zoneId) return { domain, zoneId: null, apex: null, www: null };
  const records = await cfFetch(env, `/zones/${zoneId}/dns_records?per_page=100`);
  const apex = records.result.find(r => r.name === domain) || null;
  const www = records.result.find(r => r.name === `www.${domain}`) || null;
  return { domain, zoneId, apex, www };
}

async function ensureDns(env, domain, apexIp, proxied) {
  const zoneId = await getZoneId(env, domain);
  if (!zoneId) return { domain, created: false, reason: 'zone_not_found' };
  const current = await getDns(env, domain);
  const created = { apex: false, www: false };
  if (!current.apex) {
    await cfFetch(env, `/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'A', name: domain, content: apexIp, proxied })
    });
    created.apex = true;
  }
  if (!current.www) {
    await cfFetch(env, `/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({ type: 'CNAME', name: `www.${domain}`, content: domain, proxied })
    });
    created.www = true;
  }
  return { domain, created };
}

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Domains Control Center</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; }
        .glass { backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.05); }
        .status-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
    </style>
</head>
<body class="bg-gray-950 text-gray-100 min-h-screen">
    <div id="root"></div>
    
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@headlessui/react@1.7.17/dist/headlessui.umd.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    
    <script type="text/babel">
        const { useState, useEffect, Fragment } = React;
        const { Dialog, Transition, Switch } = HeadlessUI;

        function Dashboard() {
            const [domains, setDomains] = useState([]);
            const [loading, setLoading] = useState(true);
            const [autoRefresh, setAutoRefresh] = useState(true);
            const [filter, setFilter] = useState('all');
            const [searchQuery, setSearchQuery] = useState('');
            
            const fetchDomainStatus = async () => {
                try {
                    const response = await fetch('/api/domains/status');
                    const data = await response.json();
                    if (data.success) {
                        setDomains(data.domains);
                    }
                } catch (error) {
                    // Silently handle errors
                } finally {
                    setLoading(false);
                }
            };
            
            useEffect(() => {
                fetchDomainStatus();
                if (autoRefresh) {
                    const interval = setInterval(fetchDomainStatus, 30000);
                    return () => clearInterval(interval);
                }
            }, [autoRefresh]);
            
            const stats = {
                total: domains.length,
                online: domains.filter(d => d.status === 'online').length,
                issues: domains.filter(d => d.status !== 'online').length
            };
            
            const filteredDomains = domains.filter(d => {
                if (searchQuery && !d.domain.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                if (filter === 'online') return d.status === 'online';
                if (filter === 'issues') return d.status !== 'online';
                return true;
            });
            
            return (
                <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
                    <header className="glass border-b border-gray-800 sticky top-0 z-40">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                <div className="flex items-center gap-4">
                                    <h1 className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                        Domains Control Center
                                    </h1>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-400">Auto-refresh</span>
                                        <Switch
                                            checked={autoRefresh}
                                            onChange={setAutoRefresh}
                                            className={\`\${autoRefresh ? 'bg-blue-500' : 'bg-gray-700'} 
                                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors\`}
                                        >
                                            <span className={\`\${autoRefresh ? 'translate-x-6' : 'translate-x-1'} 
                                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform\`} />
                                        </Switch>
                                    </div>
                                    <button 
                                        onClick={fetchDomainStatus}
                                        className="p-2 glass rounded-lg hover:bg-gray-800 transition-colors"
                                        disabled={loading}
                                    >
                                        <svg className={\`w-5 h-5 \${loading ? 'animate-spin' : ''}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </button>
                                    <a 
                                        href="https://domains-dashboard-api.trigox.workers.dev/dashboard"
                                        target="_blank"
                                        className="px-3 py-2 glass rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        Analytics
                                    </a>
                                    <a 
                                        href="https://autoblog-cms.trigox.workers.dev/dashboard"
                                        target="_blank"
                                        className="px-3 py-2 glass rounded-lg hover:bg-gray-800 transition-colors"
                                    >
                                        Blog Manager
                                    </a>
                                </div>
                            </div>
                        </div>
                    </header>
                    
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="grid grid-cols-3 gap-6 mb-8">
                            <div className="glass border border-gray-800 rounded-xl p-6">
                                <p className="text-gray-400 mb-2">Total Domains</p>
                                <p className="text-3xl font-bold text-white">{stats.total}</p>
                            </div>
                            
                            <div className="glass border border-gray-800 rounded-xl p-6">
                                <p className="text-gray-400 mb-2">Online</p>
                                <p className="text-3xl font-bold text-green-400">{stats.online}</p>
                            </div>
                            
                            <div className="glass border border-gray-800 rounded-xl p-6">
                                <p className="text-gray-400 mb-2">Issues</p>
                                <p className="text-3xl font-bold text-yellow-400">{stats.issues}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex gap-2 p-1 glass rounded-lg border border-gray-800">
                                    <button 
                                        onClick={() => setFilter('all')}
                                        className={\`px-3 py-1.5 rounded text-sm font-medium transition-colors \${
                                            filter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                                        }\`}>
                                        All
                                    </button>
                                    <button 
                                        onClick={() => setFilter('online')}
                                        className={\`px-3 py-1.5 rounded text-sm font-medium transition-colors \${
                                            filter === 'online' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                                        }\`}>
                                        Online
                                    </button>
                                    <button 
                                        onClick={() => setFilter('issues')}
                                        className={\`px-3 py-1.5 rounded text-sm font-medium transition-colors \${
                                            filter === 'issues' ? 'bg-yellow-500 text-white' : 'text-gray-400 hover:text-white'
                                        }\`}>
                                        Issues
                                    </button>
                                </div>
                                
                                <input 
                                    type="text"
                                    placeholder="Search domains..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="px-4 py-2 glass border border-gray-800 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                        
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                                <p className="mt-4 text-gray-400">Loading domain status...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-4">
                                {filteredDomains.map(domain => (
                                    <div key={domain.domain} className="glass border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all">
                                        <div className="flex items-start justify-between mb-4">
                                            <h3 className="font-semibold text-lg">{domain.domain}</h3>
                                            <div className="flex items-center gap-2">
                                                <div className={\`w-2 h-2 rounded-full \${
                                                    domain.status === 'online' ? 'bg-green-500' : 
                                                    domain.status === 'error' ? 'bg-yellow-500' : 'bg-red-500'
                                                } status-pulse\`}></div>
                                                <span className="text-xs font-medium">
                                                    {domain.status === 'online' ? 'Online' : 
                                                     domain.status === 'error' ? 'Error' : 'Offline'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-sm text-gray-400">
                                            Status Code: {domain.statusCode || 'N/A'}
                                        </div>
                                        
                                        <div className="mt-4 flex gap-2">
                                            <a 
                                                href={\`https://\${domain.domain}\`} 
                                                target="_blank"
                                                className="flex-1 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-center"
                                            >
                                                Visit
                                            </a>
                                            <button className="flex-1 px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors">
                                                Manage
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        ReactDOM.render(<Dashboard />, document.getElementById('root'));
    </script>
</body>
</html>`;
}
