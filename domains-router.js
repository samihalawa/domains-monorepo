export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Map domains to their Pages deployment paths
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

    const siteFolder = domainMap[hostname];
    
    if (siteFolder) {
      // Fetch from the Cloudflare Pages deployment
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