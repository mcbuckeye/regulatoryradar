# RegulatoryRadar - Product Requirements Document

## Overview
RegulatoryRadar is an AI-curated daily digest platform that aggregates FDA guidances, EMA updates, and competitor regulatory filings, providing relevance scoring tailored to your therapeutic areas (with oncology as the default focus).

## Tech Stack
- **Backend:** FastAPI (Python)
- **Frontend:** React + Vite + TypeScript
- **Database:** PostgreSQL
- **Auth:** JWT with default login
- **AI:** Anthropic Claude API for summarization and relevance scoring
- **Web Scraping:** Playwright + requests for FDA/EMA/ClinicalTrials.gov
- **Email:** SMTP2Go for digest delivery
- **Containerization:** Docker Compose
- **Deployment:** Dokploy on MachomeLab

## Core Features

### 1. Authentication
- JWT-based authentication
- Login/logout functionality
- Default user seeded on first run:
  - Email: `steve@ipwatcher.com`
  - Password: `5678*stud`
- Protected routes for all app features

### 2. Data Sources & Scraping
Scrape regulatory data from:
- **FDA.gov**
  - New guidances (draft and final)
  - Drug approvals (NDAs, BLAs, 505(b)(2))
  - Safety communications
  - Warning letters (competitive intel)
  - Orange Book updates
- **EMA.europa.eu**
  - CHMP opinions and recommendations
  - Marketing authorisation decisions
  - Scientific guidelines
  - Safety updates (PRAC)
- **ClinicalTrials.gov**
  - New trial registrations in tracked therapeutic areas
  - Status changes (recruiting, completed, terminated)
  - Results postings

### 3. Therapeutic Area Configuration
- User-configurable therapeutic area filters
- Default focus: Oncology
- Presets available:
  - Oncology (broad)
  - Hematology/CLL
  - BTK inhibitors
  - Solid tumors
  - Immunotherapy
- Custom keyword lists for filtering
- Company watchlists (competitors)

### 4. AI-Powered Analysis (Claude API)
- **Summarization:** Concise 2-3 sentence summaries of each update
- **Relevance Scoring:** 1-100 score based on user's therapeutic areas
- **Impact Assessment:** High/Medium/Low business impact classification
- **Competitive Alerts:** Flag when competitors file or get approvals
- **Trend Detection:** Weekly trend analysis across filings

### 5. Daily Digest (Email)
- Automated daily email at configurable time (default: 7 AM ET)
- Sections:
  - **Top Stories** (relevance score >80)
  - **FDA Updates** (guidances, approvals)
  - **EMA Updates** (CHMP, authorisations)
  - **Clinical Trials** (new/updated in your areas)
  - **Competitor Watch** (filings from watched companies)
- HTML formatted with clean design
- Unsubscribe link
- Delivered via SMTP2Go

### 6. Web Dashboard
- **Feed View:** Chronological stream of all updates
- **Filters:** By source, therapeutic area, relevance score, date
- **Search:** Full-text search across all updates
- **Saved Searches:** Save and name frequent queries
- **Bookmarks:** Save important updates for later
- **History:** View past digests
- **Analytics:** Charts showing update volume trends

### 7. Alert System
- Real-time alerts for high-priority items:
  - Competitor approvals
  - FDA warning letters to competitors
  - Breakthrough therapy designations
  - Accelerated approval decisions
- Delivery: Email + web notification badge

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    digest_time TIME DEFAULT '07:00:00',
    digest_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Therapeutic area configurations
CREATE TABLE user_therapeutic_areas (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    keywords TEXT[],  -- ['BTK', 'ibrutinib', 'CLL', 'lymphoma']
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Watched companies (competitors)
CREATE TABLE watched_companies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    company_name VARCHAR(255) NOT NULL,
    aliases TEXT[],  -- ['AbbVie', 'Abbvie Inc', 'ABBV']
    created_at TIMESTAMP DEFAULT NOW()
);

-- Regulatory updates (main data)
CREATE TABLE regulatory_updates (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,  -- fda, ema, clinicaltrials
    source_id VARCHAR(255),  -- Original ID from source
    source_url VARCHAR(1000),
    title VARCHAR(1000) NOT NULL,
    content TEXT,
    update_type VARCHAR(100),  -- guidance, approval, safety, trial
    therapeutic_areas TEXT[],
    companies_mentioned TEXT[],
    published_date DATE,
    scraped_at TIMESTAMP DEFAULT NOW(),
    raw_data JSONB,
    UNIQUE(source, source_id)
);

-- AI analysis results
CREATE TABLE update_analysis (
    id SERIAL PRIMARY KEY,
    update_id INTEGER REFERENCES regulatory_updates(id),
    summary TEXT,
    relevance_score INTEGER,  -- 1-100
    impact_level VARCHAR(20),  -- high, medium, low
    key_points TEXT[],
    analyzed_at TIMESTAMP DEFAULT NOW()
);

