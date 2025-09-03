#!/usr/bin/env node

/**
 * Unified domain verification script
 * Checks status of all domains in the monorepo
 */

const https = require('https');
const dns = require('dns').promises;

const DOMAINS = [
  // Monorepo domains (Cloudflare Pages)
  'agentsai.ltd',
  'apilord.com',
  'autotinder.ai',
  'autoword.ai',
  'cryptoupdated.com',
  'dameapi.com',
  'damecoins.com',
  'detectar.ai',
  'empleados.ai',
  'fintechmorning.com',
  'flywallex.com',
  'gateway24h.com',
  'gpt-excel.com',
  'gptabsolute.com',
  'gptapikeys.com',
  'gptcoins.com',
  'gpthard.com',
  'instantvirtualcards.com',
  'mcp.blue',
  'megacursos.com',
  'ministerio.ai',
  'octbot.ai',
  'sort.services',
  'visualingo.app'
];

async function checkDomain(domain) {
  return new Promise((resolve) => {
    const options = {
      hostname: domain,
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      resolve({
        domain,
        status: res.statusCode === 200 ? 'online' : 'error',
        statusCode: res.statusCode
      });
    });

    req.on('error', () => {
      resolve({
        domain,
        status: 'offline',
        statusCode: 0
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        domain,
        status: 'timeout',
        statusCode: 0
      });
    });

    req.end();
  });
}

async function checkDNS(domain) {
  try {
    const addresses = await dns.resolve4(domain);
    return addresses.length > 0 ? addresses[0] : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🔍 Verifying Domain Status');
  console.log('═══════════════════════════════════════════════');
  
  const results = await Promise.all(
    DOMAINS.map(async (domain) => {
      const status = await checkDomain(domain);
      const ip = await checkDNS(domain);
      return { ...status, ip };
    })
  );
  
  // Stats
  const online = results.filter(r => r.status === 'online').length;
  const issues = results.filter(r => r.status !== 'online').length;
  
  console.log(`\n📊 Summary: ${online} online, ${issues} with issues\n`);
  
  // Display results
  results.forEach(result => {
    const icon = result.status === 'online' ? '✅' : 
                 result.status === 'error' ? '⚠️' :
                 result.status === 'timeout' ? '⏱️' : '❌';
    
    console.log(`${icon} ${result.domain.padEnd(25)} Status: ${result.status} ${result.statusCode ? `(${result.statusCode})` : ''} ${result.ip ? `IP: ${result.ip}` : ''}`);
  });
  
  console.log('\n✨ Verification complete!');
}

main().catch(console.error);