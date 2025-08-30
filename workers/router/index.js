export default {
  async fetch(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
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
      // REMOVED: ministerio.ai - TIMEOUT
      // REMOVED: octbot.ai - 404
      'apilord.com': 'apilord',
      'www.apilord.com': 'apilord',
      'gptabsolute.com': 'gptabsolute',
      'www.gptabsolute.com': 'gptabsolute',
      'gpthard.com': 'gpthard',
      'www.gpthard.com': 'gpthard'
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