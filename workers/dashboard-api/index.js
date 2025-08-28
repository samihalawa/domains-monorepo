/**
 * Cloudflare Worker for Domain Dashboard API Proxy
 * Handles API calls to Cloudflare, Netlify, and GitHub with authentication
 */

// Environment variables needed:
// CLOUDFLARE_API_TOKEN
// NETLIFY_ACCESS_TOKEN  
// GITHUB_TOKEN

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Route API calls
      if (path.startsWith('/api/cloudflare')) {
        return await handleCloudflareAPI(request, env);
      } else if (path.startsWith('/api/netlify')) {
        return await handleNetlifyAPI(request, env);
      } else if (path.startsWith('/api/github')) {
        return await handleGitHubAPI(request, env);
      } else if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() });
      } else if (path === '/api/deployment-map') {
        return await handleDeploymentMap(request, env);
      } else if (path === '/api/domain-analysis') {
        return await handleDomainAnalysis(request, env);
      }

      return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: error.message }, 500);
    }
  }
};

/**
 * Handle Cloudflare API requests
 */
async function handleCloudflareAPI(request, env) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/cloudflare', '');
  
  // Get all zones
  if (endpoint === '/zones') {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?per_page=100`, {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.status}`);
    }
    
    const data = await response.json();
    return jsonResponse(data);
  }

  // Get zone details
  if (endpoint.startsWith('/zones/') && endpoint.endsWith('/details')) {
    const zoneId = endpoint.split('/')[2];
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return jsonResponse(data);
  }

  return jsonResponse({ error: 'Cloudflare endpoint not found' }, 404);
}

/**
 * Handle Netlify API requests
 */
