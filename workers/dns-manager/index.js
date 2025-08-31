export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (pathname === "/dns/ensure" && request.method === 'POST') {
      try {
        const { domain, apexIp = '192.0.2.1', proxied = true } = await request.json();
        if (!domain) return json({ error: 'missing_domain' }, 400);
        const result = await ensureDns(env, domain, apexIp, proxied);
        return json(result);
      } catch (e) {
        return json({ error: 'ensure_failed', message: String(e) }, 500);
      }
    }

    if (pathname === "/dns/get" && request.method === 'GET') {
      try {
        const domain = url.searchParams.get('domain');
        if (!domain) return json({ error: 'missing_domain' }, 400);
        const details = await getDns(env, domain);
        return json(details);
      } catch (e) {
        return json({ error: 'get_failed', message: String(e) }, 500);
      }
    }

    return new Response('Not found', { status: 404 });
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
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

