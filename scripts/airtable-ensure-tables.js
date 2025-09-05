#!/usr/bin/env node

/**
 * Airtable Blog CMS Setup & Verification
 * Ensures all necessary tables exist with proper schema
 * Uses Airtable MCP tools for management
 */

// No external dependencies, using built-in modules only

// Configuration - Using the new base
const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || "patn9EcWwQcOQtP2A.084bc3ecf3d4493db9e4bc215f31a10de83cb9486a1d277c4fdb8a869b379622";
const AIRTABLE_BASE_ID = "appLattdbxMhK4I0y";

const API_BASE_URL = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}`;

// Comprehensive table schema for multi-blog CMS
const TABLES_SCHEMA = {
  Blogs: {
    name: "Blogs",
    description: "Master table for managing multiple blog sites",
    fields: [
      { name: "Blog Name", type: "singleLineText" },
      { name: "Domain", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "Logo URL", type: "url" },
      { name: "Theme", type: "singleSelect", options: { 
        choices: [
          { name: "Default" },
          { name: "Tech" },
          { name: "Business" },
          { name: "Crypto" },
          { name: "AI" }
        ]
      }},
      { name: "Language", type: "singleSelect", options: {
        choices: [
          { name: "English" },
          { name: "Spanish" },
          { name: "Portuguese" }
        ]
      }},
      { name: "Active", type: "checkbox", options: {} },
      { name: "Analytics ID", type: "singleLineText" },
      { name: "Created", type: "dateTime", options: { 
        dateFormat: { name: "iso" },
        timeFormat: { name: "24hour" },
        timeZone: "utc"
      }}
    ]
  },
  
  Posts: {
    name: "Posts",
    description: "All blog posts across all blogs",
    fields: [
      { name: "Title", type: "singleLineText" },
      { name: "Slug", type: "singleLineText" },
      { name: "Blog Name", type: "singleLineText" },
      { name: "Author", type: "singleLineText" },
      { name: "Content", type: "multilineText" },
      { name: "Excerpt", type: "multilineText" },
      { name: "Featured Image", type: "url" },
      { name: "Image Alt", type: "singleLineText" },
      { name: "Status", type: "singleSelect", options: {
        choices: [
          { name: "Draft" },
          { name: "Review" },
          { name: "Scheduled" },
          { name: "Published" },
          { name: "Archived" }
        ]
      }},
      { name: "Category", type: "singleLineText" },
      { name: "Tags", type: "multilineText" },
      { name: "Published Date", type: "dateTime", options: {
        dateFormat: { name: "iso" },
        timeFormat: { name: "24hour" },
        timeZone: "utc"
      }},
      { name: "SEO Title", type: "singleLineText" },
      { name: "SEO Description", type: "multilineText" },
      { name: "Keywords", type: "multilineText" },
      { name: "Views", type: "number", options: { precision: 0 }},
      { name: "Reading Time", type: "number", options: { precision: 0 }}
    ]
  },
  
  Authors: {
    name: "Authors",
    description: "Content creators and contributors",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Email", type: "email" },
      { name: "Bio", type: "multilineText" },
      { name: "Avatar URL", type: "url" },
      { name: "Role", type: "singleSelect", options: {
        choices: [
          { name: "Admin" },
          { name: "Editor" },
          { name: "Author" },
          { name: "Contributor" }
        ]
      }},
      { name: "Website", type: "url" },
      { name: "Active", type: "checkbox", options: {} }
    ]
  },
  
  Categories: {
    name: "Categories", 
    description: "Post categories for organization",
    fields: [
      { name: "Name", type: "singleLineText" },
      { name: "Slug", type: "singleLineText" },
      { name: "Description", type: "multilineText" },
      { name: "Blog Name", type: "singleLineText" },
      { name: "Color", type: "singleLineText" },
      { name: "Icon", type: "singleLineText" }
    ]
  }
};

// Sample data for initial setup
const SAMPLE_DATA = {
  Blogs: [
    {
      "Blog Name": "GPT Mundo",
      "Domain": "gptmundo.com",
      "Description": "Blog sobre inteligencia artificial en español",
      "Theme": "AI",
      "Language": "Spanish",
      "Active": true,
      "Analytics ID": "G-XXXXXXXXXX"
    },
    {
      "Blog Name": "GPT Coins",
      "Domain": "gptcoins.com",
      "Description": "AI-powered cryptocurrency insights",
      "Theme": "Crypto",
      "Language": "English",
      "Active": true,
      "Analytics ID": "G-YYYYYYYYYY"
    },
    {
      "Blog Name": "Empleados AI",
      "Domain": "empleados.ai",
      "Description": "AI for workforce management",
      "Theme": "Business",
      "Language": "Spanish",
      "Active": true
    }
  ],
  
  Authors: [
    {
      "Name": "AI Assistant",
      "Email": "ai@example.com",
      "Bio": "Automated content generation system",
      "Role": "Author",
      "Active": true
    },
    {
      "Name": "Sami Halawa",
      "Email": "sami@example.com",
      "Bio": "Tech entrepreneur and AI enthusiast",
      "Role": "Admin",
      "Website": "https://samihalawa.com",
      "Active": true
    }
  ],
  
  Categories: [
    {
      "Name": "AI Technology",
      "Slug": "ai-technology",
      "Description": "Artificial Intelligence and Machine Learning",
      "Color": "#3B82F6",
      "Icon": "🤖"
    },
    {
      "Name": "Cryptocurrency",
      "Slug": "cryptocurrency",
      "Description": "Crypto and blockchain technology",
      "Color": "#F59E0B",
      "Icon": "₿"
    },
    {
      "Name": "Business",
      "Slug": "business",
      "Description": "Business and entrepreneurship",
      "Color": "#10B981",
      "Icon": "💼"
    }
  ],
  
  Posts: [
    {
      "Title": "Introduction to GPT-4 and Its Applications",
      "Slug": "introduction-gpt4-applications",
      "Blog Name": "GPT Mundo",
      "Author": "AI Assistant",
      "Content": "# Introduction to GPT-4\\n\\nGPT-4 represents a significant advancement in artificial intelligence...",
      "Excerpt": "Explore the capabilities and real-world applications of GPT-4 technology.",
      "Status": "Published",
      "Category": "AI Technology",
      "Tags": "GPT-4, AI, Machine Learning, NLP",
      "SEO Title": "GPT-4 Complete Guide - Applications and Use Cases",
      "SEO Description": "Comprehensive guide to understanding GPT-4 technology and its practical applications in various industries.",
      "Keywords": "GPT-4, artificial intelligence, machine learning, natural language processing",
      "Reading Time": 8,
      "Views": 0
    },
    {
      "Title": "AI Trading Strategies for Cryptocurrency",
      "Slug": "ai-trading-strategies-crypto",
      "Blog Name": "GPT Coins",
      "Author": "Sami Halawa",
      "Content": "# AI Trading Strategies\\n\\nLeverage artificial intelligence for smarter crypto trading...",
      "Excerpt": "Learn how AI can improve your cryptocurrency trading strategies.",
      "Status": "Published",
      "Category": "Cryptocurrency",
      "Tags": "AI, Trading, Cryptocurrency, Bitcoin",
      "SEO Title": "AI Crypto Trading - Smart Strategies for 2025",
      "SEO Description": "Discover how artificial intelligence is revolutionizing cryptocurrency trading with advanced strategies.",
      "Keywords": "AI trading, cryptocurrency, bitcoin, automated trading",
      "Reading Time": 10,
      "Views": 0
    }
  ]
};

async function makeAirtableRequest(endpoint, method = 'GET', body = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Airtable API error: ${response.status} - ${JSON.stringify(data)}`);
  }
  
  return data;
}

