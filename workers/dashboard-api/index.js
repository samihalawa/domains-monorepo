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
      } else if (path === '/dashboard' || path === '/dashboard/') {
        return serveDashboard();
      } else if (path === '/dashboard/enhanced.html') {
        return serveDashboard();
      } else if (path === '/') {
        return serveIndex();
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
    recommendations: [],
    debug_info: {}
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

    // Get all Netlify sites with enhanced error handling
    console.log('Attempting Netlify API call with token:', env.NETLIFY_ACCESS_TOKEN ? 'Token present' : 'Token missing');
    
    const netlifyResponse = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DomainsDashboard/1.0'
      }
    });
    
    console.log('Netlify response status:', netlifyResponse.status);
    console.log('Netlify response headers:', Object.fromEntries(netlifyResponse.headers.entries()));
    
    if (netlifyResponse.ok) {
      const netlifyData = await netlifyResponse.json();
      console.log('Netlify data received:', netlifyData.length, 'sites');
      deploymentMap.netlify_sites = netlifyData.map(site => ({
        name: site.name,
        id: site.id,
        url: site.url,
        custom_domain: site.custom_domain,
        domains: site.domains || [],
        state: site.state,
        repo_url: site.repo_url
      }));
      deploymentMap.debug_info = { 
        ...deploymentMap.debug_info,
        netlify_success: true,
        netlify_count: netlifyData.length 
      };
    } else {
      const errorText = await netlifyResponse.text();
      console.error('Netlify API failed:', netlifyResponse.status, netlifyResponse.statusText, errorText);
      deploymentMap.netlify_error = `${netlifyResponse.status}: ${errorText}`;
      deploymentMap.debug_info = { 
        ...deploymentMap.debug_info,
        netlify_error: {
          status: netlifyResponse.status,
          statusText: netlifyResponse.statusText,
          body: errorText,
          token_exists: !!env.NETLIFY_ACCESS_TOKEN
        }
      };
    }

    // Get monorepo sites from GitHub with enhanced error handling
    console.log('Attempting GitHub API call with token:', env.GITHUB_TOKEN ? 'Token present' : 'Token missing');
    
    const githubResponse = await fetch('https://api.github.com/repos/samihalawa/domains-monorepo/contents/sites', {
      headers: {
        'Authorization': `token ${env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'DomainsDashboard/1.0'
      }
    });
    
    console.log('GitHub response status:', githubResponse.status);
    console.log('GitHub response headers:', Object.fromEntries(githubResponse.headers.entries()));
    
    if (githubResponse.ok) {
      const githubData = await githubResponse.json();
      console.log('GitHub data received:', githubData.length, 'items');
      deploymentMap.monorepo_sites = githubData
        .filter(item => item.type === 'dir')
        .map(dir => ({
          name: dir.name,
          path: `/sites/${dir.name}/`,
          github_url: dir.html_url
        }));
      console.log('Filtered monorepo sites:', deploymentMap.monorepo_sites.length);
      deploymentMap.debug_info = {
        ...deploymentMap.debug_info,
        github_success: true,
        github_total_items: githubData.length,
        github_directory_count: deploymentMap.monorepo_sites.length
      };
    } else {
      const errorText = await githubResponse.text();
      console.error('GitHub API failed:', githubResponse.status, githubResponse.statusText, errorText);
      deploymentMap.debug_info = {
        ...deploymentMap.debug_info,
        github_error: {
          status: githubResponse.status,
          statusText: githubResponse.statusText,
          body: errorText,
          token_exists: !!env.GITHUB_TOKEN
        }
      };
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

    // Count active deployments from Netlify with error handling
    const netlifyResponse = await fetch('https://api.netlify.com/api/v1/sites?per_page=100', {
      headers: {
        'Authorization': `Bearer ${env.NETLIFY_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DomainsDashboard/1.0'
      }
    });

    if (netlifyResponse.ok) {
      const netlifyData = await netlifyResponse.json();
      const activeSites = netlifyData.filter(site => site.state === 'current' || site.state === 'ready');
      analysis.active_deployments += activeSites.length;
      console.log('Domain analysis - Netlify sites:', netlifyData.length, 'active:', activeSites.length);
    } else {
      const errorText = await netlifyResponse.text();
      console.error('Domain analysis - Netlify API failed:', netlifyResponse.status, errorText);
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

/**
 * Serve the dashboard HTML
 */
function serveDashboard() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎯 Domain Command Center</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0D1421 0%, #1A2332 100%);
            color: #E2E8F0;
            min-height: 100vh;
        }
        
        .dashboard-container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 16px;
        }
        
        .dashboard-header {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .dashboard-title {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #60A5FA, #34D399, #F59E0B);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 5px;
        }

        .dashboard-subtitle {
            font-size: 0.9rem;
            color: #94A3B8;
            margin-bottom: 20px;
        }

        /* Alert Bar */
        .alert-bar {
            background: linear-gradient(135deg, #DC2626, #B91C1C);
            border: 1px solid #FCA5A5;
            border-radius: 8px;
            padding: 12px 20px;
            margin-bottom: 20px;
            display: none;
            align-items: center;
            justify-content: space-between;
        }

        .alert-bar.warning {
            background: linear-gradient(135deg, #D97706, #B45309);
            border-color: #FCD34D;
        }

        .alert-bar.success {
            background: linear-gradient(135deg, #059669, #047857);
            border-color: #6EE7B7;
        }

        .alert-content {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .alert-icon {
            font-size: 1.2rem;
        }

        .alert-text {
            font-weight: 500;
        }

        .alert-actions {
            display: flex;
            gap: 8px;
        }

        .alert-btn {
            padding: 6px 12px;
            border: 1px solid rgba(255,255,255,0.3);
            background: rgba(255,255,255,0.1);
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s ease;
        }

        .alert-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        /* Search and Filters */
        .controls-bar {
            background: rgba(45, 55, 72, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
        }

        .search-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }

        .search-box {
            flex: 1;
            min-width: 300px;
            position: relative;
        }

        .search-input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 8px;
            color: #E2E8F0;
            font-size: 0.95rem;
            transition: all 0.2s ease;
        }

        .search-input:focus {
            outline: none;
            border-color: #60A5FA;
            background: rgba(30, 41, 59, 1);
        }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: #94A3B8;
            font-size: 1.1rem;
        }

        .view-toggle {
            display: flex;
            background: rgba(30, 41, 59, 0.8);
            border-radius: 6px;
            overflow: hidden;
        }

        .view-btn {
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #94A3B8;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
        }

        .view-btn.active {
            background: #60A5FA;
            color: white;
        }

        .filter-section {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .filter-label {
            font-size: 0.85rem;
            color: #94A3B8;
            font-weight: 500;
        }

        .filter-chip {
            padding: 6px 12px;
            background: rgba(30, 41, 59, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 20px;
            color: #E2E8F0;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .filter-chip:hover,
        .filter-chip.active {
            background: #60A5FA;
            color: white;
            border-color: #60A5FA;
        }

        .filter-chip.status-error { border-color: #EF4444; }
        .filter-chip.status-warning { border-color: #F59E0B; }
        .filter-chip.status-success { border-color: #10B981; }

        .bulk-actions-bar {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(30, 41, 59, 0.95);
            border: 1px solid rgba(96, 165, 250, 0.4);
            border-radius: 12px;
            padding: 12px 20px;
            display: none;
            align-items: center;
            gap: 16px;
            backdrop-filter: blur(20px);
            z-index: 1000;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .bulk-info {
            color: #60A5FA;
            font-weight: 500;
            font-size: 0.9rem;
        }

        .bulk-actions {
            display: flex;
            gap: 8px;
        }

        .bulk-btn {
            padding: 8px 16px;
            border: 1px solid rgba(96, 165, 250, 0.3);
            background: rgba(96, 165, 250, 0.1);
            color: #60A5FA;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s ease;
        }

        .bulk-btn:hover {
            background: rgba(96, 165, 250, 0.2);
            border-color: #60A5FA;
        }

        .bulk-btn.danger {
            color: #EF4444;
            border-color: rgba(239, 68, 68, 0.3);
            background: rgba(239, 68, 68, 0.1);
        }

        .bulk-btn.danger:hover {
            background: rgba(239, 68, 68, 0.2);
            border-color: #EF4444;
        }

        /* Enhanced Metrics */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .metric-card {
            background: rgba(45, 55, 72, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 12px;
            padding: 16px;
            backdrop-filter: blur(10px);
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .metric-card:hover {
            border-color: #60A5FA;
            transform: translateY(-2px);
        }

        .metric-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }

        .metric-icon {
            font-size: 1.2rem;
        }

        .metric-trend {
            font-size: 0.8rem;
            padding: 2px 6px;
            border-radius: 4px;
        }

        .metric-trend.up {
            background: rgba(16, 185, 129, 0.2);
            color: #34D399;
        }

        .metric-trend.down {
            background: rgba(239, 68, 68, 0.2);
            color: #F87171;
        }

        .metric-number {
            font-size: 1.8rem;
            font-weight: 700;
            color: #F7FAFC;
            margin-bottom: 4px;
        }

        .metric-label {
            font-size: 0.85rem;
            color: #94A3B8;
        }

        /* Enhanced Domain Grid */
        .domains-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
            gap: 16px;
        }

        .domain-card {
            background: rgba(45, 55, 72, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            transition: all 0.3s ease;
            cursor: pointer;
        }

        .domain-card:hover {
            transform: translateY(-4px);
            border-color: #60A5FA;
            box-shadow: 0 10px 30px rgba(96, 165, 250, 0.15);
        }

        .domain-card.selected {
            border-color: #60A5FA;
            background: rgba(96, 165, 250, 0.05);
        }

        .domain-card-header {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(96, 165, 250, 0.2);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
        }

        .domain-checkbox {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 18px;
            height: 18px;
            accent-color: #60A5FA;
            cursor: pointer;
            z-index: 10;
        }

        .domain-info {
            flex: 1;
            min-width: 0;
        }

        .domain-name {
            font-weight: 600;
            color: #F7FAFC;
            font-size: 1rem;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .domain-status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .domain-status-dot.healthy { background: #10B981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.4); }
        .domain-status-dot.warning { background: #F59E0B; box-shadow: 0 0 8px rgba(245, 158, 11, 0.4); }
        .domain-status-dot.error { background: #EF4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.4); }
        .domain-status-dot.inactive { background: #6B7280; }

        .domain-meta {
            font-size: 0.8rem;
            color: #94A3B8;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .domain-platform {
            padding: 2px 6px;
            background: rgba(96, 165, 250, 0.2);
            color: #60A5FA;
            border-radius: 4px;
            font-weight: 500;
        }

        .domain-metrics {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.75rem;
        }

        .metric-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .domain-preview {
            position: relative;
            height: 140px;
            overflow: hidden;
            background: #1A202C;
        }

        .domain-iframe {
            width: 100%;
            height: 100%;
            border: none;
            transition: all 0.3s ease;
        }

        .preview-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(13, 20, 33, 0.85);
            opacity: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: opacity 0.3s ease;
            z-index: 5;
        }

        .domain-card:hover .preview-overlay {
            opacity: 1;
        }

        .action-btn {
            padding: 8px 12px;
            border: 1px solid rgba(255,255,255,0.3);
            background: rgba(255,255,255,0.1);
            color: white;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .action-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-1px);
        }

        .action-btn.primary {
            background: #3B82F6;
            border-color: #3B82F6;
        }

        .action-btn.success {
            background: #10B981;
            border-color: #10B981;
        }

        .domain-footer {
            padding: 12px 16px;
            background: rgba(30, 41, 59, 0.5);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .domain-tags {
            display: flex;
            gap: 4px;
        }

        .domain-tag {
            padding: 2px 6px;
            background: rgba(96, 165, 250, 0.2);
            color: #60A5FA;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
        }

        .domain-actions {
            display: flex;
            gap: 6px;
        }

        .quick-action {
            width: 28px;
            height: 28px;
            border: 1px solid rgba(96, 165, 250, 0.3);
            background: rgba(96, 165, 250, 0.1);
            color: #60A5FA;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.85rem;
            transition: all 0.2s ease;
        }

        .quick-action:hover {
            background: rgba(96, 165, 250, 0.2);
            border-color: #60A5FA;
        }

        /* Loading States */
        .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #2D3748;
            border-left: 3px solid #60A5FA;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(13, 20, 33, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .search-section {
                flex-direction: column;
                align-items: stretch;
            }

            .search-box {
                min-width: unset;
            }

            .filter-section {
                justify-content: center;
            }

            .domains-grid {
                grid-template-columns: 1fr;
            }

            .metrics-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .dashboard-title {
                font-size: 1.6rem;
            }
        }
        
        .domains-preview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        
        .domain-preview-card {
            background: rgba(45, 55, 72, 0.8);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 12px;
            overflow: hidden;
            position: relative;
            transition: all 0.3s ease;
        }
        
        .domain-preview-card:hover {
            transform: translateY(-5px);
            border-color: #60A5FA;
            box-shadow: 0 10px 30px rgba(96, 165, 250, 0.2);
        }
        
        .domain-header {
            padding: 15px;
            border-bottom: 1px solid rgba(96, 165, 250, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .domain-name {
            font-weight: 600;
            color: #F7FAFC;
        }
        
        .domain-status {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        
        .domain-status.active { background: #065F46; color: #34D399; }
        .domain-status.ready { background: #065F46; color: #34D399; }
        .domain-status.current { background: #065F46; color: #34D399; }
        
        .domain-preview {
            position: relative;
            height: 120px;
            overflow: hidden;
        }
        
        .domain-preview iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: #1A202C;
        }
        
        .preview-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(13, 20, 33, 0.8);
            opacity: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: opacity 0.3s ease;
        }
        
        .domain-preview-card:hover .preview-overlay {
            opacity: 1;
        }
        
        .visit-btn, .manage-btn, .deploy-btn, .edit-btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .visit-btn {
            background: #3B82F6;
            color: white;
        }
        
        .manage-btn, .edit-btn {
            background: #6B7280;
            color: white;
        }
        
        .deploy-btn {
            background: #10B981;
            color: white;
        }
        
        .domain-info {
            padding: 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .platform-badge, .plan-badge {
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 500;
            background: #374151;
            color: #9CA3AF;
        }
        
        .ssl-status {
            color: #34D399;
            font-size: 0.75rem;
        }
        
        .controls-section {
            background: rgba(45, 55, 72, 0.6);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .controls-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        
        .control-btn {
            padding: 12px 20px;
            border: 1px solid rgba(96, 165, 250, 0.3);
            background: rgba(96, 165, 250, 0.1);
            color: #60A5FA;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-weight: 500;
        }
        
        .control-btn:hover {
            background: rgba(96, 165, 250, 0.2);
            border-color: #60A5FA;
        }
        
        .alert {
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .alert.loading {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            color: #60A5FA;
        }
        
        .alert.success {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            color: #34D399;
        }
        
        .alert.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #F87171;
        }
        
        .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-left: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .deployment-section, .analysis-section {
            margin-bottom: 40px;
        }
        
        .deployment-section h3, .analysis-section h3 {
            color: #F7FAFC;
            font-size: 1.5rem;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .categories-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }
        
        .category-card {
            background: rgba(45, 55, 72, 0.6);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 8px;
            padding: 20px;
        }
        
        .category-card h4 {
            color: #60A5FA;
            margin-bottom: 15px;
        }
        
        .domains-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .domain-tag {
            background: rgba(96, 165, 250, 0.2);
            color: #60A5FA;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
        }
        
        .more-count {
            color: #9CA3AF;
            font-size: 0.75rem;
        }
        
        .tld-stats {
            display: flex;
            flex-wrap: wrap;
            gap: 15px;
        }
        
        .tld-stat {
            background: rgba(45, 55, 72, 0.6);
            border: 1px solid rgba(96, 165, 250, 0.3);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .tld {
            display: block;
            font-weight: 600;
            color: #F7FAFC;
            margin-bottom: 5px;
        }
        
        .count {
            font-size: 1.25rem;
            font-weight: bold;
            color: #60A5FA;
        }
        
        @media (max-width: 768px) {
            .domains-preview-grid {
                grid-template-columns: 1fr;
            }
            
            .controls-grid {
                grid-template-columns: 1fr;
            }
            
            .dashboard-title {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <!-- Header -->
        <div class="dashboard-header">
            <h1 class="dashboard-title">🎯 Domain Command Center</h1>
            <p class="dashboard-subtitle">Intelligent monitoring and management across all platforms</p>
        </div>
        
        <!-- Alert Bar -->
        <div id="alertBar" class="alert-bar">
            <div class="alert-content">
                <span class="alert-icon">🚨</span>
                <span class="alert-text" id="alertText">System check in progress...</span>
            </div>
            <div class="alert-actions">
                <button class="alert-btn" id="alertAction">View Details</button>
                <button class="alert-btn" id="dismissAlert">Dismiss</button>
            </div>
        </div>

        <!-- Search and Filters -->
        <div class="controls-bar">
            <div class="search-section">
                <div class="search-box">
                    <span class="search-icon">🔍</span>
                    <input type="text" id="searchInput" class="search-input" placeholder="Search domains by name, category, or keyword...">
                </div>
                <div class="view-toggle">
                    <button class="view-btn active" data-view="grid">Grid</button>
                    <button class="view-btn" data-view="list">List</button>
                    <button class="view-btn" data-view="analytics">Analytics</button>
                </div>
            </div>
            
            <div class="filter-section">
                <div class="filter-group">
                    <span class="filter-label">Status:</span>
                    <div class="filter-chip active" data-filter="status" data-value="all">All</div>
                    <div class="filter-chip status-success" data-filter="status" data-value="healthy">Healthy</div>
                    <div class="filter-chip status-warning" data-filter="status" data-value="warning">Warning</div>
                    <div class="filter-chip status-error" data-filter="status" data-value="error">Issues</div>
                </div>
                
                <div class="filter-group">
                    <span class="filter-label">Platform:</span>
                    <div class="filter-chip active" data-filter="platform" data-value="all">All</div>
                    <div class="filter-chip" data-filter="platform" data-value="cloudflare">Cloudflare</div>
                    <div class="filter-chip" data-filter="platform" data-value="netlify">Netlify</div>
                    <div class="filter-chip" data-filter="platform" data-value="worker">Workers</div>
                </div>
                
                <div class="filter-group">
                    <span class="filter-label">Category:</span>
                    <div class="filter-chip active" data-filter="category" data-value="all">All</div>
                    <div class="filter-chip" data-filter="category" data-value="ai">AI</div>
                    <div class="filter-chip" data-filter="category" data-value="crypto">Crypto</div>
                    <div class="filter-chip" data-filter="category" data-value="fintech">Fintech</div>
                </div>
            </div>
        </div>

        <!-- Enhanced Metrics -->
        <div class="metrics-grid">
            <div class="metric-card" data-metric="total">
                <div class="metric-header">
                    <span class="metric-icon">🌐</span>
                    <span class="metric-trend up" id="totalTrend">↗ 12%</span>
                </div>
                <div class="metric-number" id="totalDomains">-</div>
                <div class="metric-label">Total Domains</div>
            </div>
            
            <div class="metric-card" data-metric="healthy">
                <div class="metric-header">
                    <span class="metric-icon">✅</span>
                    <span class="metric-trend up" id="healthyTrend">↗ 5%</span>
                </div>
                <div class="metric-number" id="healthyDomains">-</div>
                <div class="metric-label">Healthy</div>
            </div>
            
            <div class="metric-card" data-metric="issues">
                <div class="metric-header">
                    <span class="metric-icon">⚠️</span>
                    <span class="metric-trend down" id="issuesTrend">↘ 8%</span>
                </div>
                <div class="metric-number" id="issuesDomains">-</div>
                <div class="metric-label">Need Attention</div>
            </div>
            
            <div class="metric-card" data-metric="performance">
                <div class="metric-header">
                    <span class="metric-icon">⚡</span>
                    <span class="metric-trend up" id="perfTrend">↗ 15%</span>
                </div>
                <div class="metric-number" id="avgPerformance">-</div>
                <div class="metric-label">Avg Load Time</div>
            </div>
            
            <div class="metric-card" data-metric="deployments">
                <div class="metric-header">
                    <span class="metric-icon">🚀</span>
                    <span class="metric-trend up" id="deployTrend">↗ 3</span>
                </div>
                <div class="metric-number" id="pendingDeployments">-</div>
                <div class="metric-label">Pending Deploys</div>
            </div>
        </div>

        <!-- Domain Grid -->
        <div id="domainsContainer" class="domains-grid">
            <div class="loading-overlay">
                <div class="loading-spinner"></div>
            </div>
        </div>

        <!-- Bulk Actions Bar -->
        <div id="bulkActionsBar" class="bulk-actions-bar">
            <div class="bulk-info">
                <span id="selectedCount">0</span> domains selected
            </div>
            <div class="bulk-actions">
                <button class="bulk-btn" id="bulkDeploy">🚀 Deploy</button>
                <button class="bulk-btn" id="bulkExport">📊 Export</button>
                <button class="bulk-btn" id="bulkHealthCheck">🔍 Check Status</button>
                <button class="bulk-btn danger" id="bulkDelete">🗑️ Remove</button>
            </div>
        </div>
    </div>
    
    <script>
alert('JavaScript is working!');
console.log('🚀 Dashboard script starting...');

class EnhancedDomainDashboard {
    constructor() {
        console.log('🏗️  Dashboard constructor started');
        this.config = {
            apiWorker: window.location.origin,
            endpoints: {
                deploymentMap: '/api/deployment-map',
                domainAnalysis: '/api/domain-analysis',
                health: '/api/health'
            }
        };
        
        this.data = {
            deploymentMap: null,
            domainAnalysis: null,
            allDomains: [],
            filteredDomains: [],
            selectedDomains: new Set(),
            isLoading: false,
            lastUpdate: null
        };
        
        this.filters = {
            search: '',
            status: 'all',
            platform: 'all',
            category: 'all'
        };
        
        console.log('📝 Dashboard configuration ready, calling init()');
        this.init();
    }

    async init() {
        console.log('🎯 Initializing Enhanced Domain Command Center');
        this.setupEventListeners();
        await this.loadAllData();
        this.processData();
        this.renderDashboard();
        this.checkHealthStatus();
    }

    async loadAllData() {
        console.log('📊 Starting data load...');
        this.data.isLoading = true;
        this.showLoadingState();

        try {
            console.log('🔄 Making API calls...');
            const [deploymentMap, domainAnalysis] = await Promise.all([
                this.fetchAPI(this.config.endpoints.deploymentMap),
                this.fetchAPI(this.config.endpoints.domainAnalysis)
            ]);

            console.log('📨 API responses received');
            console.log('   - Deployment map:', deploymentMap);
            console.log('   - Domain analysis:', domainAnalysis);

            this.data.deploymentMap = deploymentMap.data;
            this.data.domainAnalysis = domainAnalysis.data;
            this.data.lastUpdate = new Date();
            
            console.log('✅ Data loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load dashboard data:', error);
            this.showAlert('error', 'Failed to load data: ' + error.message);
        } finally {
            this.data.isLoading = false;
            console.log('🏁 Loading complete');
        }
    }

    async fetchAPI(endpoint) {
        const response = await fetch(this.config.apiWorker + endpoint);
        if (!response.ok) {
            throw new Error('API error: ' + response.status);
        }
        return await response.json();
    }

    processData() {
        if (!this.data.deploymentMap || !this.data.domainAnalysis) return;

        this.data.allDomains = [];

        // Process Cloudflare zones
        this.data.deploymentMap.cloudflare_zones.forEach(zone => {
            this.data.allDomains.push({
                name: zone.name,
                platform: 'cloudflare',
                status: this.getHealthStatus(zone),
                url: 'https://' + zone.name,
                category: this.getDomainCategory(zone.name),
                metrics: {
                    ssl: true,
                    plan: zone.plan || 'Free'
                },
                rawData: zone
            });
        });

        // Process Netlify sites
        this.data.deploymentMap.netlify_sites.forEach(site => {
            this.data.allDomains.push({
                name: site.custom_domain || site.name,
                platform: 'netlify',
                status: this.getHealthStatus(site),
                url: site.url,
                category: this.getDomainCategory(site.custom_domain || site.name),
                metrics: {
                    ssl: true,
                    state: site.state
                },
                rawData: site
            });
        });

        // Process Monorepo sites
        this.data.deploymentMap.monorepo_sites.forEach(site => {
            this.data.allDomains.push({
                name: site.name,
                platform: 'worker',
                status: 'healthy',
                url: 'https://' + site.name + '.com',
                category: this.getDomainCategory(site.name),
                metrics: {
                    ssl: true,
                    path: site.path
                },
                rawData: site
            });
        });

        this.applyFilters();
    }

    getHealthStatus(domain) {
        if (domain.status === 'active' || domain.state === 'current' || domain.state === 'ready') return 'healthy';
        if (domain.status === 'pending' || domain.state === 'building') return 'warning';
        return 'error';
    }

    getDomainCategory(name) {
        if (!name) return 'other';
        const lowerName = name.toLowerCase();
        if (lowerName.includes('ai') || lowerName.includes('gpt') || lowerName.includes('agents')) return 'ai';
        if (lowerName.includes('crypto') || lowerName.includes('coin')) return 'crypto';
        if (lowerName.includes('fintech') || lowerName.includes('pay') || lowerName.includes('card')) return 'fintech';
        return 'other';
    }

    applyFilters() {
        this.data.filteredDomains = this.data.allDomains.filter(domain => {
            if (this.filters.search && !domain.name.toLowerCase().includes(this.filters.search.toLowerCase())) {
                return false;
            }
            if (this.filters.status !== 'all' && domain.status !== this.filters.status) {
                return false;
            }
            if (this.filters.platform !== 'all' && domain.platform !== this.filters.platform) {
                return false;
            }
            if (this.filters.category !== 'all' && domain.category !== this.filters.category) {
                return false;
            }
            return true;
        });
        
        this.renderDomainGrid();
    }

    renderDashboard() {
        this.renderMetrics();
        this.renderDomainGrid();
    }

    renderMetrics() {
        if (!this.data.allDomains.length) return;

        const totalDomains = this.data.allDomains.length;
        const healthyDomains = this.data.allDomains.filter(d => d.status === 'healthy').length;
        const issuesDomains = this.data.allDomains.filter(d => d.status === 'error').length;
        const warningDomains = this.data.allDomains.filter(d => d.status === 'warning').length;

        document.getElementById('totalDomains').textContent = totalDomains;
        document.getElementById('healthyDomains').textContent = healthyDomains;
        document.getElementById('issuesDomains').textContent = issuesDomains + warningDomains;
        document.getElementById('avgPerformance').textContent = '1.2s';
        document.getElementById('pendingDeployments').textContent = warningDomains;
    }

    renderDomainGrid() {
        const container = document.getElementById('domainsContainer');
        if (!this.data.filteredDomains.length) {
            container.innerHTML = '<div class="loading-overlay"><p>No domains match your filters</p></div>';
            return;
        }

        let html = '';
        this.data.filteredDomains.forEach(domain => {
            const isSelected = this.data.selectedDomains.has(domain.name);
            html += this.createDomainCard(domain, isSelected);
        });

        container.innerHTML = html;
    }

    createDomainCard(domain, isSelected) {
        const statusClass = domain.status === 'healthy' ? 'healthy' : domain.status === 'warning' ? 'warning' : 'error';
        
        return '<div class="domain-card ' + (isSelected ? 'selected' : '') + '" data-domain="' + domain.name + '">' +
            '<div class="domain-card-header">' +
                '<input type="checkbox" class="domain-checkbox" data-domain="' + domain.name + '" ' + (isSelected ? 'checked' : '') + '>' +
                '<div class="domain-info">' +
                    '<div class="domain-name">' +
                        '<span class="domain-status-dot ' + statusClass + '"></span>' +
                        domain.name +
                    '</div>' +
                    '<div class="domain-meta">' +
                        '<span class="domain-platform">' + domain.platform.toUpperCase() + '</span>' +
                        '<div class="domain-metrics">' +
                            '<span class="metric-item">⚡ 1.2s</span>' +
                            '<span class="metric-item">📈 99.9%</span>' +
                            (domain.metrics.ssl ? '<span class="metric-item">🔒 SSL</span>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="domain-preview">' +
                '<iframe class="domain-iframe" src="' + domain.url + '" loading="lazy" sandbox="allow-same-origin" onerror="this.style.display=\'none\'"></iframe>' +
                '<div class="preview-overlay">' +
                    '<a href="' + domain.url + '" target="_blank" class="action-btn primary">🔗 Visit</a>' +
                    '<button class="action-btn" onclick="window.performQuickAction(\'' + domain.name + '\', \'manage\')">⚙️ Manage</button>' +
                    '<button class="action-btn success" onclick="window.performQuickAction(\'' + domain.name + '\', \'deploy\')">🚀 Deploy</button>' +
                '</div>' +
            '</div>' +
            '<div class="domain-footer">' +
                '<div class="domain-tags">' +
                    '<span class="domain-tag">' + domain.category + '</span>' +
                    (domain.status === 'healthy' ? '<span class="domain-tag" style="background: rgba(16,185,129,0.2); color: #34D399;">Active</span>' : '') +
                '</div>' +
                '<div class="domain-actions">' +
                    '<button class="quick-action" title="Analytics">📊</button>' +
                    '<button class="quick-action" title="Settings">⚙️</button>' +
                    '<button class="quick-action" title="Deploy">🚀</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    checkHealthStatus() {
        const issuesCount = this.data.allDomains.filter(d => d.status === 'error').length;
        const warningsCount = this.data.allDomains.filter(d => d.status === 'warning').length;
        
        if (issuesCount > 0) {
            this.showAlert('error', issuesCount + ' domain' + (issuesCount > 1 ? 's' : '') + ' need immediate attention', 'Fix Issues');
        } else if (warningsCount > 0) {
            this.showAlert('warning', warningsCount + ' domain' + (warningsCount > 1 ? 's' : '') + ' have warnings', 'Review');
        } else {
            this.showAlert('success', 'All domains are healthy and operational', 'View Details');
        }
    }

    showAlert(type, message, actionText) {
        const alertBar = document.getElementById('alertBar');
        const alertText = document.getElementById('alertText');
        const alertAction = document.getElementById('alertAction');
        
        alertBar.className = 'alert-bar ' + type;
        alertBar.style.display = 'flex';
        alertText.textContent = message;
        if (actionText) alertAction.textContent = actionText;

        if (type === 'success') {
            setTimeout(() => {
                alertBar.style.display = 'none';
            }, 5000);
        }
    }

    showLoadingState() {
        const container = document.getElementById('domainsContainer');
        container.innerHTML = '<div class="loading-overlay"><div class="loading-spinner"></div></div>';
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-chip')) {
                const filterType = e.target.dataset.filter;
                const filterValue = e.target.dataset.value;
                
                document.querySelectorAll('[data-filter="' + filterType + '"]').forEach(chip => {
                    chip.classList.remove('active');
                });
                e.target.classList.add('active');
                
                this.filters[filterType] = filterValue;
                this.applyFilters();
            }
            
            if (e.target.classList.contains('domain-checkbox')) {
                const domainName = e.target.dataset.domain;
                if (e.target.checked) {
                    this.data.selectedDomains.add(domainName);
                } else {
                    this.data.selectedDomains.delete(domainName);
                }
            }
        });
    }
}

window.performQuickAction = function(domainName, action) {
    console.log('Performing ' + action + ' on ' + domainName);
    if (window.dashboard) {
        window.dashboard.showAlert('success', action + ' action performed on ' + domainName);
    }
};

console.log('🚀 Dashboard script loaded');

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOM loaded, initializing dashboard');
    try {
        window.dashboard = new EnhancedDomainDashboard();
        console.log('✅ Dashboard initialized successfully');
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
    }
});
    </script>
</body>
</html>`;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      ...CORS_HEADERS
    }
  });
}


/**
 * Serve a simple index page
 */
function serveIndex() {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Domains Dashboard API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #0D1421; color: #E2E8F0; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #60A5FA; }
        .links { margin: 30px 0; }
        .links a { display: block; margin: 10px 0; color: #60A5FA; text-decoration: none; }
        .links a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 Domains Dashboard API</h1>
        <p>Intelligent domain detection and management system</p>
        
        <div class="links">
            <a href="/dashboard">📊 Access Dashboard</a>
            <a href="/api/health">🔍 API Health Check</a>
            <a href="/api/deployment-map">🗺️ Deployment Map</a>
            <a href="/api/domain-analysis">📊 Domain Analysis</a>
        </div>
        
        <p><small>Powered by Cloudflare Workers</small></p>
    </div>
</body>
</html>`;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      ...CORS_HEADERS
    }
  });
}