-- User-specific relevance (per user's config)
CREATE TABLE user_update_relevance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    update_id INTEGER REFERENCES regulatory_updates(id),
    relevance_score INTEGER,
    is_competitor_related BOOLEAN DEFAULT FALSE,
    is_bookmarked BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, update_id)
);

-- Digest history
CREATE TABLE digest_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    sent_at TIMESTAMP DEFAULT NOW(),
    update_ids INTEGER[],
    email_content TEXT,
    delivery_status VARCHAR(50)  -- sent, failed, bounced
);

-- Saved searches
CREATE TABLE saved_searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    query_params JSONB,  -- {source: 'fda', keywords: ['BTK'], minScore: 70}
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scrape logs
CREATE TABLE scrape_logs (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    updates_found INTEGER,
    new_updates INTEGER,
    status VARCHAR(50),  -- success, failed, partial
    error_message TEXT
);
```

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### User Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings (digest time, etc.)
- `GET /api/settings/therapeutic-areas` - List therapeutic areas
- `POST /api/settings/therapeutic-areas` - Add therapeutic area
- `PUT /api/settings/therapeutic-areas/{id}` - Update
- `DELETE /api/settings/therapeutic-areas/{id}` - Delete
- `GET /api/settings/watched-companies` - List watched companies
- `POST /api/settings/watched-companies` - Add company
- `DELETE /api/settings/watched-companies/{id}` - Remove company

### Updates Feed
- `GET /api/updates` - List updates (paginated, filterable)
- `GET /api/updates/{id}` - Get single update with analysis
- `POST /api/updates/{id}/bookmark` - Toggle bookmark
- `POST /api/updates/{id}/read` - Mark as read

### Search
- `GET /api/search?q=...` - Full-text search
- `GET /api/saved-searches` - List saved searches
- `POST /api/saved-searches` - Save a search
- `DELETE /api/saved-searches/{id}` - Delete saved search

### Digests
- `GET /api/digests` - List past digests
- `GET /api/digests/{id}` - View specific digest
- `POST /api/digests/preview` - Generate preview of today's digest

### Analytics
- `GET /api/analytics/trends` - Update volume trends
- `GET /api/analytics/sources` - Breakdown by source
- `GET /api/analytics/competitors` - Competitor activity summary

### Admin/System
- `POST /api/admin/scrape` - Trigger manual scrape
- `GET /api/admin/scrape-logs` - View scrape history
- `GET /api/health` - Health check

## Frontend Pages

### 1. Login (`/login`)
- Email/password form
- Professional, pharma-appropriate design
- RegulatoryRadar branding (radar/scanner imagery)

### 2. Dashboard (`/`)
- Today's top updates (cards)
- Relevance score badges
- Quick stats: updates today, high-priority count
- "View Digest" button for today's preview
- Recent competitor activity sidebar

### 3. Feed (`/feed`)
- Infinite scroll of updates
- Filter sidebar:
  - Source (FDA, EMA, ClinicalTrials)
  - Update type (guidance, approval, trial, safety)
  - Relevance score slider
  - Date range
  - Therapeutic area
- Sort by: date, relevance
- Compact vs. expanded view toggle

### 4. Update Detail (`/updates/{id}`)
- Full content display
- AI summary and analysis panel
- Related updates
- Bookmark button
- Source link (opens original)
- Share/export options

### 5. Search (`/search`)
- Search bar with suggestions
- Results with highlighting
- Filter refinements
- Save search button

### 6. Digests (`/digests`)
- List of past digests (calendar or list view)
- Preview current day's digest
- Click to view full digest

### 7. Settings (`/settings`)
- **Profile:** Email, password change
- **Digest:** Time preference, enable/disable
- **Therapeutic Areas:** Add/edit/remove with keywords
- **Watchlist:** Manage competitor companies
- **Notifications:** Alert preferences

### 8. Analytics (`/analytics`)
- Charts: update volume over time
- Source breakdown pie chart
- Competitor activity timeline
- Therapeutic area coverage

## UI/UX Requirements
- **Professional, pharma-appropriate design** - Clean, data-focused
- **Color scheme:** Deep blue (#0d47a1), white, subtle gray accents
- **Typography:** Clear, readable (Inter/System fonts)
- **Mobile-responsive** - Must work on tablets for execs on the go
- **Dark mode** - Optional toggle
- **Loading states** - Skeleton screens for data loading
- **Relevance badges:** Color-coded (green >80, yellow 50-80, gray <50)

## Docker Configuration

### Container Names (MUST be prefixed)
- `regulatoryradar-postgres` - Database
- `regulatoryradar-backend` - FastAPI backend
- `regulatoryradar-frontend` - React frontend (nginx)
- `regulatoryradar-scraper` - Background scraping service (optional, can be cron in backend)

### docker-compose.yml
```yaml
version: '3.8'
services:
  regulatoryradar-postgres:
    image: postgres:15
    container_name: regulatoryradar-postgres
    environment:
      POSTGRES_USER: regulatoryradar
      POSTGRES_PASSWORD: regulatoryradar_secret
      POSTGRES_DB: regulatoryradar
    volumes:
      - regulatoryradar-pgdata:/var/lib/postgresql/data
    networks:
      - regulatoryradar-network
    restart: unless-stopped

  regulatoryradar-backend:
    build: ./backend
    container_name: regulatoryradar-backend
    environment:
      DATABASE_URL: postgresql://regulatoryradar:regulatoryradar_secret@regulatoryradar-postgres:5432/regulatoryradar
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      SMTP2GO_API_KEY: ${SMTP2GO_API_KEY}
      SECRET_KEY: ${SECRET_KEY:-regulatoryradar-secret-key-change-in-prod}
    depends_on:
      - regulatoryradar-postgres
    networks:
      - regulatoryradar-network
      - dokploy-network
    restart: unless-stopped

  regulatoryradar-frontend:
    build: ./frontend
    container_name: regulatoryradar-frontend
    depends_on:
      - regulatoryradar-backend
    networks:
      - regulatoryradar-network
      - dokploy-network
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.regulatoryradar.rule=Host(`regulatoryradar.machomelab.com`)"
      - "traefik.http.routers.regulatoryradar.entrypoints=web"
      - "traefik.http.services.regulatoryradar.loadbalancer.server.port=80"
      - "traefik.docker.network=dokploy-network"