async function getExistingTables() {
  console.log('📋 Fetching existing tables...');
  const data = await makeAirtableRequest('/tables');
  return data.tables || [];
}

async function createTable(tableConfig) {
  console.log(`  📝 Creating table: ${tableConfig.name}...`);
  
  const tableData = {
    name: tableConfig.name,
    description: tableConfig.description,
    fields: tableConfig.fields.map(field => {
      const fieldData = {
        name: field.name,
        type: field.type
      };
      if (field.description) fieldData.description = field.description;
      if (field.options) fieldData.options = field.options;
      return fieldData;
    })
  };
  
  try {
    const result = await makeAirtableRequest('/tables', 'POST', tableData);
    console.log(`  ✅ Created table: ${tableConfig.name} (ID: ${result.id})`);
    return result;
  } catch (error) {
    console.error(`  ❌ Failed to create table ${tableConfig.name}:`, error.message);
    return null;
  }
}

async function insertSampleData(tableName, tableId, records) {
  console.log(`  📥 Inserting ${records.length} sample records into ${tableName}...`);
  
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`;
  
  // Insert records in batches of 10
  const batchSize = 10;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const body = {
      records: batch.map(fields => ({ fields }))
    };
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`    ✅ Inserted ${result.records.length} records`);
      } else {
        const error = await response.text();
        console.log(`    ⚠️ Failed to insert batch: ${error}`);
      }
    } catch (error) {
      console.log(`    ⚠️ Error inserting batch: ${error.message}`);
    }
    
    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function main() {
  console.log('🚀 Airtable Blog CMS Setup');
  console.log(`📍 Base ID: ${AIRTABLE_BASE_ID}`);
  console.log('================================\n');
  
  try {
    // Get existing tables
    const existingTables = await getExistingTables();
    console.log(`Found ${existingTables.length} existing table(s)\n`);
    
    const createdTables = {};
    
    // Create missing tables
    console.log('📊 Creating tables...');
    for (const [tableName, tableConfig] of Object.entries(TABLES_SCHEMA)) {
      const existing = existingTables.find(t => t.name === tableConfig.name);
      
      if (existing) {
        console.log(`  ⏭️ Table "${tableConfig.name}" already exists (ID: ${existing.id})`);
        createdTables[tableName] = existing;
      } else {
        const created = await createTable(tableConfig);
        if (created) {
          createdTables[tableName] = created;
        }
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n📥 Inserting sample data...');
    
    // Insert sample data for each table
    for (const [tableName, records] of Object.entries(SAMPLE_DATA)) {
      const table = createdTables[tableName];
      if (table && records.length > 0) {
        await insertSampleData(table.name, table.id, records);
      }
    }
    
    console.log('\n✨ Setup Complete!\n');
    console.log('📋 Table IDs:');
    for (const [name, table] of Object.entries(createdTables)) {
      console.log(`  ${name}: ${table.id}`);
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Update worker environment variables:');
    console.log(`   AIRTABLE_BASE_ID=${AIRTABLE_BASE_ID}`);
    console.log('2. Configure linked record fields in Airtable UI if needed');
    console.log('3. Test the API endpoints with curl commands');
    console.log('4. Deploy the updated blog worker\n');
    
    // Test API access
    console.log('🧪 Testing API access...');
    const testUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Posts?maxRecords=1`;
    const testResponse = await fetch(testUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_TOKEN}`
      }
    });
    
    if (testResponse.ok) {
      console.log('✅ API access confirmed!');
    } else {
      console.log('⚠️ API access test failed:', testResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  main().catch(console.error);
}
