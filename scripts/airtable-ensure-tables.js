#!/usr/bin/env node

/**
 * Ensure Airtable Autoblog tables exist using Metadata API.
 * Requires env AIRTABLE_TOKEN and AIRTABLE_BASE.
 */
const https = require('https');

const TOKEN = process.env.AIRTABLE_TOKEN;
const BASE = process.env.AIRTABLE_BASE;

if (!TOKEN || !BASE) {
  console.error('Missing env: AIRTABLE_TOKEN or AIRTABLE_BASE');
  process.exit(1);
}

function apiRequest(method, path, body) {
  const options = {
    hostname: 'api.airtable.com',
    path,
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(data)); } catch { resolve({}); }
        } else {
          reject(new Error(`${method} ${path} => ${res.statusCode} ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function listTables() {
  return apiRequest('GET', `/v0/meta/bases/${BASE}/tables`);
}

async function createTable(def) {
  return apiRequest('POST', `/v0/meta/bases/${BASE}/tables`, { tables: [def] });
}

function field(name, type, opts = {}) {
  const f = { name, type };
  if (type === 'singleSelect' && opts.choices) {
    f.options = { choices: opts.choices.map(n => ({ name: n })) };
  }
  return f;
}

async function ensureTables() {
  const needed = {
    Blogs: {
      name: 'Blogs',
      fields: [
        field('name', 'singleLineText'),
        field('domain', 'singleLineText'),
        field('subpath', 'singleLineText'),
        field('theme', 'singleSelect', { choices: ['default', 'minimal', 'magazine'] }),
        field('description', 'multilineText'),
        field('primaryColor', 'singleLineText'),
        field('aiEnabled', 'checkbox'),
        field('aiTone', 'singleSelect', { choices: ['professional', 'casual', 'friendly', 'authoritative'] }),
        field('aiAudience', 'singleLineText'),
        field('aiKeywords', 'multilineText'),
        field('autoGenerate', 'checkbox'),
        field('postsPerWeek', 'number'),
        field('bufferSize', 'number')
      ]
    },
    Posts: {
      name: 'Posts',
      fields: [
        field('title', 'singleLineText'),
        field('slug', 'singleLineText'),
        field('blogId', 'singleLineText'),
        field('content', 'multilineText'),
        field('aiContent', 'multilineText'),
        field('excerpt', 'multilineText'),
        field('status', 'singleSelect', { choices: ['Draft', 'Published', 'Scheduled', 'Review', 'Archived'] }),
        field('publishDate', 'dateTime'),
        field('author', 'singleLineText'),
        field('tags', 'multilineText'),
        field('featuredImage', 'url'),
        field('readTime', 'number'),
        field('aiGenerated', 'checkbox')
      ]
    },
    ContentIdeas: {
      name: 'ContentIdeas',
      fields: [
        field('topic', 'singleLineText'),
        field('blogId', 'singleLineText'),
        field('keywords', 'multilineText'),
        field('priority', 'singleSelect', { choices: ['High', 'Medium', 'Low'] }),
        field('converted', 'checkbox')
      ]
    }
  };

  const existing = await listTables();
  const names = new Set((existing.tables || []).map(t => t.name));

  for (const key of Object.keys(needed)) {
    if (!names.has(needed[key].name)) {
      process.stdout.write(`Creating table ${needed[key].name}... `);
      await createTable(needed[key]);
      console.log('OK');
    } else {
      console.log(`Exists: ${needed[key].name}`);
    }
  }
}

ensureTables()
  .then(() => {
    console.log('Airtable tables ensured.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed ensuring tables:', err.message);
    process.exit(1);
  });
