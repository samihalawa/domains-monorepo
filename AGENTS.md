# Agents Guide

This repository is operated with AI coding agents in mind (e.g., Codex CLI, Claude Code). This guide defines scope, conventions, and safe defaults so agents can make consistent, minimal, and production‑safe changes.

## Objectives

- Keep the Cloudflare Worker and Dashboard simple, reliable, and API‑driven.
- Prefer minimal diffs and avoid introducing new infra or complexity unless requested.
- Never commit secrets; use Wrangler secrets for production tokens.

## Architecture Quickview

- Backend: Cloudflare Worker (workers/unified/index.js)
  - Dashboard endpoints under `/api/dashboard/*`
  - Blog/Airtable endpoints under `/api/blog/*`
  - Health: `/health`
- Frontend: Static dashboard (`dashboard/index.html`)
  - Reads API base from `window.API_BASE` (default: production worker URL)

## Environments & Secrets

- Local dev
  - `cd workers/unified && npx wrangler dev --port 8787`
  - `cd dashboard && python3 -m http.server 8090`
  - In `dashboard/index.html`, set `window.API_BASE = 'http://localhost:8787'` for local API.

- Production deploy
  - Ensure a Cloudflare API token with Workers:Edit permissions.
  - Set secrets (preferred):
    - `echo -n 'AIRTABLE_API_TOKEN' | npx wrangler secret put AIRTABLE_TOKEN --env production`
    - `echo -n 'AIRTABLE_BASE_ID' | npx wrangler secret put AIRTABLE_BASE --env production`
  - Deploy: `cd workers/unified && npx wrangler deploy --env production`

## Editing Rules

- Make surgical changes; avoid refactors unless necessary for the requested fix.
- Do not introduce new services (KV, D1, queues) without explicit user request.
- Keep dashboard fully dynamic; remove mock data and placeholder UI.
- Preserve working routes and signatures; add new endpoints under `/api/...` with clear names.
- Respect style and structure of the existing code.

## Safe Tasks Checklist

1) UI
- Only keep views that are backed by real data.
- Use `API_BASE` for all fetches.

2) Worker
- Use `jsonResponse()` and existing CORS headers.
- Wrap external calls in try/catch and return useful error details.
- Cache small JSON with `getCachedJSON` where helpful.

3) Secrets
- Never commit tokens in git. If present in `wrangler.toml`, migrate to secrets and remove from vars.

## Common Endpoints

- Domains list: `GET /api/dashboard/domains`
- Netlify sites: `GET /api/dashboard/netlify-sites`
- Blog list: `GET /api/blog/blogs`
- Blog posts by domain: `GET /api/blog/posts?domain=example.com`

## Code Style

- Small functions, early returns, consistent naming.
- Prefer pure helpers; keep side effects at edges (fetch/respond).

## When In Doubt

- Prefer to ask for explicit confirmation before destructive actions.
- If asked to “remove unnecessary stuff”, limit scope to mocks/placeholders and dead code.