async function handleNetlifyAPI(request, env) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/netlify', '');
  
  // Get all sites
  if (endpoint === '/sites') {
    const response = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Netlify API error: ${response.status}`);
    }
    
    const data = await response.json();
    return jsonResponse(data);
  }

  // Get site details
  if (endpoint.startsWith('/sites/') && !endpoint.includes('/')) {
    const siteId = endpoint.split('/')[2];
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return jsonResponse(data);
  }

  return jsonResponse({ error: 'Netlify endpoint not found' }, 404);
}

/**
 * Handle GitHub API requests
 */
async function handleGitHubAPI(request, env) {
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/github', '');
  
  const REPO_OWNER = 'samihalawa'; // Replace with actual owner
  const REPO_NAME = 'domains-monorepo';
  
  // Get file content
  if (endpoint === '/metadata' && request.method === 'GET') {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/projects-data.json`, {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.status === 404) {
      // File doesn't exist, return empty metadata
      return jsonResponse({ domains: {} });
    }
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = JSON.parse(atob(data.content));
    return jsonResponse({ content, sha: data.sha });
  }

  // Update file content
  if (endpoint === '/metadata' && request.method === 'PUT') {
    const body = await request.json();
    const { content, message, sha } = body;
    
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/projects-data.json`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || '📊 Update domain metadata via dashboard',
        content: btoa(JSON.stringify(content, null, 2)),
        sha: sha,
        branch: 'main'
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub commit failed: ${errorData.message}`);
    }
    
    const data = await response.json();
    return jsonResponse(data);
  }

  // Get repository info
  if (endpoint === '/repo') {
    const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`, {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const data = await response.json();
    return jsonResponse(data);
  }

  return jsonResponse({ error: 'GitHub endpoint not found' }, 404);
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS
    }
  });
}

/**
 * Enhanced Deployment Detection - Dynamically map all domains
 */
async function handleDeploymentMap(request, env) {
  const deploymentMap = {
    cloudflare_zones: [],
    netlify_sites: [],
    monorepo_sites: [],
    conflicts: [],
    recommendations: []
  };

  try {
    // Get all Cloudflare zones
    const cfResponse = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (cfResponse.ok) {
      const cfData = await cfResponse.json();
      deploymentMap.cloudflare_zones = cfData.result.map(zone => ({
        name: zone.name,
        id: zone.id,
        status: zone.status,
        name_servers: zone.name_servers,
        plan: zone.plan?.name
      }));
    }

    // Get all Netlify sites
    const netlifyResponse = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (netlifyResponse.ok) {
      const netlifyData = await netlifyResponse.json();
      deploymentMap.netlify_sites = netlifyData.map(site => ({
        name: site.name,
        id: site.id,
        url: site.url,
        custom_domain: site.custom_domain,
        domains: site.domains || [],
        state: site.state,
        repo_url: site.repo_url
      }));
    }

    // Get monorepo sites from GitHub
    const githubResponse = await fetch('https://api.github.com/repos/samihalawa/domains-monorepo/contents/sites', {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (githubResponse.ok) {
      const githubData = await githubResponse.json();
      deploymentMap.monorepo_sites = githubData
        .filter(item => item.type === 'dir')
        .map(dir => ({
          name: dir.name,
          path: `/sites/${dir.name}/`,
          github_url: dir.html_url
        }));
    }

    // Detect conflicts - domains that exist in multiple places
    const netlifyDomains = new Set();
    deploymentMap.netlify_sites.forEach(site => {
      if (site.custom_domain) netlifyDomains.add(site.custom_domain);
      site.domains.forEach(domain => netlifyDomains.add(domain));
    });

    const monorepoSites = new Set(deploymentMap.monorepo_sites.map(s => s.name));
    
    deploymentMap.conflicts = Array.from(netlifyDomains).filter(domain => {
      const domainKey = domain.replace(/\.(com|ai|app|ltd|services|blue)$/, '');
      return monorepoSites.has(domainKey);
    });

    // Generate recommendations
    if (deploymentMap.conflicts.length > 0) {
      deploymentMap.recommendations.push({
        type: 'conflict_resolution',
        message: `Found ${deploymentMap.conflicts.length} conflicts between Netlify and monorepo`,
        conflicts: deploymentMap.conflicts
      });
    }

    return jsonResponse({
      success: true,
      data: deploymentMap,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({ 
      error: 'Failed to generate deployment map', 
      details: error.message 
    }, 500);
  }
}

/**
 * Advanced Domain Analysis - Comprehensive domain intelligence
 */
async function handleDomainAnalysis(request, env) {
  const analysis = {
    total_domains: 0,
    active_deployments: 0,
    deployment_breakdown: {},
    domain_categories: {},
    high_value_domains: [],
    recommendations: []
  };

  try {
    // Analyze Cloudflare zones
    const cfResponse = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (cfResponse.ok) {
      const cfData = await cfResponse.json();
      analysis.total_domains = cfData.result.length;
      
      // Categorize domains by TLD and keywords
      cfData.result.forEach(zone => {
        const domain = zone.name;
        const tld = domain.split('.').pop();
        
        // TLD analysis
        if (!analysis.deployment_breakdown[tld]) {
          analysis.deployment_breakdown[tld] = 0;
        }
        analysis.deployment_breakdown[tld]++;

        // Keyword categorization
        if (domain.includes('ai')) {
          if (!analysis.domain_categories['AI']) analysis.domain_categories['AI'] = [];
          analysis.domain_categories['AI'].push(domain);
        }
        if (domain.includes('crypto') || domain.includes('coin')) {
          if (!analysis.domain_categories['Crypto']) analysis.domain_categories['Crypto'] = [];
          analysis.domain_categories['Crypto'].push(domain);
        }
        if (domain.includes('gpt') || domain.includes('ai')) {
          if (!analysis.domain_categories['GPT/AI']) analysis.domain_categories['GPT/AI'] = [];
          analysis.domain_categories['GPT/AI'].push(domain);
        }
        if (domain.includes('fintech') || domain.includes('payment') || domain.includes('wallet')) {
          if (!analysis.domain_categories['Fintech']) analysis.domain_categories['Fintech'] = [];
          analysis.domain_categories['Fintech'].push(domain);
        }

        // High-value domain detection
        const highValueKeywords = ['medical', 'autorad', 'pime', 'bank', 'executive', 'minister'];
        if (highValueKeywords.some(keyword => domain.includes(keyword))) {
          analysis.high_value_domains.push({
            domain: domain,
            category: 'High Value',
            potential: 'Premium'
          });
        }
      });
    }

    // Count active deployments from Netlify
    const netlifyResponse = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (netlifyResponse.ok) {
      const netlifyData = await netlifyResponse.json();
      analysis.active_deployments += netlifyData.filter(site => site.state === 'ready').length;
    }

    // Generate intelligent recommendations
    analysis.recommendations = [
      {
        type: 'optimization',
        priority: 'high',
        message: `You have ${analysis.total_domains} total domains with ${analysis.active_deployments} active deployments`
      },
      {
        type: 'category_focus',
        priority: 'medium',
        message: `Strongest categories: ${Object.keys(analysis.domain_categories).join(', ')}`
      }
    ];

    if (analysis.high_value_domains.length > 0) {
      analysis.recommendations.push({
        type: 'premium_opportunity',
        priority: 'high',
        message: `${analysis.high_value_domains.length} high-value domains detected for premium development`
      });
    }

    return jsonResponse({
      success: true,
      data: analysis,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    return jsonResponse({
      error: 'Failed to analyze domains',
      details: error.message
    }, 500);
  }
}

/**
 * Validate environment variables
 */
function validateEnv(env) {
  const required = ['CLOUDFLARE_API_TOKEN', 'NETLIFY_ACCESS_TOKEN', 'GITHUB_TOKEN'];
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}