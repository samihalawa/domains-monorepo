# Airtable AI Content Generation Setup

## Overview
All content generation is now handled directly in Airtable using native AI features, removing hardcoded templates from the codebase.

## Fields Added to Posts Table
- **Topic Brief**: Brief description for AI content generation
- **Target Word Count**: Desired article length (number)
- **Content Style**: Professional/Conversational/Technical/Educational (select)

## Draft Posts Created
Template draft posts added for high-value domains:
- autoword.ai: AI automation in enterprise workflows
- empleados.ai: AI-powered employee management
- apilord.com: API security best practices
- damecoins.com: Digital payment trends
- gptabsolute.com: ChatGPT prompting techniques

## Airtable AI Setup Instructions

### 1. Add AI Fields (Manual in Airtable UI)
Since AI fields can't be created via API, manually add these in Airtable:

**AI Title Field**:
```
Field Type: AI (Text)
Referenced Fields: Topic Brief, Blog Name, Category
Prompt: "Generate a compelling blog post title for {Blog Name} about: {Topic Brief}. 
The title should be SEO-friendly, under 60 characters, and relevant to {Category}. 
Generate ONLY the title, no extra text."
```

**AI Content Field**:
```
Field Type: AI (Long text)
Referenced Fields: Topic Brief, Blog Name, Target Word Count, Content Style
Prompt: "Write a {Target Word Count}-word blog post for {Blog Name} about: {Topic Brief}
Style: {Content Style}
Include: Introduction, 3-4 main sections with headers, conclusion
Format: Markdown with # headers
Focus on practical value and actionable insights."
```

**AI Excerpt Field**:
```
Field Type: AI (Text)
Referenced Fields: AI Content
Prompt: "Create a compelling 150-character excerpt from this blog content: {AI Content}"
```

### 2. Create Automation
**Trigger**: When Status changes to "Draft"
**Actions**:
1. Generate AI Title
2. Generate AI Content  
3. Generate AI Excerpt
4. Copy AI fields to main Title/Content/Excerpt fields
5. Set Status to "Published"
6. Set Published Date to now()

### 3. Content Generation Workflow
1. Create new record with Topic Brief and Blog Name
2. Set Status to "Draft"
3. Automation triggers AI generation
4. Content automatically published
5. Worker API serves content via existing endpoints

## Benefits
- No hardcoded templates in codebase
- Leverages Airtable's native AI capabilities
- Scalable content generation
- Maintains existing API endpoints
- Content quality controlled by AI prompts, not code
