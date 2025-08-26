#!/usr/bin/env node

/**
 * Comprehensive domain verification script
 * Checks which domains point to Netlify vs Cloudflare Pages
 */

const https = require('https');
const dns = require('dns').promises;

// Domain configurations
const domainConfigs = {
    // Netlify-hosted domains
    netlify: [
        { domain: 'agentsai.ltd', expectedTarget: 'agentsai.netlify.app' },
        { domain: 'autotinder.ai', expectedTarget: 'autotinder.netlify.app' },
        { domain: 'detectar.ai', expectedTarget: 'detectar-ai-platform.netlify.app' },
        { domain: 'autorad.automedical.ai', expectedTarget: 'auto-rad.netlify.app' },
        { domain: 'pime.ai', expectedTarget: 'pime-ai.netlify.app' },
        { domain: 'samihalawa.com', expectedTarget: 'samihalawa-unified.netlify.app' },
        { domain: 'autoclient.ai', expectedTarget: 'papaya-biscotti-5572d9.netlify.app' }
    ],
    
    // Cloudflare Pages-hosted domains
    cloudflare: [
        { domain: 'damecoins.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'gptcoins.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'empleados.ai', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'instantvirtualcards.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'damepay.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'gptapikeys.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'megacursos.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'cryptoupdated.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'gpt-excel.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'autoword.ai', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'dameapi.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'flywallex.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'gateway24h.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'fintechmorning.com', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'visualingo.app', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'mcp.blue', expectedTarget: 'domains-monorepo.pages.dev' },
        { domain: 'sort.services', expectedTarget: 'domains-monorepo.pages.dev' }
    ]
};

// Check DNS CNAME record
async function checkCNAME(domain) {
    try {
        const records = await dns.resolveCname(domain);
        return records[0] || null;
    } catch (error) {
        // Try checking A records if CNAME fails
        try {
            const aRecords = await dns.resolve4(domain);
            return aRecords.length > 0 ? 'A records configured' : null;
        } catch {
            return null;
        }
    }
}

// Check HTTP response
async function checkHttpResponse(domain) {
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
                statusCode: res.statusCode,
                headers: res.headers
            });
        });

        req.on('error', () => resolve(null));
        req.on('timeout', () => {
            req.destroy();
            resolve(null);
        });

        req.end();
    });
}

// Main verification function
async function verifyAllDomains() {
    console.log('🔍 Domain Configuration Verification Report');
    console.log('=' .repeat(80));
    
    // Check Netlify domains
    console.log('\n📦 NETLIFY-HOSTED DOMAINS\n');
    console.log('Domain                          | Expected Target              | Status');
    console.log('-'.repeat(80));
    
    for (const config of domainConfigs.netlify) {
        const cname = await checkCNAME(config.domain);
        const httpResponse = await checkHttpResponse(config.domain);
        
        let status = '❌ Not Configured';
        if (cname && cname.includes('netlify')) {
            status = '✅ Correctly Configured';
        } else if (cname && cname.includes('pages.dev')) {
            status = '⚠️  WRONG - Points to Cloudflare';
        } else if (httpResponse && httpResponse.statusCode === 200) {
            status = '🔄 Responding (check config)';
        }
        
        console.log(
            `${config.domain.padEnd(30)} | ${config.expectedTarget.padEnd(28)} | ${status}`
        );
    }
    
    // Check Cloudflare Pages domains
    console.log('\n\n☁️  CLOUDFLARE PAGES DOMAINS\n');
    console.log('Domain                          | Expected Target              | Status');
    console.log('-'.repeat(80));
    
    for (const config of domainConfigs.cloudflare) {
        const cname = await checkCNAME(config.domain);
        const httpResponse = await checkHttpResponse(config.domain);
        
        let status = '❌ Not Configured';
        if (cname && cname.includes('pages.dev')) {
            status = '✅ Correctly Configured';
        } else if (cname && cname.includes('netlify')) {
            status = '⚠️  WRONG - Points to Netlify';
        } else if (httpResponse && httpResponse.statusCode === 200) {
            status = '🔄 Responding (check config)';
        }
        
        console.log(
            `${config.domain.padEnd(30)} | ${config.expectedTarget.padEnd(28)} | ${status}`
        );
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY');
    console.log('   - Netlify domains: ' + domainConfigs.netlify.length);
    console.log('   - Cloudflare Pages domains: ' + domainConfigs.cloudflare.length);
    console.log('   - Total domains managed: ' + (domainConfigs.netlify.length + domainConfigs.cloudflare.length));
    console.log('\n💡 Note: DNS changes may take up to 48 hours to propagate globally');
    console.log('🔧 To fix incorrect configurations, use the restore-netlify-dns.js script');
}

// Run verification
console.log('Starting domain verification...\n');
verifyAllDomains().catch(console.error);