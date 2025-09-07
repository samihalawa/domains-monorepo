# 🌐 Domains Monorepo - Updated Claude Instructions

## 📋 User's Most Insistent Requirements (Current Session)

### Core Commands Given
- **"use browsermcp"** - MANDATORY: Use browser MCP for all UI testing and automation
- **Update all documentation** - Current .md files are outdated and need refresh
- **Monorepo context focus** - All operations must consider multiple project management

## 🎯 Critical Requirements for This Monorepo

### Browser MCP Usage (TOP PRIORITY)
- **NEVER create test files** like test-ui.js 
- **ALWAYS use MCP browser tools agentically** for UI testing
- **Screenshot before every interaction**
- **Validate all UI flows with real browser automation**

### Multi-Project Management Rules
- **24 active domains** across monorepo + Netlify
- **Evidence-based operations** - cite exact file:line references
- **Zero assumptions** - verify existence before modifications
- **Immediate execution** - no permission loops

### Outdated Documentation Issue
- **Problem**: Most .md files contain outdated information
- **Solution**: Always verify current state before following existing docs
- **Action**: Update documentation as part of any major changes

## 🚀 Monorepo Structure (Current State)

### Active Sites Structure
```
domains-monorepo/
├── sites/                    # 17 monorepo domains
│   ├── [domain]/            # Individual site folders
│   └── default/             # Fallback site
├── statics/                 # Shared assets  
├── domains-router.js        # Routing logic
├── deploy.sh               # Deployment script
└── CLAUDE.md               # This file (UPDATED)
```

### Platform Distribution
- **Monorepo Sites**: 17 domains on Cloudflare Pages
- **Premium Sites**: 7 domains on individual Netlify apps
- **Total Portfolio**: 24 active domains

## ⚡ Execution Protocol

### For Any Domain Work
1. **Use browser MCP** for testing/validation
2. **Verify current state** (don't trust outdated docs)
3. **Evidence-based changes** with file:line citations
4. **Update docs** if they're outdated during work

### Quality Gates
1. Browser MCP validation ✓
2. Evidence verification ✓ 
3. Multi-domain impact check ✓
4. Documentation currency ✓

## 🔧 MCP Tools Priority

### Primary Tools
- **Browser MCP**: UI testing, validation, screenshots
- **File System MCP**: Reading/writing across monorepo
- **GitHub MCP**: Version control operations

### Tool Usage Rules
- Browser automation > manual testing
- Real DOM inspection > assumptions
- Screenshot evidence > descriptions
- Actual file content > cached knowledge

---

**Last Updated**: Current session - Reflecting user's explicit requirements
**Status**: Documentation refreshed per user request
**Focus**: Browser MCP usage + outdated docs awareness