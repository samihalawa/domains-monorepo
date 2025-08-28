#!/usr/bin/env node

/**
 * Script to restore DNS configurations for domains that should point to Netlify
 * This fixes the DNS records that were incorrectly pointed to Cloudflare Pages
 */

const https = require('https');

// Cloudflare API configuration
const CF_API_TOKEN = 'vt-zCfnnPewhpcP6n5Gy_On6AI8U2YEvxjFGLMAd';
const CF_ACCOUNT_ID = '949026a4f73f2e00e5f3c9b43c79e6e8';

// Domains that should point to Netlify (based on your Netlify sites list)
const netlifyDomains = [
    {
        domain: 'agentsai.ltd',
        netlifyApp: 'agentsai.netlify.app',
        zoneId: 'b6adcdf04f179630662d4298aecd4b9e'
    },
    {
        domain: 'autotinder.ai',
        netlifyApp: 'autotinder.netlify.app',
        zoneId: '7b7e63543181732fd2a0409cd0c804f8'
    },
    {
        domain: 'detectar.ai',
        netlifyApp: 'detectar-ai-platform.netlify.app',
        zoneId: 'adf48350490c59f1845fbe48b91605cc'
    }
];

// Helper function to make Cloudflare API requests
async function cfApiRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.cloudflare.com',
            port: 443,
            path: `/client/v4${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${CF_API_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.success) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`API Error: ${JSON.stringify(parsed.errors)}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// Get zone ID for a domain
async function getZoneId(domain) {
    try {
        const response = await cfApiRequest(`/zones?name=${domain}`);
        if (response.result && response.result.length > 0) {
            return response.result[0].id;
        }
        return null;
    } catch (error) {
        console.error(`Error getting zone ID for ${domain}:`, error.message);
        return null;
    }
}

// Get all DNS records for a zone
async function getDnsRecords(zoneId) {
    try {
        const response = await cfApiRequest(`/zones/${zoneId}/dns_records`);
        return response.result || [];
    } catch (error) {
        console.error(`Error getting DNS records:`, error.message);
        return [];
    }
}

// Delete a DNS record
async function deleteDnsRecord(zoneId, recordId) {
    try {
        await cfApiRequest(`/zones/${zoneId}/dns_records/${recordId}`, 'DELETE');
        return true;
    } catch (error) {
        console.error(`Error deleting DNS record:`, error.message);
        return false;
    }
}

// Create a CNAME record pointing to Netlify
async function createNetlifyCname(zoneId, domain, netlifyApp) {
    try {
        // Create root domain CNAME (if apex CNAME is supported, otherwise use ALIAS)
        const rootRecord = {
            type: 'CNAME',
            name: '@',
            content: netlifyApp,
            ttl: 1, // Auto TTL
            proxied: false // Netlify handles SSL
        };

        await cfApiRequest(`/zones/${zoneId}/dns_records`, 'POST', rootRecord);
        console.log(`✅ Created CNAME for ${domain} -> ${netlifyApp}`);

        // Also create www subdomain
        const wwwRecord = {
            type: 'CNAME',
            name: 'www',
            content: netlifyApp,
            ttl: 1,
            proxied: false
        };

        await cfApiRequest(`/zones/${zoneId}/dns_records`, 'POST', wwwRecord);
        console.log(`✅ Created CNAME for www.${domain} -> ${netlifyApp}`);

        return true;
    } catch (error) {
        // If CNAME at root fails, try with ALIAS record
        if (error.message.includes('CNAME') && error.message.includes('root')) {
            console.log(`⚠️ CNAME at root not supported, trying alternative method...`);
            
            // Try creating A records pointing to Netlify's IP addresses
            const netlifyIPs = ['75.2.60.5', '99.83.231.61'];
            
            for (const ip of netlifyIPs) {
                const aRecord = {
                    type: 'A',
                    name: '@',
                    content: ip,
                    ttl: 1,
                    proxied: false
                };
                
                try {
                    await cfApiRequest(`/zones/${zoneId}/dns_records`, 'POST', aRecord);
                    console.log(`✅ Created A record for ${domain} -> ${ip}`);
                } catch (err) {
                    console.error(`Error creating A record: ${err.message}`);
                }
            }
        } else {
            console.error(`Error creating CNAME for ${domain}:`, error.message);
        }
        return false;
    }
}

// Main function to restore Netlify DNS
async function restoreNetlifyDNS() {
    console.log('🔧 Starting DNS restoration for Netlify domains...\n');

    for (const site of netlifyDomains) {
        console.log(`\n📍 Processing ${site.domain}...`);
        
        // Use predefined zone ID
        const zoneId = site.zoneId;
        if (!zoneId) {
            console.log(`❌ No zone ID configured for ${site.domain}`);
            continue;
        }
        
        console.log(`   Zone ID: ${zoneId}`);
        
        // Get existing DNS records
        const records = await getDnsRecords(zoneId);
        console.log(`   Found ${records.length} existing DNS records`);
        
        // Remove existing A, AAAA, and CNAME records for @ and www
        const recordsToDelete = records.filter(r => 
            (r.type === 'A' || r.type === 'AAAA' || r.type === 'CNAME') &&
            (r.name === site.domain || r.name === `www.${site.domain}`)
        );
        
        console.log(`   Removing ${recordsToDelete.length} existing records...`);
        for (const record of recordsToDelete) {
            await deleteDnsRecord(zoneId, record.id);
            console.log(`   ✅ Deleted ${record.type} record for ${record.name}`);
        }
        
        // Create new CNAME records pointing to Netlify
        console.log(`   Creating new records pointing to ${site.netlifyApp}...`);
        await createNetlifyCname(zoneId, site.domain, site.netlifyApp);
    }
    
    console.log('\n✅ DNS restoration complete!');
    console.log('\n📊 Summary:');
    console.log('   - agentsai.ltd -> agentsai.netlify.app');
    console.log('   - autotinder.ai -> autotinder.netlify.app');
    console.log('   - detectar.ai -> detectar-ai-platform.netlify.app');
    console.log('\n⚠️ Note: DNS propagation may take up to 48 hours');
    console.log('💡 You can verify the changes at: https://dash.cloudflare.com');
}

// Run the restoration
restoreNetlifyDNS().catch(console.error);