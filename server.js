const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Top 20 domains to serve
const domains = {
  'damecoins.com': 'damecoins',
  'gptcoins.com': 'gptcoins',
  'detectar.ai': 'detectar',
  'empleados.ai': 'empleados',
  'instantvirtualcards.com': 'instantvirtualcards',
  'damepay.com': 'damepay',
  'gptapikeys.com': 'gptapikeys',
  'megacursos.com': 'megacursos',
  'cryptoupdated.com': 'cryptoupdated',
  'gpt-excel.com': 'gpt-excel',
  'autoword.ai': 'autoword',
  'autotinder.ai': 'autotinder',
  'dameapi.com': 'dameapi',
  'flywallex.com': 'flywallex',
  'gateway24h.com': 'gateway24h',
  'fintechmorning.com': 'fintechmorning',
  'visualingo.app': 'visualingo',
  'mcp.blue': 'mcp',
  'sort.services': 'sort',
  'agentsai.ltd': 'agentsai'
};

// Serve static files for each domain
app.use((req, res, next) => {
  const host = req.get('host')?.replace(':8080', '') || 'localhost';
  const siteName = domains[host] || 'default';
  const sitePath = path.join(__dirname, 'sites', siteName);
  
  console.log(`Serving ${host} -> ${siteName}`);
  
  if (fs.existsSync(sitePath)) {
    express.static(sitePath)(req, res, next);
  } else {
    // Fallback to default site
    express.static(path.join(__dirname, 'sites', 'default'))(req, res, next);
  }
});

// Default route
app.get('/', (req, res) => {
  const host = req.get('host')?.replace(':8080', '') || 'localhost';
  const siteName = domains[host] || 'default';
  const indexPath = path.join(__dirname, 'sites', siteName, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, 'sites', 'default', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Domain server running on port ${PORT}`);
  console.log(`📦 Serving ${Object.keys(domains).length} domains`);
  console.log(`🌐 Domains: ${Object.keys(domains).join(', ')}`);
});