# Opportunity Atlas - Backend Setup Guide

## What This Does

This Node.js backend:
1. **Aggregates news** from multiple RSS feeds (TechCrunch, Product Hunt, The Verge, etc.)
2. **Filters with Claude AI** — categorizes, scores relevance, generates action hints
3. **Stores in SQLite** — no external DB needed, everything local
4. **Serves REST API** — frontend connects here

## Quick Start

### 1. Prerequisites
- Node.js 18+ 
- Claude API key (set `ANTHROPIC_API_KEY` env var)

### 2. Install & Setup
```bash
# Install dependencies
npm install

# Set your Claude API key
export ANTHROPIC_API_KEY="sk-ant-..."

# Start the server
npm start
```

Server runs on `http://localhost:3001`

### 3. Fetch Initial Data
```bash
# Terminal 1: Keep server running
npm start

# Terminal 2: Fetch news and process
curl -X POST http://localhost:3001/api/fetch
```

This will:
- Fetch latest from 5 RSS feeds
- Send to Claude for intelligent analysis
- Store in database
- Return results

## API Endpoints

### GET /api/opportunities
Get filtered opportunities.

**Query params:**
- `category` — "product_launches", "funding", "market_expansion", "market_trends", "regulatory", "industry_data", or "all" (default: all)
- `premium` — "true"/"false" (default: false)
- `limit` — max results (default: 20)

**Examples:**
```bash
# Free opportunities only
curl http://localhost:3001/api/opportunities?premium=false

# Product launches
curl http://localhost:3001/api/opportunities?category=product_launches

# All premium content
curl http://localhost:3001/api/opportunities?premium=true

# Regulatory + funding (premium), limit 10
curl "http://localhost:3001/api/opportunities?premium=true&limit=10"
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "title": "OpenAI Releases o1 Model",
      "source": "TechCrunch",
      "url": "https://...",
      "category": "product_launches",
      "relevance_score": 92,
      "action_hint": "AI-first products can leverage reasoning APIs",
      "tags": ["AI", "Product", "API"],
      "is_premium": 0,
      "created_at": "2025-04-30T10:30:00Z"
    }
  ]
}
```

### GET /api/opportunities/:id
Get single opportunity by ID.

```bash
curl http://localhost:3001/api/opportunities/1
```

### POST /api/fetch
Refresh feeds (fetch latest news and process).

```bash
curl -X POST http://localhost:3001/api/fetch
```

**Response:**
```json
{
  "success": true,
  "message": "Processed 15 opportunities",
  "count": 15
}
```

### GET /api/stats
Get aggregate stats.

```bash
curl http://localhost:3001/api/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_opportunities": 42,
    "by_category": [
      { "category": "product_launches", "count": 12 },
      { "category": "funding", "count": 8 }
    ],
    "avg_relevance": 81
  }
}
```

### GET /api/health
Health check.

```bash
curl http://localhost:3001/api/health
```

## How Claude Filtering Works

Each fetched news item goes to Claude with this prompt:

1. **Input**: Title, source, description
2. **Claude analyzes**:
   - Category (product_launches, funding, regulatory, etc.)
   - Relevance score (1-100) for growth teams
   - Is it premium-tier content?
   - Action hint (what should growth teams *do* about this?)
   - Tags (3 contextual tags)
3. **Stored** in database with all metadata

Example:
- **Input**: "OpenAI Releases o1 Model - Advanced Reasoning"
- **Claude Output**:
  ```json
  {
    "category": "product_launches",
    "relevance": 95,
    "is_premium": false,
    "action_hint": "AI products can integrate reasoning APIs - position as AI-native solution",
    "tags": ["AI", "API", "Product"]
  }
  ```

## Database Schema

SQLite (in-memory for MVP, can persist to file).

```sql
-- Opportunities table
opportunities:
  - id (primary key)
  - title (news headline)
  - source (TechCrunch, Product Hunt, etc.)
  - url (link to full article)
  - description (snippet)
  - category (enum)
  - relevance_score (1-100)
  - action_hint (growth team action)
  - tags (JSON array)
  - is_premium (boolean)
  - created_at (timestamp)
  - fetched_date (YYYY-MM-DD)

-- Sources table (RSS feeds)
sources:
  - id
  - name
  - url
  - type (rss/scrape)
```

## News Sources (Built-in)

Currently fetches from:
1. **TechCrunch** — Product launches, funding
2. **Product Hunt** — New products, trending
3. **Hacker News** — Engineering, founder stories
4. **The Verge** — Tech news, regulations
5. **Y Combinator** — Startup news, trends

To add more sources, edit the `sources` array in backend code.

## Adding to Frontend

The React component (`opportunity-atlas-mvp.jsx`) can connect like this:

```javascript
useEffect(() => {
  fetch('http://localhost:3001/api/opportunities?premium=' + isPremium)
    .then(r => r.json())
    .then(data => setOpportunities(data.data))
}, [isPremium]);
```

## Production Considerations

**For actual deployment:**
1. **Persistent DB** — Use PostgreSQL/Supabase instead of in-memory SQLite
2. **Scheduled fetching** — Add cron job (node-cron) to fetch every 6 hours
3. **Authentication** — Add JWT/API keys for frontend
4. **Rate limiting** — Protect /fetch endpoint
5. **Caching** — Redis cache popular queries
6. **Error handling** — Better logging, alerting on fetch failures
7. **Source expansion** — Add more feeds (Twitter API, Bloomberg, Reuters)
8. **Web scraping** — Implement scraper for non-RSS sources (Hacker News)

## Development

```bash
# Watch mode (auto-restart on changes)
npm run dev

# Test endpoints
npm run test:opportunities
npm run test:stats
```

## Troubleshooting

**"ANTHROPIC_API_KEY not found"**
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
npm start
```

**"Failed to fetch RSS"**
- Check feed URL is valid
- Some feeds may require User-Agent headers
- Consider timeout increase for slow feeds

**"JSON parse error"**
- Claude response format changed
- Check API response in console logs
- Adjust prompt if needed

## Next Steps

1. ✅ Backend aggregation working
2. 🔲 Connect React frontend to this API
3. 🔲 Add Slack bot integration
4. 🔲 Implement user authentication
5. 🔲 Add web scraping for non-RSS sources
6. 🔲 Deploy to production (Railway, Fly.io)
7. 🔲 Add scheduled daily fetching

## Questions?

This is fully functional MVP. Extend as needed!
