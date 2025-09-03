#!/usr/bin/env node

/**
 * Airtable Blog Setup Script
 * Creates the necessary Airtable base structure for the Autoblog CMS
 */

const https = require('https');

// Airtable configuration
const AIRTABLE_API_KEY = process.env.AIRTABLE_TOKEN || '';
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE || '';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing Airtable credentials!');
  console.log('Please set AIRTABLE_TOKEN and AIRTABLE_BASE environment variables');
  console.log('\nExample:');
  console.log('export AIRTABLE_TOKEN=your_token_here');
  console.log('export AIRTABLE_BASE=appXXXXXXXXX');
  process.exit(1);
}

// Airtable Schema Definition
const SCHEMA = {
  // Blogs table - Main blog configuration
  Blogs: {
    name: 'Blogs',
    fields: [
      { name: 'name', type: 'singleLineText' },
      { name: 'domain', type: 'singleLineText' },
      { name: 'subpath', type: 'singleLineText', description: 'e.g., /blog' },
      { name: 'theme', type: 'singleSelect', options: ['default', 'minimal', 'magazine'] },
      { name: 'description', type: 'multilineText' },
      { name: 'primaryColor', type: 'singleLineText', description: 'Hex color' },
      
      // AI Configuration
      { name: 'aiEnabled', type: 'checkbox' },
      { name: 'aiTone', type: 'singleSelect', options: ['professional', 'casual', 'friendly', 'authoritative'] },
      { name: 'aiAudience', type: 'singleLineText' },
      { name: 'aiKeywords', type: 'multilineText' },
      
      // Automation
      { name: 'autoGenerate', type: 'checkbox' },
      { name: 'postsPerWeek', type: 'number' },
      { name: 'bufferSize', type: 'number', description: 'Min posts to keep ready' },
      
      // Stats (calculated)
      { name: 'postCount', type: 'count', linkedTable: 'Posts' }
    ]
  },
  
  // Posts table - Blog content
  Posts: {
    name: 'Posts',
    fields: [
      { name: 'title', type: 'singleLineText' },
      { name: 'slug', type: 'singleLineText' },
      { name: 'blogId', type: 'singleLineText', linkedTo: 'Blogs' },
      
      // Content fields
      { name: 'content', type: 'multilineText', description: 'Markdown content' },
      { name: 'aiContent', type: 'multilineText', description: 'AI-generated content' },
      { name: 'excerpt', type: 'multilineText' },
      
      // SEO
      { name: 'metaTitle', type: 'singleLineText' },
      { name: 'metaDescription', type: 'multilineText' },
      { name: 'keywords', type: 'multilineText' },
      
      // Media
      { name: 'featuredImage', type: 'url' },
      { name: 'imageAlt', type: 'singleLineText' },
      
      // Metadata
      { name: 'status', type: 'singleSelect', options: ['Draft', 'Review', 'Scheduled', 'Published', 'Archived'] },
      { name: 'publishDate', type: 'dateTime' },
      { name: 'scheduledDate', type: 'dateTime' },
      { name: 'author', type: 'singleLineText' },
      { name: 'tags', type: 'multilineText' },
      { name: 'readTime', type: 'number' },
      
      // AI tracking
      { name: 'aiGenerated', type: 'checkbox' },
      { name: 'generateContent', type: 'checkbox', description: 'Trigger AI generation' },
      
      // Social Media
      { name: 'twitterPost', type: 'multilineText' },
      { name: 'linkedinPost', type: 'multilineText' },
      
      // Analytics
      { name: 'views', type: 'number' },
      { name: 'shares', type: 'number' }
    ]
  },
  
  // Content Ideas table - For AI brainstorming
  ContentIdeas: {
    name: 'ContentIdeas',
    fields: [
      { name: 'topic', type: 'singleLineText' },
      { name: 'blogId', type: 'singleLineText', linkedTo: 'Blogs' },
      { name: 'keywords', type: 'multilineText' },
      { name: 'priority', type: 'singleSelect', options: ['High', 'Medium', 'Low'] },
      { name: 'notes', type: 'multilineText' },
      { name: 'converted', type: 'checkbox' },
      { name: 'convertedPostId', type: 'singleLineText' }
    ]
  }
};