volumes:
  regulatoryradar-pgdata:

networks:
  regulatoryradar-network:
    driver: bridge
  dokploy-network:
    external: true
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection
- `ANTHROPIC_API_KEY` - For Claude API (summarization/scoring)
- `SMTP2GO_API_KEY` - For email delivery
- `SECRET_KEY` - JWT signing secret

## Scraping Implementation

### FDA.gov Scraping
```python
# Key endpoints to scrape:
# - https://www.fda.gov/drugs/development-approval-process-drugs/novel-drug-approvals-fda
# - https://www.fda.gov/drugs/guidance-compliance-regulatory-information/guidances-drugs
# - https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts
# Use RSS feeds where available, fallback to HTML scraping with Playwright
```

### EMA.europa.eu Scraping
```python
# Key endpoints:
# - https://www.ema.europa.eu/en/human-medicines
# - CHMP meeting agendas/minutes
# - Marketing authorisation decisions
# HTML scraping with Playwright (dynamic content)
```

### ClinicalTrials.gov
```python
# Use official API: https://clinicaltrials.gov/api/v2/
# Query by conditions, interventions, sponsors
# More reliable than scraping
```

### Scraping Schedule
- Run scrapers every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)
- Rate limiting to be respectful
- Retry logic for failures
- Deduplication by source_id

## AI Analysis Prompts

### Summarization Prompt
```
You are a regulatory affairs analyst. Summarize this FDA/EMA update in 2-3 sentences. 
Focus on: what changed, who is affected, timeline/deadlines, business implications.
Be concise and professional.

Update: {content}
```

### Relevance Scoring Prompt
```
Rate the relevance of this regulatory update for a pharmaceutical company focused on: {therapeutic_areas}

Consider:
- Direct applicability to listed therapeutic areas
- Competitive implications
- Regulatory pathway relevance
- Timeline urgency

Score 1-100 where:
- 90-100: Directly impacts our therapeutic areas
- 70-89: Related therapeutic area or important precedent
- 50-69: Tangentially relevant
- 30-49: Low relevance but worth noting
- 1-29: Not relevant

Update: {title}
{summary}

Return JSON: {"score": X, "reasoning": "..."}
```

## Email Template (HTML)

```html
<!-- Clean, professional digest email -->
<!-- Header with RegulatoryRadar logo -->
<!-- Sections: Top Stories, FDA, EMA, Clinical Trials, Competitor Watch -->
<!-- Each item: Title (linked), Summary, Relevance badge, Source -->
<!-- Footer: Manage preferences link, Unsubscribe -->
```

## Testing Requirements
- Unit tests for scrapers (pytest)
- API endpoint tests
- AI prompt validation (check JSON parsing)
- Email template rendering tests
- Frontend component tests (vitest)
- Integration test: scrape → analyze → digest flow

## Security Considerations
- API key protection (env vars)
- Rate limiting on all endpoints
- Sanitize scraped content before display
- JWT expiration and refresh
- HTTPS only (via Cloudflare tunnel)

## Success Metrics
- Scraping succeeds >95% of the time
- AI analysis completes in <5s per update
- Daily digest sent by configured time
- Relevance scoring correlates with user feedback
- Dashboard loads in <2s

## MVP Scope (v1)
**Included:**
- Auth + basic settings
- FDA + ClinicalTrials.gov scraping
- Claude summarization + relevance scoring
- Daily email digest (SMTP2Go)
- Feed view with filters
- Basic search

**Deferred (v2):**
- EMA scraping (more complex)
- Real-time alerts
- Analytics dashboard
- Saved searches
- Multi-user/team features
- Mobile app

## Deployment
- Deploy to Dokploy on MachomeLab
- Domain: `regulatoryradar.machomelab.com`
- Cloudflare tunnel for HTTPS
- Cron job for scheduled scraping (use backend's APScheduler or similar)
