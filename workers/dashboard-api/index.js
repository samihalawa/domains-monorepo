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
 * Validate environment variables
 */
function validateEnv(env) {
  const required = ['CLOUDFLARE_API_TOKEN', 'NETLIFY_ACCESS_TOKEN', 'GITHUB_TOKEN'];
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}