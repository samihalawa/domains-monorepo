#!/usr/bin/env node

const https = require('https');

const CF_TOKEN = 'vt-zCfnnPewhpcP6n5Gy_On6AI8U2YEvxjFGLMAd';

const domains = [
  { name: 'agentsai.ltd', zoneId: 'b6adcdf04f179630662d4298aecd4b9e' },
  { name: 'autotinder.ai', zoneId: '7b7e63543181732fd2a0409cd0c804f8' },
  { name: 'detectar.ai', zoneId: 'adf48350490c59f1845fbe48b91605cc' }
];

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: `/client/v4${path}`,
      method: 'GET',
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
            resolve(response.result || []);
          } else {
            reject(new Error(`API Error: ${JSON.stringify(response.errors)}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkDNS() {
  console.log('🔍 Verifying DNS configurations...\n');
  
  for (const domain of domains) {
    try {
      console.log(`📍 ${domain.name}:`);
      const records = await makeRequest(`/zones/${domain.zoneId}/dns_records?type=CNAME`);
      
      const relevantRecords = records.filter(r => 
        r.name === domain.name || r.name === `www.${domain.name}`
      );
      
      if (relevantRecords.length === 0) {
        console.log('   ❌ No CNAME records found');
      } else {
        relevantRecords.forEach(record => {
          console.log(`   ✅ ${record.name} -> ${record.content} (proxied: ${record.proxied})`);
        });
      }
      console.log('');
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error checking ${domain.name}: ${error.message}\n`);
    }
  }
  
  console.log('✅ DNS verification complete!');
}

checkDNS().catch(console.error);