// Sample data for testing
const SAMPLE_DATA = {
  blogs: [
    {
      name: 'AI Insights Blog',
      domain: 'gptcoins.com',
      subpath: '/blog',
      theme: 'default',
      description: 'Latest insights on AI and cryptocurrency',
      primaryColor: '#3B82F6',
      aiEnabled: true,
      aiTone: 'professional',
      aiAudience: 'Tech professionals and crypto enthusiasts',
      aiKeywords: 'AI, machine learning, cryptocurrency, blockchain, DeFi',
      autoGenerate: true,
      postsPerWeek: 3,
      bufferSize: 10
    }
  ],
  
  ideas: [
    { topic: 'The Future of AI in Cryptocurrency Trading', priority: 'High' },
    { topic: 'Building Smart Contracts with AI Assistance', priority: 'High' },
    { topic: 'Top 10 AI Tools for Crypto Investors', priority: 'Medium' },
    { topic: 'Understanding Neural Networks in Blockchain', priority: 'Medium' },
    { topic: 'AI-Powered Portfolio Management Strategies', priority: 'High' }
  ],
  
  posts: [
    {
      title: 'Getting Started with AI-Powered Crypto Trading',
      content: `# Getting Started with AI-Powered Crypto Trading

## Introduction

Artificial Intelligence is revolutionizing the way we trade cryptocurrencies...

## Key Benefits

1. **Automated Analysis**: AI can process vast amounts of market data
2. **Pattern Recognition**: Identify trading patterns humans might miss
3. **Risk Management**: Better risk assessment and portfolio optimization

## Getting Started

Here's how to begin your journey into AI-powered crypto trading...`,
      excerpt: 'Learn how AI is transforming cryptocurrency trading and how you can get started.',
      status: 'Published',
      aiGenerated: true,
      author: 'AI Assistant',
      tags: 'AI, cryptocurrency, trading, tutorial',
      readTime: 5
    }
  ]
};

// Helper function to make Airtable API calls
function airtableRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      path: `/v0/${AIRTABLE_BASE_ID}${path}`,
      method: method,
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Airtable API error: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Create sample blog
async function createSampleBlog() {
  console.log('📝 Creating sample blog...');
  
  try {
    const result = await airtableRequest('/Blogs', 'POST', {
      fields: SAMPLE_DATA.blogs[0]
    });
    
    console.log('✅ Blog created:', result.fields.name);
    return result.id;
  } catch (error) {
    console.error('❌ Failed to create blog:', error.message);
    throw error;
  }
}

// Create sample ideas
async function createSampleIdeas(blogId) {
  console.log('💡 Creating content ideas...');
  
  for (const idea of SAMPLE_DATA.ideas) {
    try {
      await airtableRequest('/ContentIdeas', 'POST', {
        fields: {
          ...idea,
          blogId: blogId,
          converted: false
        }
      });
      console.log(`  ✅ Created idea: ${idea.topic}`);
    } catch (error) {
      console.error(`  ❌ Failed to create idea: ${error.message}`);
    }
  }
}

// Create sample post
async function createSamplePost(blogId) {
  console.log('📄 Creating sample post...');
  
  const post = SAMPLE_DATA.posts[0];
  const slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  
  try {
    await airtableRequest('/Posts', 'POST', {
      fields: {
        ...post,
        blogId: blogId,
        slug: slug,
        publishDate: new Date().toISOString(),
        views: 0,
        shares: 0
      }
    });
    console.log(`✅ Created post: ${post.title}`);
  } catch (error) {
    console.error(`❌ Failed to create post: ${error.message}`);
  }
}

// Main setup function
async function setupAirtable() {
  console.log('🚀 Setting up Airtable for Autoblog CMS');
  console.log('=====================================\n');
  
  console.log('📋 Airtable Base ID:', AIRTABLE_BASE_ID);
  console.log('🔗 Base URL: https://airtable.com/' + AIRTABLE_BASE_ID);
  console.log('\n⚠️  IMPORTANT: You must manually create the tables in Airtable first!');
  console.log('\nRequired tables:');
  console.log('1. Blogs');
  console.log('2. Posts');
  console.log('3. ContentIdeas\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Have you created the tables? (y/n): ', async (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('\n📌 Please create the tables in Airtable first.');
      console.log('Visit: https://airtable.com/' + AIRTABLE_BASE_ID);
      readline.close();
      return;
    }
    
    try {
      // Create sample data
      const blogId = await createSampleBlog();
      await createSampleIdeas(blogId);
      await createSamplePost(blogId);
      
      console.log('\n✨ Setup complete!\n');
      console.log('Next steps:');
      console.log('1. Deploy the blog worker: cd workers/blog && wrangler deploy');
      console.log('2. Set secrets:');
      console.log('   wrangler secret put AIRTABLE_TOKEN');
      console.log('   wrangler secret put AIRTABLE_BASE');
      console.log('3. Visit your blog at: https://gptcoins.com/blog');
      console.log('4. Manage content at: dashboard/blog-manager.html');
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
    }
    
    readline.close();
  });
}

// Run setup
setupAirtable();