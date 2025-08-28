#!/usr/bin/env node

const https = require('https');

// Cloudflare API configuration
const CF_TOKEN = 'vt-zCfnnPewhpcP6n5Gy_On6AI8U2YEvxjFGLMAd';
const ACCOUNT_ID = '21d8251b2204f8dfa7df681246d76705';
const PROJECT_NAME = 'domains-monorepo';

// All domains to add as custom domains
const domains = [
  'damecoins.com',
  'gptcoins.com',
  'detectar.ai',
  'empleados.ai',
  'instantvirtualcards.com',
  'damepay.com',
  'gptapikeys.com',
  'megacursos.com',
  'cryptoupdated.com',
  'gpt-excel.com',
  'autoword.ai',
  'autotinder.ai',
  'dameapi.com',
  'flywallex.com',
  'gateway24h.com',
  'fintechmorning.com',
  'visualingo.app',
  'mcp.blue',
  'sort.services',
  'agentsai.ltd'
];

async function makeCloudflareRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${CF_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(`API Error: ${JSON.stringify(response.errors)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function addCustomDomain(domain) {
  try {
    console.log(`Adding custom domain: ${domain}...`);
    
    const response = await makeCloudflareRequest(
      'POST',
      `/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/domains`,
      { name: domain }
    );
    
    console.log(`✅ ${domain} - Added successfully`);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠️  ${domain} - Already exists`);
      return true;
    }
    console.error(`❌ ${domain} - Error: ${error.message}`);
    return false;
  }
}

async function addAllCustomDomains() {
  console.log('🚀 Adding custom domains to Cloudflare Pages project...\n');
  
  const results = {
    success: [],
    failed: []
  };

  for (const domain of domains) {
    const success = await addCustomDomain(domain);
    
    if (success) {
      results.success.push(domain);
    } else {
      results.failed.push(domain);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Custom Domains Configuration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully added: ${results.success.length} domains`);
  if (results.success.length > 0) {
    results.success.forEach(d => console.log(`   - ${d}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} domains`);
    results.failed.forEach(d => console.log(`   - ${d}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Your sites are now accessible at:');
  console.log('='.repeat(60));
  results.success.forEach(d => {
    console.log(`🌐 https://${d}`);
  });
  console.log('='.repeat(60));
}

// Run the configuration
addAllCustomDomains().catch(console.error);