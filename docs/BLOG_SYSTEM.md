# Blog & Content Automation System

This document outlines the automated blog deployment and content generation system managed by the unified Cloudflare worker.

## 1. Airtable Configuration

-   **Base ID**: `appLattdbxMhK4I0y`
-   **Primary Table**: `Posts`
-   **Authentication**: Managed via `AIRTABLE_TOKEN` and `AIRTABLE_BASE` secrets in the worker environment.

The system uses a single `Posts` table. Blogs are not a separate table; they are virtual constructs grouped by the `Blog Name` field within the `Posts` table.

## 2. Automated Blog Deployment

-   New blogs are deployed automatically for high-value domains that do not yet have any posts in the Airtable base.
-   The `HIGH_VALUE_DOMAINS` list in `workers/unified/index.js` defines which domains are eligible for automatic deployment.

## 3. Automated Content Generation

-   **Trigger**: A cron job runs every 2 hours via the `scheduled` handler in the worker.
-   **Process**:
    1.  The worker scans the `HIGH_VALUE_DOMAINS` list.
    2.  It checks which of these domains already have posts in the `Posts` table.
    3.  For up to 3 high-value domains *without* any posts, it generates a new "Welcome" post.
    4.  Content (title, body, keywords) is generated based on predefined templates for different categories (e.g., `AI_PREMIUM`, `FINTECH`).
-   **Goal**: This ensures that new, high-priority sites are automatically populated with initial content, effectively "deploying" their blog.
