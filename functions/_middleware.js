export async function onRequest(context) {
  const { request } = context;
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
  const siteFolder = domainMap[hostname];
  
  if (siteFolder) {
    // Rewrite the request to serve from the correct subfolder
    const newUrl = new URL(url);
    newUrl.pathname = `/${siteFolder}/index.html`;
    
    const response = await context.env.ASSETS.fetch(newUrl.toString(), request);
    
    // Add cache headers
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Cache-Control', 'public, max-age=3600');
    
    return modifiedResponse;
  }
  
  // Default response for unknown domains
  return new Response('Site not found', { status: 404 });
}