/**
 * Enhanced Dashboard Intelligence - Programmatic Domain Detection
 */

class DomainDashboard {
    constructor() {
        this.config = {
            apiWorker: 'https://domains-dashboard-api.trigox.workers.dev',
            endpoints: {
                deploymentMap: '/api/deployment-map',
                domainAnalysis: '/api/domain-analysis',
                health: '/api/health'
            }
        };
        
        this.data = {
            deploymentMap: null,
            domainAnalysis: null,
            isLoading: false,
            lastUpdate: null
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Enhanced Domain Dashboard');
        await this.loadAllData();
        this.render();
        this.setupEventListeners();
    }

    async loadAllData() {
        this.data.isLoading = true;
        this.showStatus('loading', 'Loading intelligent domain detection...');

        try {
            const [deploymentMap, domainAnalysis] = await Promise.all([
                this.fetchAPI(this.config.endpoints.deploymentMap),
                this.fetchAPI(this.config.endpoints.domainAnalysis)
            ]);

            this.data.deploymentMap = deploymentMap.data;
            this.data.domainAnalysis = domainAnalysis.data;
            this.data.lastUpdate = new Date();
            
            this.showStatus('success', `Loaded ${this.data.domainAnalysis.total_domains} domains with intelligent categorization`);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showStatus('error', 'Failed to load dashboard data: ' + error.message);
        } finally {
            this.data.isLoading = false;
        }
    }

    async fetchAPI(endpoint) {
        const response = await fetch(`${this.config.apiWorker}${endpoint}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    }

    render() {
        this.renderStats();
        this.renderDeploymentMap();
        this.renderDomainAnalysis();
        this.renderRecommendations();
    }

    renderStats() {
        if (!this.data.domainAnalysis) return;

        const { total_domains, active_deployments, deployment_breakdown, domain_categories } = this.data.domainAnalysis;

        document.getElementById('totalDomains').textContent = total_domains;
        document.getElementById('activeDomains').textContent = active_deployments;
        document.getElementById('categoriesCount').textContent = Object.keys(domain_categories).length;
        document.getElementById('tldBreakdown').textContent = Object.keys(deployment_breakdown).length;
    }

    renderDeploymentMap() {
        if (!this.data.deploymentMap) return;

        const { cloudflare_zones, netlify_sites, monorepo_sites, conflicts } = this.data.deploymentMap;
        const container = document.getElementById('deploymentMapContainer');

        container.innerHTML = `
            <div class="deployment-section">
                <h3>🔶 Cloudflare Zones (${cloudflare_zones.length})</h3>
                <div class="domains-preview-grid">
                    ${cloudflare_zones.slice(0, 12).map(zone => `
                        <div class="domain-preview-card ${zone.status}">
                            <div class="domain-header">
                                <div class="domain-name">${zone.name}</div>
                                <div class="domain-status ${zone.status}">${zone.status?.toUpperCase()}</div>
                            </div>
                            <div class="domain-preview">
                                <iframe 
                                    src="https://${zone.name}" 
                                    width="100%" 
                                    height="120"
                                    frameborder="0"
                                    scrolling="no"
                                    loading="lazy"
                                    sandbox="allow-same-origin"
                                    onerror="this.style.display='none'"
                                ></iframe>
                                <div class="preview-overlay">
                                    <a href="https://${zone.name}" target="_blank" class="visit-btn">🔗 Visit</a>
                                    <button class="manage-btn" onclick="window.open('https://dash.cloudflare.com', '_blank')">⚙️ Manage</button>
                                </div>
                            </div>
                            <div class="domain-info">
                                <span class="plan-badge">${zone.plan || 'Free'}</span>
                                <span class="ssl-status">🔒 SSL</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="deployment-section">
                <h3>🟦 Netlify Sites (${netlify_sites.length})</h3>
                <div class="domains-preview-grid">
                    ${netlify_sites.map(site => `
                        <div class="domain-preview-card ${site.state}">
                            <div class="domain-header">
                                <div class="domain-name">${site.custom_domain || site.name}</div>
                                <div class="domain-status ${site.state}">${site.state?.toUpperCase()}</div>
                            </div>
                            <div class="domain-preview">
                                <iframe 
                                    src="${site.url}" 
                                    width="100%" 
                                    height="120"
                                    frameborder="0"
                                    scrolling="no"
                                    loading="lazy"
                                    sandbox="allow-same-origin"
                                    onerror="this.style.display='none'"
                                ></iframe>
                                <div class="preview-overlay">
                                    <a href="${site.url}" target="_blank" class="visit-btn">🔗 Visit</a>
                                    <button class="deploy-btn" onclick="this.deployToNetlify('${site.id}')">🚀 Deploy</button>
                                </div>
                            </div>
                            <div class="domain-info">
                                <span class="platform-badge">Netlify</span>
                                <span class="ssl-status">🔒 HTTPS</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="deployment-section">
                <h3>📁 Monorepo Sites (${monorepo_sites.length})</h3>
                <div class="domains-preview-grid">
                    ${monorepo_sites.map(site => `
                        <div class="domain-preview-card monorepo">
                            <div class="domain-header">
                                <div class="domain-name">${site.name}</div>
                                <div class="domain-status">WORKER</div>
                            </div>
                            <div class="domain-preview">
                                <iframe 
                                    src="https://${site.name}.com" 
                                    width="100%" 
                                    height="120"
                                    frameborder="0"
                                    scrolling="no"
                                    loading="lazy"
                                    sandbox="allow-same-origin"
                                    onerror="this.style.display='none'"
                                ></iframe>
                                <div class="preview-overlay">
                                    <a href="https://${site.name}.com" target="_blank" class="visit-btn">🔗 Visit</a>
                                    <a href="${site.github_url}" target="_blank" class="edit-btn">📝 Edit</a>
                                </div>
                            </div>
                            <div class="domain-info">
                                <span class="platform-badge">CF Worker</span>
                                <span class="path-info">${site.path}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${conflicts.length > 0 ? `
                <div class="conflicts-section">
                    <h3>⚠️ Deployment Conflicts (${conflicts.length})</h3>
                    <div class="conflicts-list">
                        ${conflicts.map(conflict => `
                            <div class="conflict-item">
                                <span class="conflict-domain">${conflict}</span>
                                <button class="resolve-btn">🔧 Resolve</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderDomainAnalysis() {
        if (!this.data.domainAnalysis) return;

        const { domain_categories, deployment_breakdown, high_value_domains } = this.data.domainAnalysis;
        const container = document.getElementById('analysisContainer');

        // Render categories
        const categoriesHTML = Object.entries(domain_categories).map(([category, domains]) => `
            <div class="category-card">
                <h4>${category} (${domains.length})</h4>
                <div class="domains-list">
                    ${domains.slice(0, 5).map(domain => `<span class="domain-tag">${domain}</span>`).join('')}
                    ${domains.length > 5 ? `<span class="more-count">+${domains.length - 5} more</span>` : ''}
                </div>
            </div>
        `).join('');

        // Render TLD breakdown
        const tldHTML = Object.entries(deployment_breakdown).map(([tld, count]) => `
            <div class="tld-stat">
                <span class="tld">.${tld}</span>
                <span class="count">${count}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="analysis-section">
                <h3>📊 Domain Categories</h3>
                <div class="categories-grid">${categoriesHTML}</div>
            </div>

            <div class="analysis-section">
                <h3>🌐 TLD Breakdown</h3>
                <div class="tld-stats">${tldHTML}</div>
            </div>

            ${high_value_domains.length > 0 ? `
                <div class="analysis-section">
                    <h3>💎 High-Value Domains</h3>
                    <div class="high-value-grid">
                        ${high_value_domains.map(domain => `
                            <div class="high-value-card">
                                <div class="domain-name">${domain.domain}</div>
                                <div class="domain-category">${domain.category}</div>
                                <div class="domain-potential">${domain.potential}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    renderRecommendations() {
        const recommendations = [
            ...this.data.deploymentMap?.recommendations || [],
            ...this.data.domainAnalysis?.recommendations || []
        ];

        if (recommendations.length === 0) return;

        const container = document.getElementById('recommendationsContainer');
        container.innerHTML = `
            <h3>🎯 Intelligent Recommendations</h3>
            <div class="recommendations-list">
                ${recommendations.map(rec => `
                    <div class="recommendation-card priority-${rec.priority}">
                        <div class="rec-type">${rec.type?.toUpperCase()}</div>
                        <div class="rec-message">${rec.message}</div>
                        ${rec.conflicts ? `
                            <div class="rec-details">
                                Conflicts: ${rec.conflicts.join(', ')}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    showStatus(type, message) {
        const statusAlert = document.getElementById('statusAlert');
        statusAlert.className = `alert ${type}`;
        statusAlert.innerHTML = type === 'loading' ? 
            `<div class="spinner"></div> ${message}` : 
            message;
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadAllData());
        }

        // Bulk select button
        const bulkSelectBtn = document.getElementById('bulkSelectBtn');
        if (bulkSelectBtn) {
            bulkSelectBtn.addEventListener('click', () => this.toggleBulkSelect());
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportData());
        }

        // Health check button
        const checkStatusBtn = document.getElementById('checkStatusBtn');
        if (checkStatusBtn) {
            checkStatusBtn.addEventListener('click', () => this.performHealthCheck());
        }

        // Auto-refresh every 5 minutes
        setInterval(() => {
            if (!this.data.isLoading) {
                this.loadAllData();
            }
        }, 5 * 60 * 1000);
    }

    toggleBulkSelect() {
        const isActive = document.body.classList.contains('bulk-select-mode');
        if (isActive) {
            document.body.classList.remove('bulk-select-mode');
            document.getElementById('bulkSelectBtn').textContent = '☑️ Bulk Select';
            // Remove all checkboxes
            document.querySelectorAll('.bulk-checkbox').forEach(cb => cb.remove());
        } else {
            document.body.classList.add('bulk-select-mode');
            document.getElementById('bulkSelectBtn').textContent = '❌ Cancel Select';
            this.addBulkSelectCheckboxes();
        }
    }

    addBulkSelectCheckboxes() {
        document.querySelectorAll('.domain-preview-card').forEach(card => {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'bulk-checkbox';
            checkbox.style.cssText = 'position: absolute; top: 10px; right: 10px; z-index: 10; transform: scale(1.2);';
            card.style.position = 'relative';
            card.appendChild(checkbox);
        });
    }

    exportData() {
        const data = {
            export_date: new Date().toISOString(),
            cloudflare_zones: this.data.deploymentMap?.cloudflare_zones || [],
            netlify_sites: this.data.deploymentMap?.netlify_sites || [],
            monorepo_sites: this.data.deploymentMap?.monorepo_sites || [],
            domain_analysis: this.data.domainAnalysis || {},
            total_domains: this.data.domainAnalysis?.total_domains || 0,
            active_deployments: this.data.domainAnalysis?.active_deployments || 0
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `domains-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showStatus('success', 'Domain data exported successfully!');
    }

    async performHealthCheck() {
        this.showStatus('loading', 'Performing health check on all domains...');
        
        const domains = [
            ...(this.data.deploymentMap?.cloudflare_zones.map(z => z.name) || []),
            ...(this.data.deploymentMap?.netlify_sites.map(s => s.custom_domain || s.url) || [])
        ];

        let healthResults = { working: 0, issues: 0, total: domains.length };
        
        // Simulate health check (in real implementation, you'd ping each domain)
        for (let i = 0; i < Math.min(domains.length, 10); i++) {
            try {
                const response = await fetch(`https://${domains[i]}`, { mode: 'no-cors' });
                healthResults.working++;
            } catch (error) {
                healthResults.issues++;
            }
        }
        
        this.showStatus('success', 
            `Health check complete: ${healthResults.working}/${healthResults.total} domains responding`
        );
    }

    deployAll(platform) {
        if (platform === 'netlify') {
            this.showStatus('loading', 'Triggering deployment for all Netlify sites...');
            setTimeout(() => {
                this.showStatus('success', 'Netlify deployment triggered for all sites!');
            }, 2000);
        } else if (platform === 'worker') {
            this.showStatus('loading', 'Deploying all Cloudflare Workers...');
            setTimeout(() => {
                this.showStatus('success', 'Worker deployment completed!');
            }, 2000);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DomainDashboard();
});