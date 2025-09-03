# 🔌 API Documentation - Domains Monorepo

## Overview

The Domains Monorepo provides three main APIs through Cloudflare Workers:

1. **Router API** - Domain routing and management
2. **Dashboard API** - Analytics and monitoring
3. **Payments API** - SumUp payment processing

---

## Router Worker API

**Base URL**: `https://[any-mapped-domain]/` or `https://domains-router.workers.dev/`

### Endpoints

#### 🟢 Health Check
Verify service status and availability.

```http
GET /health
```

**Response** (200 OK):
```json
{
  "ok": true,
  "service": "domains-monorepo"
}
```

---

#### 📍 DNS Management

##### Ensure DNS Records
Create or verify DNS records for a domain.

```http
POST /dns/ensure
Content-Type: application/json

{
  "domain": "example.com",
  "apexIp": "192.0.2.1",  // optional, default: "192.0.2.1"
  "proxied": true          // optional, default: true
}
```

**Response** (200 OK):
```json
{
  "domain": "example.com",
  "created": {
    "apex": true,
    "www": true
  }
}
```

**Error Response** (400/500):
```json
{
  "error": "missing_domain" | "ensure_failed",
  "message": "Error details"
}
```

##### Get DNS Details
Retrieve DNS configuration for a domain.

```http
GET /dns/get?domain=example.com
```

**Response** (200 OK):
```json
{
  "domain": "example.com",
  "zoneId": "abc123...",
  "apex": {
    "type": "A",
    "name": "example.com",
    "content": "192.0.2.1",
    "proxied": true
  },
  "www": {
    "type": "CNAME",
    "name": "www.example.com",
    "content": "example.com",
    "proxied": true
  }
}
```

---

#### 🔄 CORS Proxy
Proxy requests to external APIs with CORS headers.

```http
GET|POST|PUT|DELETE /cors?url=https://api.example.com/data
```

**Headers Added**:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Max-Age: 86400`

**Example**:
```javascript
// Frontend code
const response = await fetch('https://yourdomain.com/cors?url=https://api.github.com/user', {
  headers: {
    'Authorization': 'token YOUR_TOKEN'
  }
});
const data = await response.json();
```

---

#### ↪️ Redirect Service
Programmatic redirects with custom status codes.

```http
GET /redirect?url=https://target.com&code=301
```

**Parameters**:
- `url` (required) - Target URL
- `code` (optional) - HTTP status code (301, 302, 307, 308). Default: 302

---

#### 📊 Domain Status Check
Get status of all monitored domains.

```http
GET /api/domains/status
```

**Response** (200 OK):
```json
{
  "success": true,
  "domains": [
    {
      "domain": "gptcoins.com",
      "status": "online",
      "statusCode": 200
    },
    {
      "domain": "damecoins.com",
      "status": "error",
      "statusCode": 503
    },
    {
      "domain": "detectar.ai",
      "status": "offline",
      "statusCode": 0
    }
  ],
  "timestamp": "2024-12-19T12:00:00Z"
}
```

**Status Types**:
- `online` - Domain responding with 200
- `error` - Domain responding with non-200 status
- `offline` - Domain not responding
- `timeout` - Request timeout after 5 seconds

---

## Dashboard API

**Base URL**: `https://domains-dashboard-api.trigox.workers.dev/`

### Endpoints

#### 📈 Analytics Overview
```http
GET /api/analytics
```

**Response**:
```json
{
  "totalDomains": 32,
  "activeDomains": 24,
  "totalRequests": 1234567,
  "uniqueVisitors": 98765,
  "bandwidthGB": 456.78,
  "cacheHitRate": 0.92
}
```

#### 🔍 Domain Analytics
```http
GET /api/analytics/domain?name=gptcoins.com&period=7d
```

**Parameters**:
- `name` - Domain name
- `period` - Time period (1d, 7d, 30d, 90d)

**Response**:
```json
{
  "domain": "gptcoins.com",
  "period": "7d",
  "requests": 45678,
  "uniqueVisitors": 3456,
  "bandwidth": 12.34,
  "topPaths": [
    { "path": "/", "requests": 23456 },
    { "path": "/api", "requests": 12345 }
  ],
  "statusCodes": {
    "200": 44000,
    "404": 1000,
    "500": 678
  }
}
```

---

## Payments API (SumUp)

**Base URL**: `https://payments-sumup.workers.dev/`

### Endpoints

#### 💳 Create Checkout
Initialize a payment checkout session.

```http
POST /api/checkout
Content-Type: application/json

{
  "amount": 99.99,
  "currency": "EUR",
  "description": "Premium Domain Package",
  "email": "customer@example.com",
  "redirect_url": "https://yourdomain.com/success"
}
```

**Response** (200 OK):
```json
{
  "checkoutId": "chk_123abc...",
  "checkoutUrl": "https://checkout.sumup.com/...",
  "expiresAt": "2024-12-19T13:00:00Z"
}
```

