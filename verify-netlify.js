#!/usr/bin/env node

const https = require('https');

const NETLIFY_TOKEN = 'nfp_pDmgg5cmJKQsgnbojU3nGqHgwAtCri6k2699';

const expectedDomains = [
  {
    domain: 'agentsai.ltd',
    netlifyApp: 'agentsai.netlify.app'
  },
  {
    domain: 'autotinder.ai',
    netlifyApp: 'autotinder.netlify.app'
  },
  {
    domain: 'detectar.ai',
    netlifyApp: 'detectar-ai-platform.netlify.app'
  }
];

async function makeNetlifyRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NETLIFY_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function verifyNetlifySites() {
  console.log('🔍 Verifying Netlify site configurations...\n');
  
  try {
    // Get all sites
    const sites = await makeNetlifyRequest('/sites');
    
    for (const expectedSite of expectedDomains) {
      console.log(`📍 Checking ${expectedSite.domain} -> ${expectedSite.netlifyApp}:`);
      
      // Find the site by URL
      const site = sites.find(s => s.url === `https://${expectedSite.netlifyApp}`);
      
      if (!site) {
        console.log(`   ❌ Site ${expectedSite.netlifyApp} not found`);
        continue;
      }
      
      console.log(`   ✅ Site found: ${site.name} (${site.url})`);
      console.log(`   📊 Status: ${site.published_deploy?.state || 'unknown'}`);
      
      // Check custom domains
      if (site.domain_aliases && site.domain_aliases.length > 0) {
        console.log(`   🌐 Custom domains:`);
        site.domain_aliases.forEach(domain => {
          console.log(`      - ${domain}`);
        });
      } else {
        console.log(`   ⚠️  No custom domains configured yet`);
      }
      
      console.log('');
    }
    
    console.log('✅ Netlify verification complete!');
    console.log('\n💡 Next steps:');
    console.log('1. Add custom domains in Netlify dashboard if not already done');
    console.log('2. Wait for DNS propagation (up to 48 hours)');
    console.log('3. SSL certificates will be auto-provisioned by Netlify');
    
  } catch (error) {
    console.error(`❌ Error verifying Netlify sites: ${error.message}`);
  }
}

verifyNetlifySites();