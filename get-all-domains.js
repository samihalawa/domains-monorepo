#!/usr/bin/env node

/**
 * Fetch ALL domains from Cloudflare account
 */

const https = require('https');

// Cloudflare API configuration
const CF_API_TOKEN = 'vt-zCfnnPewhpcP6n5Gy_On6AI8U2YEvxjFGLMAd';

// Helper function to make Cloudflare API requests
function makeCloudflareRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            path: `/client/v4${path}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CF_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.success) {
                        resolve(parsed.result);
                    } else {
                        reject(new Error(`API Error: ${JSON.stringify(parsed.errors)}`));
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function getAllDomains() {
    try {
        console.log('🔍 Fetching all domains from Cloudflare account...\n');
        
        // Fetch all zones (domains)
        let allDomains = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const zones = await makeCloudflareRequest(`/zones?page=${page}&per_page=50`);
            
            if (zones && zones.length > 0) {
                allDomains = allDomains.concat(zones);
                console.log(`📄 Page ${page}: Found ${zones.length} domains`);
                page++;
                
                // If we got less than 50, we're done
                if (zones.length < 50) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        console.log(`\n✅ Total domains found: ${allDomains.length}\n`);

        // Current domains in use
        const currentlyUsed = [
            // Netlify domains
            'agentsai.ltd', 'autotinder.ai', 'detectar.ai', 'autorad.automedical.ai', 
            'pime.ai', 'samihalawa.com', 'autoclient.ai',
            // Cloudflare Pages monorepo domains  
            'damecoins.com', 'gptcoins.com', 'empleados.ai', 'instantvirtualcards.com',
            'damepay.com', 'gptapikeys.com', 'megacursos.com', 'cryptoupdated.com',
            'gpt-excel.com', 'autoword.ai', 'dameapi.com', 'flywallex.com',
            'gateway24h.com', 'fintechmorning.com', 'visualingo.app', 'mcp.blue', 'sort.services'
        ];

        // Separate domains
        const usedDomains = [];
        const unusedDomains = [];

        allDomains.forEach(zone => {
            const domain = zone.name;
            if (currentlyUsed.includes(domain)) {
                usedDomains.push({
                    name: domain,
                    status: zone.status,
                    plan: zone.plan.name
                });
            } else {
                unusedDomains.push({
                    name: domain,
                    status: zone.status,
                    plan: zone.plan.name
                });
            }
        });

        // Results
        console.log('🌐 ALL YOUR DOMAINS:\n');
        
        console.log('✅ CURRENTLY USED DOMAINS:', usedDomains.length);
        usedDomains.forEach(domain => {
            console.log(`   - ${domain.name} (${domain.status})`);
        });

        console.log(`\n🚀 UNUSED DOMAINS AVAILABLE:`, unusedDomains.length);
        unusedDomains.forEach(domain => {
            console.log(`   - ${domain.name} (${domain.status}) [${domain.plan}]`);
        });

        console.log(`\n📊 SUMMARY:`);
        console.log(`   - Total domains: ${allDomains.length}`);
        console.log(`   - Currently used: ${usedDomains.length}`);
        console.log(`   - Available for websites: ${unusedDomains.length}`);

        // Save unused domains to file
        const unusedList = unusedDomains.map(d => d.name);
        console.log(`\n🎯 UNUSED DOMAINS LIST:`);
        console.log(JSON.stringify(unusedList, null, 2));

    } catch (error) {
        console.error('❌ Error fetching domains:', error.message);
    }
}

getAllDomains();