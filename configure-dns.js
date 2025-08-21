#!/usr/bin/env node

const https = require('https');

// Cloudflare API configuration
const CF_TOKEN = 'vt-zCfnnPewhpcP6n5Gy_On6AI8U2YEvxjFGLMAd';

// Top 20 domains to configure
const domains = [
  { name: 'damecoins.com', zoneId: 'ef0b75c129bc2d51d7a9a1c0d309979b' },
  { name: 'gptcoins.com', zoneId: '5d4e4ecddb009461c590bd4541e05934' },
  { name: 'detectar.ai', zoneId: 'adf48350490c59f1845fbe48b91605cc' },
  { name: 'empleados.ai', zoneId: '049b26d9fa41d75a7f56f3ae8e1a7302' },
  { name: 'instantvirtualcards.com', zoneId: 'a32d10a8956b4a58249ab0a5eea2cbf7' },
  { name: 'damepay.com', zoneId: '6955807b6cab18c1019f69c627bb1a0c' },
  { name: 'gptapikeys.com', zoneId: '43952bbfc59dace2a492c0cb34883d7f' },
  { name: 'megacursos.com', zoneId: 'cac1bae5fc0cfe44e563c9d456c450b6' },
  { name: 'cryptoupdated.com', zoneId: 'acd0c498c44bb3e5e734d68ac152747e' },
  { name: 'gpt-excel.com', zoneId: '99b3bc5ae94e06649e8c2db5f9c46bfd' },
  { name: 'autoword.ai', zoneId: 'c560188944134bc6ae2ee7babab51ea0' },
  { name: 'autotinder.ai', zoneId: '7b7e63543181732fd2a0409cd0c804f8' },
  { name: 'dameapi.com', zoneId: 'a8597ec3a3dfd8f4b64d5951033e60ee' },
  { name: 'flywallex.com', zoneId: '5b135b1df046f67ca77f5a316b1925e0' },
  { name: 'gateway24h.com', zoneId: '586e512cc3ffccf3876f9ce65b07beae' },
  { name: 'fintechmorning.com', zoneId: '3d44d60cb1f2d9aa2e584d567349d098' },
  { name: 'visualingo.app', zoneId: '3a3db3cf00605cb0f2781f539d1f209a' },
  { name: 'mcp.blue', zoneId: '8e8b1b56b2656f65236256195f1a6fb3' },
  { name: 'sort.services', zoneId: 'a68ee8f3701801b5589ceb01df383eb9' },
  { name: 'agentsai.ltd', zoneId: 'b6adcdf04f179630662d4298aecd4b9e' }
];

// Cloudflare Pages project URL (deployed)
const PAGES_PROJECT = 'domains-monorepo.pages.dev';

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

async function getDNSRecords(zoneId) {
  try {
    const response = await makeCloudflareRequest('GET', `/zones/${zoneId}/dns_records`);
    return response.result || [];
  } catch (error) {
    console.error(`Error getting DNS records: ${error.message}`);
    return [];
  }
}

async function createOrUpdateDNSRecord(domain, zoneId) {
  try {
    // First check if CNAME record already exists
    const records = await getDNSRecords(zoneId);
    const existingCNAME = records.find(r => r.type === 'CNAME' && r.name === domain);
    const existingA = records.find(r => r.type === 'A' && r.name === domain);

    // Delete existing A record if it exists (we'll use CNAME instead)
    if (existingA) {
      console.log(`  Deleting existing A record for ${domain}...`);
      await makeCloudflareRequest('DELETE', `/zones/${zoneId}/dns_records/${existingA.id}`);
    }

    const recordData = {
      type: 'CNAME',
      name: '@',
      content: PAGES_PROJECT,
      ttl: 1,
      proxied: true
    };

    if (existingCNAME) {
      // Update existing CNAME record
      console.log(`  Updating CNAME record for ${domain}...`);
      await makeCloudflareRequest('PUT', `/zones/${zoneId}/dns_records/${existingCNAME.id}`, recordData);
    } else {
      // Create new CNAME record
      console.log(`  Creating CNAME record for ${domain}...`);
      await makeCloudflareRequest('POST', `/zones/${zoneId}/dns_records`, recordData);
    }

    // Also add www subdomain
    const wwwRecord = records.find(r => r.type === 'CNAME' && r.name === `www.${domain}`);
    const wwwData = {
      type: 'CNAME',
      name: 'www',
      content: domain,
      ttl: 1,
      proxied: true
    };

    if (!wwwRecord) {
      console.log(`  Creating www CNAME for ${domain}...`);
      await makeCloudflareRequest('POST', `/zones/${zoneId}/dns_records`, wwwData);
    }

    console.log(`✅ ${domain} - DNS configured successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${domain} - Error: ${error.message}`);
    return false;
  }
}

async function configureDNSForAllDomains() {
  console.log('🚀 Configuring DNS for 20 domains...\n');
  
  const results = {
    success: [],
    failed: []
  };

  for (const domain of domains) {
    console.log(`\nProcessing ${domain.name}...`);
    const success = await createOrUpdateDNSRecord(domain.name, domain.zoneId);
    
    if (success) {
      results.success.push(domain.name);
    } else {
      results.failed.push(domain.name);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n' + '='.repeat(60));
  console.log('DNS Configuration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully configured: ${results.success.length} domains`);
  if (results.success.length > 0) {
    results.success.forEach(d => console.log(`   - ${d}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} domains`);
    results.failed.forEach(d => console.log(`   - ${d}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('Next Steps:');
  console.log('1. Deploy the monorepo to Cloudflare Pages');
  console.log('2. Configure custom domains in Cloudflare Pages');
  console.log('3. SSL certificates will be auto-provisioned');
  console.log('='.repeat(60));
}

// Run the configuration
configureDNSForAllDomains().catch(console.error);