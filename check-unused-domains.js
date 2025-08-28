#!/usr/bin/env node

/**
 * Check if domains are actually unused by testing HTTP responses
 */

const https = require('https');

const unusedDomains = [
    "adsator.com", "allnicenails.com", "apilord.com", "aprendiendogpt.com", "arbitrox.com", 
    "automedical.ai", "awscheaper.com", "bizumpay.net", "btcshidai.com", "buyfbgroups.com",
    "calendarvirus.com", "cashouter.com", "chinototal.com", "crearwebgpt.com", "creatupropiacriptomoneda.com",
    "cryptoadiccion.com", "cryptojuridical.com", "currencybyip.com", "cursochinoonline.com", "cursoexocad.com",
    "damehosting.com", "damesender.com", "damestaff.com", "dametranslate.com", "desktoping.com",
    "dominaae.com", "easecoins.com", "easylista.com", "econonews.co.uk", "exocadcourse.com",
    "geair.es", "gptabsolute.com", "gptaddicts.com", "gptautoweb.com", "gptenespanol.com",
    "gpthard.com", "gptmundo.com", "gptplugindatabase.com", "gptpowerpoint.com", "gptvenezuela.com",
    "gptveteran.com", "gptwild.com", "hispanoinfo.com", "hkpaymentprocessor.com", "hollesa.com",
    "housemoney.es", "hsktotal.com", "iaexpertos.es", "imprimirgpt.com", "indosy.com",
    "learnexocad.com", "leccionesgpt.com", "lessonsia.com", "libreriagpt.com", "losmegacursos.com",
    "maccado.com", "maximagpt.com", "megawebs.com", "ministerio.ai", "mubago.com",
    "octbot.ai", "paymentimes.com", "viogenia.es"
];

function checkDomain(domain) {
    return new Promise((resolve) => {
        const options = {
            hostname: domain,
            port: 443,
            path: '/',
            method: 'HEAD',
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DomainChecker/1.0)'
            }
        };

        const req = https.request(options, (res) => {
            resolve({
                domain: domain,
                status: res.statusCode,
                hasContent: res.statusCode === 200,
                location: res.headers.location || null
            });
        });

        req.on('error', () => {
            resolve({
                domain: domain,
                status: 'ERROR',
                hasContent: false,
                location: null
            });
        });

        req.on('timeout', () => {
            resolve({
                domain: domain,
                status: 'TIMEOUT',
                hasContent: false,
                location: null
            });
        });

        req.end();
    });
}

async function checkAllDomains() {
    console.log('🔍 Checking which domains are actually unused...\n');
    
    const actuallyUnused = [];
    const hasContent = [];
    
    // Check domains in batches to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < unusedDomains.length; i += batchSize) {
        const batch = unusedDomains.slice(i, i + batchSize);
        console.log(`📡 Checking batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(unusedDomains.length/batchSize)}...`);
        
        const promises = batch.map(domain => checkDomain(domain));
        const results = await Promise.all(promises);
        
        results.forEach(result => {
            if (result.hasContent) {
                hasContent.push(result);
                console.log(`   ✅ ${result.domain} - HAS CONTENT (${result.status})`);
            } else {
                actuallyUnused.push(result);
                console.log(`   ❌ ${result.domain} - NO CONTENT (${result.status})`);
            }
        });
        
        // Small delay between batches
        if (i + batchSize < unusedDomains.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   - Domains checked: ${unusedDomains.length}`);
    console.log(`   - Actually have content: ${hasContent.length}`);
    console.log(`   - Actually unused/available: ${actuallyUnused.length}`);
    
    if (hasContent.length > 0) {
        console.log(`\n⚠️  DOMAINS THAT ALREADY HAVE WEBSITES:`);
        hasContent.forEach(domain => {
            console.log(`   - ${domain.domain} (${domain.status})`);
        });
    }
    
    if (actuallyUnused.length > 0) {
        console.log(`\n🚀 TRULY UNUSED DOMAINS (Available for websites):`);
        const trulyUnused = actuallyUnused.map(d => d.domain);
        actuallyUnused.forEach(domain => {
            console.log(`   - ${domain.domain} (${domain.status})`);
        });
        
        console.log(`\n🎯 TRULY UNUSED DOMAINS LIST:`);
        console.log(JSON.stringify(trulyUnused, null, 2));
    }
}

checkAllDomains();