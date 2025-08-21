// Cloudflare Worker to serve different sites based on domain
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Map domains to their site folders
    const domainMap = {
      'damecoins.com': 'damecoins',
      'www.damecoins.com': 'damecoins',
      'gptcoins.com': 'gptcoins',
      'www.gptcoins.com': 'gptcoins',
      'detectar.ai': 'detectar',
      'www.detectar.ai': 'detectar',
      'empleados.ai': 'empleados',
      'www.empleados.ai': 'empleados',
      'instantvirtualcards.com': 'instantvirtualcards',
      'www.instantvirtualcards.com': 'instantvirtualcards',
      'damepay.com': 'damepay',
      'www.damepay.com': 'damepay',
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
      'autotinder.ai': 'autotinder',
      'www.autotinder.ai': 'autotinder',
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
      'agentsai.ltd': 'agentsai',
      'www.agentsai.ltd': 'agentsai'
    };

    // Get the site folder for this domain
    const siteFolder = domainMap[hostname] || 'default';
    
    // For now, return the HTML directly
    // In production, this would fetch from KV storage or serve from Pages
    const html = await getSiteHTML(siteFolder);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  }
};

async function getSiteHTML(siteFolder) {
  // This is a placeholder - in production, you'd fetch from KV or Pages
  // For now, returning a simple redirect to the GitHub Pages version
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading...</title>
  <meta http-equiv="refresh" content="0; url=https://samihalawa.github.io/domains-monorepo/sites/${siteFolder}/">
  <script async src="https://zarazscript.trigox.workers.dev/"></script>
</head>
<body>
  <p>Loading site...</p>
</body>
</html>`;
}