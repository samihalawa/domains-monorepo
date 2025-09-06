#!/usr/bin/env node

/**
 * Simple Domain Deployment Script
 * Adds a domain to the monorepo and updates configuration
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECTS_DATA_PATH = path.join(__dirname, '..', 'projects-data.json');
const SITES_DIR = path.join(__dirname, '..', 'sites');

function deployDomain(domainName, options = {}) {
  const {
    platform = 'cloudflare',
    industry = 'General',
    value = 'medium',
    status = 'pending'
  } = options;

  console.log(`🚀 Deploying ${domainName}...`);

  try {
    // 1. Read existing projects data
    let projectsData = {};
    if (fs.existsSync(PROJECTS_DATA_PATH)) {
      projectsData = JSON.parse(fs.readFileSync(PROJECTS_DATA_PATH, 'utf8'));
    }

    // 2. Initialize structure if needed
    if (!projectsData.domains) {
      projectsData.domains = {
        monorepo_sites: [],
        premium_deployed: [],
        down: []
      };
    }

    // 3. Add domain to appropriate section
    const domainEntry = {
      domain: domainName,
      status,
      platform,
      industry,
      value,
      url: `https://${domainName}`,
      folder: `/sites/${domainName.replace(/\./g, '-')}/`,
      deployedAt: new Date().toISOString()
    };

    if (platform === 'cloudflare') {
      projectsData.domains.monorepo_sites.push(domainEntry);
    } else {
      projectsData.domains.premium_deployed.push(domainEntry);
    }

    // 4. Update statistics
    if (!projectsData.statistics) {
      projectsData.statistics = {};
    }
    projectsData.statistics.total_domains = (projectsData.statistics.total_domains || 0) + 1;
    projectsData.statistics.last_deployment = new Date().toISOString();

    // 5. Create basic site directory structure
    const sitePath = path.join(SITES_DIR, domainName.replace(/\./g, '-'));
    if (!fs.existsSync(sitePath)) {
      fs.mkdirSync(sitePath, { recursive: true });
      
      // Create basic index.html
      const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${domainName}</title>
    <style>
        body { font-family: system-ui; padding: 40px; text-align: center; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #1e293b; margin-bottom: 20px; }
        p { color: #64748b; line-height: 1.6; }
        .status { background: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌐 ${domainName}</h1>
        <div class="status">Site Deployed Successfully</div>
        <p>This domain has been successfully added to the monorepo system.</p>
        <p><strong>Industry:</strong> ${industry}</p>
        <p><strong>Platform:</strong> ${platform}</p>
        <p><strong>Deployed:</strong> ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>`;

      fs.writeFileSync(path.join(sitePath, 'index.html'), indexHtml);
      console.log(`✅ Created site directory: ${sitePath}`);
    }

    // 6. Write updated projects data
    fs.writeFileSync(PROJECTS_DATA_PATH, JSON.stringify(projectsData, null, 2));
    
    console.log(`✅ ${domainName} deployed successfully!`);
    console.log(`📊 Total domains: ${projectsData.statistics.total_domains}`);
    console.log(`🔗 Access at: https://${domainName}`);
    
    return {
      success: true,
      domain: domainName,
      sitePath,
      totalDomains: projectsData.statistics.total_domains
    };

  } catch (error) {
    console.error(`❌ Error deploying ${domainName}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node deploy-domain.js <domain> [options]

Examples:
  node deploy-domain.js example.com
  node deploy-domain.js newsite.ai --industry="AI Platform" --value="high"

Options:
  --platform=<cloudflare|deployed>  (default: cloudflare)
  --industry=<string>                (default: General)
  --value=<low|medium|high|ultra-high> (default: medium)
  --status=<pending|live|down>       (default: pending)
    `);
    process.exit(1);
  }

  const domain = args[0];
  const options = {};

  // Parse options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    }
  });

  const result = deployDomain(domain, options);
  
  if (!result.success) {
    process.exit(1);
  }
}

module.exports = { deployDomain };
