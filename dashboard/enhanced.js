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
                <div class="zones-grid">
                    ${cloudflare_zones.slice(0, 12).map(zone => `
                        <div class="zone-card ${zone.status}">
                            <div class="zone-name">${zone.name}</div>
                            <div class="zone-status">${zone.status?.toUpperCase()}</div>
                            <div class="zone-plan">${zone.plan || 'Free'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="deployment-section">
                <h3>🟦 Netlify Sites (${netlify_sites.length})</h3>
                <div class="sites-grid">
                    ${netlify_sites.map(site => `
                        <div class="site-card ${site.state}">
                            <div class="site-name">${site.name}</div>
                            <div class="site-domain">${site.custom_domain || site.url}</div>
                            <div class="site-state">${site.state?.toUpperCase()}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="deployment-section">
                <h3>📁 Monorepo Sites (${monorepo_sites.length})</h3>
                <div class="monorepo-grid">
                    ${monorepo_sites.map(site => `
                        <div class="monorepo-card">
                            <div class="site-name">${site.name}</div>
                            <div class="site-path">${site.path}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${conflicts.length > 0 ? `
                <div class="conflicts-section">
                    <h3>⚠️ Deployment Conflicts (${conflicts.length})</h3>
                    <div class="conflicts-list">
                        ${conflicts.map(conflict => `
                            <div class="conflict-item">${conflict}</div>
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

        // Auto-refresh every 5 minutes
        setInterval(() => {
            if (!this.data.isLoading) {
                this.loadAllData();
            }
        }, 5 * 60 * 1000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DomainDashboard();
});