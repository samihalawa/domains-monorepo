export default {
  async fetch(request, env) {
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
