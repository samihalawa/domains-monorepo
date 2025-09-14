// Domain Manager - API-driven, no client tokens or mocks
class DomainManager {
  constructor() {
    // Smart API endpoint detection
    const guessLocal = (location.host.includes('8090') || location.hostname === 'localhost') ? 'http://localhost:8787' : '';
    this.API_BASE = window.API_BASE || guessLocal || '';
    this.domains = [];
    this.routingMap = {};
    this.loading = false;
    this.error = null;
    this.selected = null;
    this.filteredDomains = [];
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.providerFilter = 'all';
    this.selectedDomains = new Set();
    this.performanceMetrics = {};
    
    // Initialize connection status
    this.updateConnectionStatus('Initializing...');
    
    // Setup event listeners for search and filter
    this.setupFilters();
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  api(path) { return (this.API_BASE || '') + path; }
  
  updateConnectionStatus(status, isError = false) {
    const el = document.getElementById('connection-status');
    if (el) {
      el.textContent = status;
      el.style.color = isError ? 'var(--accent-red)' : 'var(--accent-green)';
    }
  }

  // Fetch unified domains from worker with better error handling
  async fetchAllDomains() {
    this.loading = true; 
    this.error = null;
    this.updateConnectionStatus('Loading domains...');
    
    try {
      // Try primary API endpoint first
      let res = await fetch(this.api('/api/dashboard/domains'), {
        timeout: 10000,
        headers: { 'Accept': 'application/json' }
      });
      
      // Fallback to domains endpoint if dashboard fails
      if (!res.ok && res.status !== 404) {
        res = await fetch(this.api('/api/domains'), {
          timeout: 10000,
          headers: { 'Accept': 'application/json' }
        });
      }
      
      if (!res.ok) {
        throw new Error(`API returned ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      const rawDomains = data.domains || data.data || data.payload || data || [];
      
      this.domains = rawDomains.map(d => ({
        id: d.name || d.domain || d.id,
        name: d.name || d.domain || d.id,
        provider: this.normalizeProvider(d.platform || d.provider || 'Unknown'),
        status: this.normalizeStatus(d.status),
        url: d.url || d.site_url || `https://${d.name || d.domain}`,
        value: d.value || 'medium',
        industry: d.industry || d.category || '-',
        created: d.created_at || d.created || null,
        updated: d.updated_at || d.modified || null,
      })).filter(d => d.name); // Remove invalid entries
      
      this.domains.sort((a,b) => a.name.localeCompare(b.name));
      this.updateConnectionStatus(`${this.domains.length} domains loaded`);
      return this.domains;
      
    } catch (e) { 
      this.error = e.message; 
      this.updateConnectionStatus(`Error: ${e.message}`, true);
      console.error('Failed to fetch domains:', e);
      return [];
    } finally { 
      this.loading = false; 
    }
  }
  
  normalizeProvider(provider) {
    const p = (provider || '').toLowerCase();
    if (p.includes('cloudflare')) return 'Cloudflare';
    if (p.includes('netlify')) return 'Netlify';
    if (p.includes('vercel')) return 'Vercel';
    if (p.includes('github')) return 'GitHub Pages';
    return provider || 'Unknown';
  }
  
  normalizeStatus(status) {
    const s = (status || '').toLowerCase();
    if (s === 'live' || s === 'active' || s === 'deployed') return 'Active';
    if (s === 'pending' || s === 'building') return 'Pending';
    if (s === 'failed' || s === 'error') return 'Error';
    return status || 'Unknown';
  }

  async fetchRoutingMap() {
    try {
      const res = await fetch(this.api('/api/router/map'));
      const data = await res.json();
      this.routingMap = data.domains || {};
    } catch (_) { this.routingMap = {}; }
  }