#### ✅ Verify Payment
Confirm payment completion.

```http
GET /api/payment/verify?checkoutId=chk_123abc
```

**Response**:
```json
{
  "status": "PAID",
  "amount": 99.99,
  "currency": "EUR",
  "paidAt": "2024-12-19T12:30:00Z",
  "transactionId": "txn_456def..."
}
```

#### 🔔 Webhook Handler
Receive payment notifications from SumUp.

```http
POST /api/webhook
Content-Type: application/json
X-Sumup-Signature: [signature]

{
  "event": "checkout.completed",
  "checkoutId": "chk_123abc",
  "status": "PAID",
  "amount": 99.99
}
```

**Response** (200 OK):
```json
{
  "received": true
}
```

---

## Authentication

### API Token
For protected endpoints, include your API token:

```http
Authorization: Bearer YOUR_API_TOKEN
```

### Setting Secrets
```bash
# Set Cloudflare API token
wrangler secret put CF_API_TOKEN

# Set SumUp credentials
wrangler secret put SUMUP_API_KEY
wrangler secret put SUMUP_MERCHANT_ID
```

---

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|------------|---------|
| `/health` | 100/min | 1 minute |
| `/dns/*` | 10/min | 1 minute |
| `/cors` | 100/min | 1 minute |
| `/api/domains/status` | 10/min | 1 minute |
| `/api/checkout` | 20/min | 1 minute |

Exceeded limits return:
```json
{
  "error": "rate_limit_exceeded",
  "retryAfter": 60
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    // Optional additional context
  }
}
```

### Common Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `missing_domain` | Domain parameter required | 400 |
| `invalid_domain` | Domain format invalid | 400 |
| `zone_not_found` | Domain not in Cloudflare | 404 |
| `ensure_failed` | DNS operation failed | 500 |
| `cors_failed` | Proxy request failed | 500 |
| `rate_limit_exceeded` | Too many requests | 429 |

---

## SDKs & Examples

### JavaScript/TypeScript
```javascript
class DomainsAPI {
  constructor(baseURL = 'https://yourdomain.com') {
    this.baseURL = baseURL;
  }

  async checkHealth() {
    const res = await fetch(`${this.baseURL}/health`);
    return res.json();
  }

  async getDomainStatus() {
    const res = await fetch(`${this.baseURL}/api/domains/status`);
    return res.json();
  }

  async ensureDNS(domain, apexIp = '192.0.2.1') {
    const res = await fetch(`${this.baseURL}/dns/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, apexIp, proxied: true })
    });
    return res.json();
  }

  async proxyRequest(targetURL) {
    const res = await fetch(`${this.baseURL}/cors?url=${encodeURIComponent(targetURL)}`);
    return res.json();
  }
}

// Usage
const api = new DomainsAPI();
const status = await api.getDomainStatus();
console.log(`${status.domains.length} domains monitored`);
```

### cURL Examples
```bash
# Health check
curl https://yourdomain.com/health

# Get domain DNS
curl "https://yourdomain.com/dns/get?domain=example.com"

# Ensure DNS records
curl -X POST https://yourdomain.com/dns/ensure \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com"}'

# Proxy API request
curl "https://yourdomain.com/cors?url=https://api.github.com/user" \
  -H "Authorization: token YOUR_TOKEN"

# Domain status
curl https://yourdomain.com/api/domains/status
```

### Python
```python
import requests

class DomainsAPI:
    def __init__(self, base_url='https://yourdomain.com'):
        self.base_url = base_url
        self.session = requests.Session()
    
    def check_health(self):
        return self.session.get(f'{self.base_url}/health').json()
    
    def get_domain_status(self):
        return self.session.get(f'{self.base_url}/api/domains/status').json()
    
    def ensure_dns(self, domain, apex_ip='192.0.2.1'):
        return self.session.post(
            f'{self.base_url}/dns/ensure',
            json={'domain': domain, 'apexIp': apex_ip, 'proxied': True}
        ).json()
    
    def proxy_request(self, target_url):
        return self.session.get(
            f'{self.base_url}/cors',
            params={'url': target_url}
        ).json()

# Usage
api = DomainsAPI()
status = api.get_domain_status()
print(f"{len(status['domains'])} domains monitored")
```

---

## Testing

### Postman Collection
Import this collection for testing:

```json
{
  "info": {
    "name": "Domains Monorepo API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/health"
      }
    },
    {
      "name": "Domain Status",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/domains/status"
      }
    },
    {
      "name": "Ensure DNS",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/dns/ensure",
        "body": {
          "mode": "raw",
          "raw": "{\"domain\":\"example.com\"}"
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://yourdomain.com"
    }
  ]
}
```

---

## Support & Resources

- **Documentation**: [INDEX.md](../INDEX.md)
- **Architecture**: [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Deployment**: [DEPLOYMENT-MAP.md](../DEPLOYMENT-MAP.md)
- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

*Last updated: December 2024*