  // Stats
  getStatistics() {
    return {
      total: this.domains.length,
      active: this.domains.filter(d => (d.status||'').toLowerCase() === 'active').length,
      inactive: this.domains.filter(d => (d.status||'').toLowerCase() !== 'active').length,
      cloudflare: this.domains.filter(d => (d.provider||'').toLowerCase().includes('cloudflare')).length,
      netlify: this.domains.filter(d => (d.provider||'').toLowerCase().includes('netlify')).length,
    };
  }

  // UI rendering for new mail-style layout
  renderDomainList(containerId = 'domain-list') {
    const el = document.getElementById(containerId); 
    if (!el) return;
    
    if (this.loading) { 
      el.innerHTML = this.renderSkeletonLoading();
      return; 
    }
    
    if (this.error) { 
      el.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--accent-red);">
        <div style="margin-bottom: 12px;">⚠️ ${this.error}</div>
        <button class="btn btn-primary" onclick="domainManager.fetchAndRender()">Retry</button>
      </div>`; 
      return; 
    }
    
    const domainsToRender = this.filteredDomains.length > 0 ? this.filteredDomains : this.domains;
    
    if (!domainsToRender.length) {
      const message = this.searchQuery || this.statusFilter !== 'all' || this.providerFilter !== 'all' 
        ? 'No domains match your filters' 
        : 'No domains found';
      el.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-secondary);">${message}</div>`;
      return;
    }
    
    el.innerHTML = domainsToRender.map(d => `
      <div class="domain-item ${this.selected && this.selected.name === d.name ? 'selected' : ''}" 
           data-name="${d.name}" 
           onclick="domainManager.selectDomain('${d.name}')"
           oncontextmenu="domainManager.showContextMenu(event, '${d.name}')">
        <div class="domain-name">${d.name}</div>
        <div class="domain-meta">
          <span class="pill pill-${this.getStatusClass(d.status)}">${d.status}</span> 
          <span class="muted">${d.provider}</span>
        </div>
      </div>
    `).join('');
  }
  
  getStatusClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'active') return 'active';
    if (s === 'pending') return 'pending';
    if (s === 'error' || s === 'failed') return 'inactive';
    return 'pending';
  }
  
  renderSkeletonLoading() {
    return Array.from({ length: 8 }, (_, i) => 
      `<div class="skeleton skeleton-domain"></div>`
    ).join('');
  }
  
  setupFilters() {
    // Wait for DOM to be ready
    const setupWhenReady = () => {
      const searchInput = document.getElementById('domain-search');
      const statusFilter = document.getElementById('status-filter');
      const providerFilter = document.getElementById('provider-filter');
      
      if (!searchInput) {
        setTimeout(setupWhenReady, 100);
        return;
      }
      
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.applyFilters();
      });
      
      statusFilter.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.applyFilters();
      });
      
      providerFilter.addEventListener('change', (e) => {
        this.providerFilter = e.target.value;
        this.applyFilters();
      });
    };
    
    setupWhenReady();
  }
  
  applyFilters() {
    this.filteredDomains = this.domains.filter(domain => {
      const matchesSearch = !this.searchQuery || 
        domain.name.toLowerCase().includes(this.searchQuery) ||
        (domain.industry && domain.industry.toLowerCase().includes(this.searchQuery));
      
      const matchesStatus = this.statusFilter === 'all' || 
        this.getStatusClass(domain.status) === this.statusFilter;
      
      const matchesProvider = this.providerFilter === 'all' || 
        domain.provider.toLowerCase().includes(this.providerFilter);
      
      return matchesSearch && matchesStatus && matchesProvider;
    });
    
    this.renderDomainList();
  }
  
  navigateDomains(direction) {
    const domainsToRender = this.filteredDomains.length > 0 ? this.filteredDomains : this.domains;
    if (!domainsToRender.length) return;
    
    let currentIndex = -1;
    if (this.selected) {
      currentIndex = domainsToRender.findIndex(d => d.name === this.selected.name);
    }
    
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < domainsToRender.length) {
      this.selectDomain(domainsToRender[nextIndex].name);
    } else if (nextIndex < 0) {
      this.selectDomain(domainsToRender[domainsToRender.length - 1].name);
    } else {
      this.selectDomain(domainsToRender[0].name);
    }
  }
  
  startPerformanceMonitoring() {
    // Monitor API response times
    setInterval(async () => {
      const start = performance.now();
      try {
        const response = await fetch(this.api('/health'));
        const end = performance.now();
        
        this.performanceMetrics.apiLatency = end - start;
        this.performanceMetrics.apiStatus = response.ok ? 'healthy' : 'degraded';
        
        if (response.ok) {
          this.updateConnectionStatus(`API: ${Math.round(this.performanceMetrics.apiLatency)}ms`);
        } else {
          this.updateConnectionStatus('API: Degraded', true);
        }
      } catch (e) {
        this.performanceMetrics.apiStatus = 'down';
        this.updateConnectionStatus('API: Offline', true);
      }
    }, 15000); // Check every 15 seconds
  }
  
  bulkAction(action) {
    const selected = Array.from(this.selectedDomains);
    if (selected.length === 0) return;
    
    switch (action) {
      case 'admin':
        selected.forEach(domainName => this.openAdmin(domainName));
        break;
      case 'refresh':
        this.updateConnectionStatus('Refreshing selected domains...');
        // Refresh logic here
        setTimeout(() => this.fetchAndRender(), 500);
        break;
    }
  }
  
  clearSelection() {
    this.selectedDomains.clear();
    this.updateBulkActions();
    // Update visual selection
    document.querySelectorAll('.domain-item.selected').forEach(el => {
      if (!el.classList.contains('current')) {
        el.classList.remove('selected');
      }
    });
  }
  
  updateBulkActions() {
    const bulkActions = document.getElementById('bulk-actions');
    const count = this.selectedDomains.size;
    
    if (count > 0) {
      bulkActions.style.display = 'flex';
      bulkActions.querySelector('.bulk-count').textContent = `${count} selected`;
    } else {
      bulkActions.style.display = 'none';
    }
  }
  
  showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px;">${this.getNotificationTitle(type)}</div>
      <div style="font-size: 13px; color: var(--text-secondary);">${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Auto-dismiss
    setTimeout(() => {
      notification.classList.add('dismissing');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
    
    // Click to dismiss
    notification.addEventListener('click', () => {
      notification.classList.add('dismissing');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    });
  }
  
  getNotificationTitle(type) {
    switch (type) {
      case 'success': return '✅ Success';
      case 'error': return '❌ Error';
      case 'warning': return '⚠️ Warning';
      case 'info': default: return 'ℹ️ Info';
    }
  }
  
  startHealthMonitoring() {
    // Check domain health every 2 minutes
    setInterval(() => {
      if (this.selected) {
        this.checkDomainHealth(this.selected.name);
      }
    }, 120000);
  }
  
  async checkDomainHealth(domain) {
    try {
      const start = performance.now();
      const response = await fetch(`https://${domain}`, { 
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      const responseTime = performance.now() - start;
      
      // Update analytics if this is the selected domain
      if (this.selected && this.selected.name === domain) {
        this.updateDomainAnalytics(domain, {
          responseTime: responseTime,
          status: 'online',
          ssl: true // Assume HTTPS worked if no error
        });
      }
      
    } catch (e) {
      if (this.selected && this.selected.name === domain) {
        this.updateDomainAnalytics(domain, {
          responseTime: null,
          status: 'offline',
          ssl: false
        });
      }
    }
  }
  
  updateDomainAnalytics(domain, metrics) {
    // Update the analytics panel if it exists
    const uptimeStat = document.getElementById('uptime-stat');
    const responseStat = document.getElementById('response-stat');
    const sslStat = document.getElementById('ssl-stat');
    
    if (uptimeStat) {
      uptimeStat.textContent = metrics.status === 'online' ? '✅ Online' : '❌ Offline';
      uptimeStat.style.color = metrics.status === 'online' ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    
    if (responseStat && metrics.responseTime) {
      responseStat.textContent = `${Math.round(metrics.responseTime)}ms`;
      const color = metrics.responseTime < 1000 ? 'var(--accent-green)' : 
                   metrics.responseTime < 3000 ? 'var(--accent-yellow)' : 'var(--accent-red)';
      responseStat.style.color = color;
    } else if (responseStat) {
      responseStat.textContent = 'Timeout';
      responseStat.style.color = 'var(--accent-red)';
    }
    
    if (sslStat) {
      sslStat.textContent = metrics.ssl ? '✅ Valid' : '❌ Invalid';
      sslStat.style.color = metrics.ssl ? 'var(--accent-green)' : 'var(--accent-red)';
    }
    
    // Update chart if it exists
    this.updateDomainChart(domain, metrics);
  }
  
  updateDomainChart(domain, metrics) {
    const canvas = document.getElementById('domain-chart');
    if (!canvas) return;
    
    // Create or update chart
    if (!this.domainChart) {
      this.initializeDomainChart();
    }
    
    if (this.domainChart && metrics.responseTime) {
      // Add new data point (keep last 10)
      const data = this.domainChart.data.datasets[0].data;
      data.push(metrics.responseTime);
      if (data.length > 10) data.shift();
      
      // Update labels
      const labels = this.domainChart.data.labels;
      const now = new Date();
      labels.push(now.toLocaleTimeString());
      if (labels.length > 10) labels.shift();
      
      this.domainChart.update('none');
    }
  }
  
  initializeDomainChart() {
    const canvas = document.getElementById('domain-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    this.domainChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Response Time',
          data: [],
          borderColor: 'var(--accent-blue)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { display: false },
          y: {
            display: false,
            beginAtZero: true
          }
        },
        elements: {
          point: { radius: 0 }
        },
        interaction: {
          intersect: false
        }
      }
    });
  }
  
  exportData() {
    const exportData = {
      timestamp: new Date().toISOString(),
      domains: this.domains,
      routingMap: this.routingMap,
      performanceMetrics: this.performanceMetrics,
      totalDomains: this.domains.length,
      activeCount: this.domains.filter(d => this.getStatusClass(d.status) === 'active').length
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `domains-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.showNotification('Domain data exported successfully', 'success');
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.showNotification('Entered fullscreen mode', 'info', 2000);
      }).catch(e => {
        this.showNotification('Could not enter fullscreen', 'warning');
      });
    } else {
      document.exitFullscreen().then(() => {
        this.showNotification('Exited fullscreen mode', 'info', 2000);
      });
    }
  }
  
  showContextMenu(event, domainName) {
    event.preventDefault();
    event.stopPropagation();
    
    this.contextDomain = domainName;
    const menu = document.getElementById('context-menu');
    if (!menu) return;
    
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';
    
    // Close on click outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.style.display = 'none';
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }
  
  contextAction(action) {
    const domain = this.domains.find(d => d.name === this.contextDomain);
    if (!domain) return;
    
    const menu = document.getElementById('context-menu');
    if (menu) menu.style.display = 'none';
    
    switch (action) {
      case 'select':
        this.selectDomain(domain.name);
        break;
      case 'admin':
        this.openAdmin(domain.name);
        break;
      case 'open':
        window.open(domain.url, '_blank');
        break;
      case 'copy':
        navigator.clipboard.writeText(domain.url).then(() => {
          this.showNotification(`Copied ${domain.url}`, 'success', 2000);
        }).catch(() => {
          this.showNotification('Failed to copy URL', 'error');
        });
        break;
      case 'health':
        this.checkDomainHealth(domain.name);
        this.showNotification(`Checking health for ${domain.name}`, 'info', 2000);
        break;
    }
  }

  async renderDetail(containerId = 'detail') {
    const el = document.getElementById(containerId); 
    if (!el) return;
    
    const d = this.selected; 
    if (!d) { 
      el.innerHTML = '<div class="empty">Select a domain to view details</div>'; 
      return; 
    }
    
    // Show loading state
    el.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="detail-title">${d.name}</div>
          <div class="detail-sub"><span class="pill pill-${this.getStatusClass(d.status)}">${d.status}</span> <span class="muted">${d.provider}</span></div>
        </div>
        <div class="actions">
          <button class="btn" onclick="domainManager.openAdmin('${d.name}')">Admin Panel</button> 
          <a class="btn" target="_blank" href="${d.url}">Open Site</a>
        </div>
      </div>
      <div class="detail-body">
        <div class="detail-left">
          <div class="panel">
            <div class="panel-title">Preview</div>
            <div class="panel-content">
              <iframe class="preview-frame" src="${d.url}" loading="lazy"></iframe>
            </div>
          </div>
        </div>
        <div class="detail-right">
          <div class="panel">
            <div class="panel-title">DNS Records</div>
            <div class="panel-content">
              <div class="loading-spinner" style="margin: 20px auto;"></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">Blog Posts</div>
            <div class="panel-content">
              <div class="loading-spinner" style="margin: 20px auto;"></div>
            </div>
          </div>
          <div class="panel">
            <div class="panel-title">Analytics</div>
            <div class="panel-content">
              <canvas id="domain-chart" width="100" height="60" style="max-height: 120px;"></canvas>
              <div class="analytics-stats" style="margin-top: 12px;">
                <div class="stat-row"><span class="stat-label">Uptime:</span> <span class="stat-value" id="uptime-stat">Checking...</span></div>
                <div class="stat-row"><span class="stat-label">Response:</span> <span class="stat-value" id="response-stat">Checking...</span></div>
                <div class="stat-row"><span class="stat-label">SSL:</span> <span class="stat-value" id="ssl-stat">Checking...</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Load data asynchronously
    this.loadDetailData(d);
    
    // Initialize chart and check health
    setTimeout(() => {
      this.initializeDomainChart();
      this.checkDomainHealth(d.name);
    }, 100);
  }
  
  async loadDetailData(domain) {
    try {
      const [dns, posts, routing] = await Promise.all([
        this.fetchDnsRecords(domain.name),
        this.fetchBlogPosts(domain.name),
        this.fetchRoutingInfo(domain.name)
      ]);
      
      // Update DNS section
      this.updateDnsSection(domain, dns);
      
      // Update blog posts section  
      this.updateBlogSection(domain, posts);
      
      // Update routing info in header
      this.updateRoutingInfo(domain, routing);
      
    } catch (e) {
      console.error('Failed to load detail data:', e);
    }
  }
  
  async fetchDnsRecords(domain) {
    try {
      const res = await fetch(this.api(`/dns/get?domain=${encodeURIComponent(domain)}`));
      return res.ok ? await res.json() : { records: [] };
    } catch {
      return { records: [] };
    }
  }
  
  async fetchBlogPosts(domain) {
    try {
      const res = await fetch(this.api(`/api/blog/posts?domain=${encodeURIComponent(domain)}`));
      const data = res.ok ? await res.json() : { posts: [] };
      return data.posts || [];
    } catch {
      return [];
    }
  }
  
  async fetchRoutingInfo(domain) {
    try {
      if (!this.routingMap || Object.keys(this.routingMap).length === 0) {
        await this.fetchRoutingMap();
      }
      return this.routingMap[domain] || this.routingMap[`www.${domain}`] || 'Direct';
    } catch {
      return 'Unknown';
    }
  }
  
  updateDnsSection(domain, dns) {
    const dnsPanel = document.querySelector('.detail-right .panel:first-child .panel-content');
    if (!dnsPanel) return;
    
    const records = (dns.records || []).slice(0, 8);
    const recordsHtml = records.length ? 
      records.map(r => `
        <div class="dns-row">
          <code>${r.type}</code> <code>${r.name}</code> → <code>${r.content}</code> 
          ${r.proxied ? '<span class="muted">proxied</span>' : ''}
        </div>
      `).join('') : 
      '<div class="muted" style="text-align: center; padding: 20px;">No DNS records found</div>';
    
    dnsPanel.innerHTML = `
      <div class="dns-list">${recordsHtml}</div>
      <div class="form-row">
        <input id="ensure-target" placeholder="Target (e.g. my-app.pages.dev)" />
        <button class="btn btn-primary" onclick="domainManager.ensureDns('${domain.name}')">Set CNAME</button>
      </div>
    `;
  }
  
  updateBlogSection(domain, posts) {
    const blogPanel = document.querySelector('.detail-right .panel:last-child .panel-content');
    if (!blogPanel) return;
    
    const postsList = (posts || []).slice(0, 5);
    const postsHtml = postsList.length ?
      postsList.map(p => `
        <div class="post-row">
          <div class="post-title">${p.title || p.Name || 'Untitled'}</div>
          <div class="muted">${p.slug || p.id || ''}</div>
        </div>
      `).join('') :
      '<div class="muted" style="text-align: center; padding: 20px;">No blog posts found</div>';
    
    blogPanel.innerHTML = `
      ${postsHtml}
      <div class="form-row">
        <button class="btn btn-primary" onclick="domainManager.triggerBlogGenerate('${domain.name}')">Generate Content</button>
        <button class="btn" onclick="domainManager.manageBlog('${domain.name}')">Manage Blog</button>
      </div>
    `;
  }
  
  updateRoutingInfo(domain, routing) {
    const routingSpan = document.querySelector('.detail-sub');
    if (routingSpan && routing !== 'Direct') {
      const existingRouting = routingSpan.querySelector('.routing-info');
      if (existingRouting) {
        existingRouting.remove();
      }
      routingSpan.insertAdjacentHTML('beforeend', `<span class="muted routing-info">→ <strong>${routing}</strong></span>`);
    }
  }

  async ensureDns(domain) {
    const targetInput = document.getElementById('ensure-target');
    const target = (targetInput || {}).value || '';
    
    if (!target.trim()) { 
      alert('Please enter a target hostname (e.g. my-app.pages.dev)'); 
      return; 
    }
    
    // Validate target format
    if (!this.isValidHostname(target)) {
      alert('Invalid hostname format. Please enter a valid domain or subdomain.');
      return;
    }
    
    try {
      this.updateConnectionStatus('Updating DNS records...');
      
      const response = await fetch(this.api('/dns/ensure'), { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          domain: domain, 
          target: target.trim(), 
          proxied: true 
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) { 
        throw new Error(result.message || result.error || `HTTP ${response.status}`);
      }
      
      this.showNotification(`DNS records updated for ${domain}`, 'success');
      this.updateConnectionStatus('DNS records updated successfully');
      
      // Clear the input and refresh the DNS section
      if (targetInput) targetInput.value = '';
      
      // Refresh DNS records after a short delay
      setTimeout(() => {
        if (this.selected) {
          this.fetchDnsRecords(this.selected.name).then(dns => {
            this.updateDnsSection(this.selected, dns);
          });
        }
      }, 1500);
      
    } catch (e) { 
      this.updateConnectionStatus(`DNS update failed: ${e.message}`, true);
      console.error('DNS update error:', e);
    }
  }
  
  isValidHostname(hostname) {
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?([.][a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    return hostnameRegex.test(hostname) && hostname.length <= 253;
  }

  async triggerBlogGenerate(domain) {
    try { 
      this.updateConnectionStatus('Generating content...');
      const r = await fetch(this.api('/api/blog/generate'), { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain })
      }); 
      const j = await r.json(); 
      
      if (r.ok) {
        this.showNotification('Blog content generation started successfully', 'success');
        this.updateConnectionStatus('Content generated successfully');
        // Refresh blog posts after generation
        setTimeout(() => this.loadDetailData(this.selected), 2000);
      } else {
        this.showNotification(`Content generation failed: ${j.message || 'Unknown error'}`, 'error');
        this.updateConnectionStatus(`Generation failed: ${j.message || 'Unknown error'}`, true);
      }
      
    } catch (e) { 
      this.showNotification('Failed to generate blog content', 'error');
      this.updateConnectionStatus('Generation failed', true);
      console.error('Blog generation error:', e);
    }
  }
  
  manageBlog(domain) {
    const d = this.domains.find(x => x.name === domain);
    if (!d) return;
    
    // Open blog management interface (could be a modal or external tool)
    const blogUrl = `${d.url}/blog`;
    window.open(blogUrl, '_blank');
  }

  selectDomain(name) { this.selected = this.domains.find(x=>x.name===name)||null; this.renderDetail(); }

  openAdmin(name) {
    const d = this.domains.find(x => x.name === name); 
    if (!d) return;
    
    const frame = document.getElementById('admin-frame'); 
    const modal = document.getElementById('admin-modal');
    const modalTitle = document.getElementById('modal-title');
    
    let url = d.url;
    let title = `${d.name} - Admin Panel`;
    
    // Smart admin URL detection based on provider
    const provider = (d.provider || '').toLowerCase();
    
    if (provider.includes('netlify')) {
      // Extract site ID from URL or use domain name
      const siteId = this.extractNetlifySiteId(d);
      if (siteId) {
        url = `https://app.netlify.com/sites/${siteId}/overview`;
        title = `${d.name} - Netlify Admin`;
      } else {
        url = 'https://app.netlify.com/teams';
        title = `${d.name} - Netlify Dashboard`;
      }
    } else if (provider.includes('cloudflare')) {
      // Cloudflare dashboard for the domain
      url = `https://dash.cloudflare.com/?to=/:account/domains/overview`;
      title = `${d.name} - Cloudflare Dashboard`;
    } else if (provider.includes('vercel')) {
      url = 'https://vercel.com/dashboard';
      title = `${d.name} - Vercel Dashboard`;
    } else if (provider.includes('github')) {
      url = `https://github.com/settings/pages`;
      title = `${d.name} - GitHub Pages`;
    }
    
    modalTitle.textContent = title;
    frame.src = url;
    modal.classList.add('open');
    
    // Track admin panel opens
    console.log(`Opening admin panel for ${d.name}: ${url}`);
  }
  
  extractNetlifySiteId(domain) {
    // Try to extract site ID from various sources
    if (domain.url && domain.url.includes('.netlify.app')) {
      const matches = domain.url.match(/https:\/\/([^.]+)\.netlify\.app/);
      return matches ? matches[1] : null;
    }
    // Could add more extraction methods here
    return null;
  }
  
  closeAdmin() { 
    const modal = document.getElementById('admin-modal'); 
    const frame = document.getElementById('admin-frame'); 
    frame.src = 'about:blank'; 
    modal.classList.remove('open'); 
  }

  async fetchAndRender() { await Promise.all([this.fetchRoutingMap(), this.fetchAllDomains()]); this.renderDomainList('domain-list'); if (!this.selected && this.domains[0]) this.selectDomain(this.domains[0].name); this.renderStats(); }

  renderStats() {
    const s = this.getStatistics();
    const set = (k,v)=>{ const el=document.querySelector(`[data-stat=\"${k}\"]`); if (el) el.textContent = v; };
    set('total-domains', s.total); set('active-domains', s.active); set('cloudflare-domains', s.cloudflare); set('netlify-domains', s.netlify);
  }

  async initialize() { await this.fetchAndRender(); }

  // Number formatting
  formatTraffic(bytes) { if (bytes===0) return '0'; if (bytes<1e3) return `${bytes}`; if (bytes<1e6) return `${(bytes/1e3).toFixed(1)}K`; if (bytes<1e9) return `${(bytes/1e6).toFixed(1)}M`; return `${(bytes/1e9).toFixed(1)}G`; }
}

// Initialize domain manager
const domainManager = new DomainManager();
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { domainManager.initialize(); });
} else {
  domainManager.initialize();
}

