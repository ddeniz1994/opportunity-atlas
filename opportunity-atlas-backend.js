import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import Parser from "rss-parser";
import fetch from "node-fetch";
import pkg from "pg";
import cron from "node-cron";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const app = express();
app.use(cors());
app.use(express.json());

const client = new Anthropic();
const parser = new Parser({
  customFields: {
    item: [["media:thumbnail", "thumbnail"]],
  },
});

// Database setup with PostgreSQL (or SQLite fallback)
let db;
const isDev = process.env.NODE_ENV !== "production";

async function initDb() {
  if (isDev && !process.env.DATABASE_URL) {
    console.log("⚠️  Using in-memory SQLite (dev mode)");
    const sqlite3 = (await import("sqlite3")).default;
    const { open } = await import("sqlite");
    
    db = await open({
      filename: ":memory:",
      driver: sqlite3.Database,
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        url TEXT,
        description TEXT,
        category TEXT,
        relevance_score INTEGER,
        action_hint TEXT,
        tags TEXT,
        is_premium BOOLEAN,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        fetched_date TEXT
      );

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        url TEXT,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS fetch_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        item_count INTEGER,
        status TEXT
      );
    `);
  } else {
    // PostgreSQL for production
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

    db = {
      query: async (text, params) => {
        const result = await pool.query(text, params);
        return result.rows;
      },
      run: async (text, params) => {
        await pool.query(text, params);
      },
      all: async (text, params) => {
        const result = await pool.query(text, params);
        return result.rows;
      },
      get: async (text, params) => {
        const result = await pool.query(text, params);
        return result.rows[0];
      },
      exec: async (text) => {
        const statements = text.split(";").filter((s) => s.trim());
        for (const stmt of statements) {
          await pool.query(stmt);
        }
      },
    };

    // Create tables if not exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS opportunities (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        url TEXT,
        description TEXT,
        category TEXT,
        relevance_score INTEGER,
        action_hint TEXT,
        tags JSONB,
        is_premium BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fetched_date DATE
      );

      CREATE TABLE IF NOT EXISTS sources (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE,
        url TEXT,
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS fetch_logs (
        id SERIAL PRIMARY KEY,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        item_count INTEGER,
        status TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_category ON opportunities(category);
      CREATE INDEX IF NOT EXISTS idx_relevance ON opportunities(relevance_score DESC);
      CREATE INDEX IF NOT EXISTS idx_fetched_date ON opportunities(fetched_date DESC);
    `);
  }

  // Insert source feeds
  const sources = [
    { name: "TechCrunch", url: "https://feeds.techcrunch.com/feed/", type: "rss" },
    { name: "Product Hunt", url: "https://www.producthunt.com/feed", type: "rss" },
    { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", type: "rss" },
    { name: "Y Combinator", url: "https://ycombinator.com/feed/", type: "rss" },
  ];

  for (const source of sources) {
    try {
      await db.run(
        `INSERT INTO sources (name, url, type) VALUES ($1, $2, $3) 
         ON CONFLICT (name) DO NOTHING`,
        [source.name, source.url, source.type]
      );
    } catch (err) {
      console.log(`Source ${source.name} already exists`);
    }
  }
}

// Fetch RSS feeds with timeout and error handling
async function fetchRssFeeds() {
  const sources = await db.all("SELECT * FROM sources WHERE type = 'rss'");
  const items = [];

  for (const source of sources) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      
      const feedPromise = parser.parseURL(source.url);
      const feed = await Promise.race([feedPromise, timeoutPromise]);
      
      const feedItems = feed.items.slice(0, 5).map((item) => ({
        title: item.title || "No title",
        source: source.name,
        url: item.link || "",
        description: item.content || item.contentSnippet || "",
        pubDate: item.pubDate || new Date().toISOString(),
      }));
      items.push(...feedItems);
      console.log(`✓ Fetched ${feedItems.length} items from ${source.name}`);
    } catch (err) {
      console.error(`✗ Failed to fetch ${source.name}:`, err.message);
    }
  }

  return items;
}

// Process with Claude AI (with error handling)
async function processWithClaude(items) {
  if (items.length === 0) throw new Error("No items to process");

  const itemTexts = items
    .map(
      (item, idx) =>
        `[${idx}] Title: ${item.title}\nSource: ${item.source}\nDesc: ${item.description.substring(0, 200)}`
    )
    .join("\n\n");

  const prompt = `You are a growth analyst. Analyze these news items and return a JSON array with:
- index: original index (number)
- category: one of "product_launches", "funding", "market_expansion", "market_trends", "regulatory", "industry_data"
- relevance: 1-100 integer (how relevant to growth teams)
- is_premium: true/false (premium: funding, regulatory, trends, data)
- action_hint: 1 sentence actionable insight for growth teams
- tags: array of 2-3 strings

News items:
${itemTexts}

Return ONLY valid JSON array. Example: [{"index":0,"category":"product_launches","relevance":85,"is_premium":false,"action_hint":"...","tags":["tag1","tag2"]}]`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-20250805",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0].text;
    const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const processed = JSON.parse(cleanedContent);

    if (!Array.isArray(processed)) throw new Error("Response is not array");
    return processed;
  } catch (err) {
    console.error("Claude processing error:", err.message);
    throw err;
  }
}

// Store opportunities in database (deduped by title + source)
async function storeOpportunities(items, processed) {
  let stored = 0;
  
  for (const proc of processed) {
    try {
      const item = items[proc.index];
      if (!item) continue;

      const today = new Date().toISOString().split("T")[0];
      
      // Check if already exists today (dedupe)
      const exists = await db.get(
        `SELECT id FROM opportunities WHERE title = $1 AND source = $2 AND fetched_date = $3`,
        [item.title, item.source, today]
      );

      if (!exists) {
        await db.run(
          `INSERT INTO opportunities 
           (title, source, url, description, category, relevance_score, action_hint, tags, is_premium, fetched_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            item.title,
            item.source,
            item.url,
            item.description.substring(0, 500),
            proc.category,
            proc.relevance,
            proc.action_hint,
            JSON.stringify(proc.tags),
            proc.is_premium ? 1 : 0,
            today,
          ]
        );
        stored++;
      }
    } catch (err) {
      console.error("Store error:", err.message);
    }
  }

  // Log fetch
  await db.run(
    `INSERT INTO fetch_logs (item_count, status) VALUES ($1, $2)`,
    [stored, "success"]
  );

  return stored;
}

// API Routes with better error handling
app.get("/api/opportunities", async (req, res) => {
  try {
    const { category, premium = false, limit = 20 } = req.query;

    let query = "SELECT * FROM opportunities WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (category && category !== "all") {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    if (premium === "false") {
      query += ` AND is_premium = false`;
    } else if (premium === "true") {
      query += ` AND is_premium = true`;
    }

    query += ` ORDER BY relevance_score DESC, created_at DESC LIMIT $${paramCount}`;
    params.push(Math.min(parseInt(limit) || 20, 100));

    const opportunities = await db.all(query, params);

    const formatted = opportunities.map((opp) => ({
      ...opp,
      tags: typeof opp.tags === "string" ? JSON.parse(opp.tags) : opp.tags,
    }));

    res.json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (err) {
    console.error("GET /opportunities error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/opportunities/:id", async (req, res) => {
  try {
    const opp = await db.get(
      "SELECT * FROM opportunities WHERE id = $1",
      [parseInt(req.params.id)]
    );

    if (!opp) {
      return res.status(404).json({ success: false, error: "Not found" });
    }

    res.json({
      success: true,
      data: {
        ...opp,
        tags: typeof opp.tags === "string" ? JSON.parse(opp.tags) : opp.tags,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch and process (manual trigger)
app.post("/api/fetch", async (req, res) => {
  try {
    console.log("🔄 Fetching RSS feeds...");
    const items = await fetchRssFeeds();

    if (items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "No items fetched from feeds" });
    }

    console.log(`🤖 Processing ${items.length} items with Claude...`);
    const processed = await processWithClaude(items);

    console.log("💾 Storing in database...");
    const stored = await storeOpportunities(items, processed);

    res.json({
      success: true,
      message: `Processed ${items.length} opportunities, stored ${stored} new items`,
      fetched: items.length,
      stored: stored,
    });
  } catch (err) {
    console.error("POST /fetch error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const total = await db.get("SELECT COUNT(*) as count FROM opportunities");
    const byCategory = await db.all(
      `SELECT category, COUNT(*) as count FROM opportunities GROUP BY category ORDER BY count DESC`
    );
    const avgRelevance = await db.get(
      "SELECT AVG(relevance_score) as avg FROM opportunities"
    );
    const lastFetch = await db.get(
      `SELECT fetched_at, item_count FROM fetch_logs ORDER BY fetched_at DESC LIMIT 1`
    );

    res.json({
      success: true,
      data: {
        total_opportunities: total.count || 0,
        by_category: byCategory,
        avg_relevance: Math.round(avgRelevance.avg || 0),
        last_fetch: lastFetch,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
  });
});

// Scheduled fetching (every 6 hours in production)
let fetchScheduled = false;

function scheduleAutoFetch() {
  if (fetchScheduled) return;
  
  // Run fetch every 6 hours (0, 6, 12, 18)
  cron.schedule("0 */6 * * *", async () => {
    console.log("⏰ Running scheduled fetch...");
    try {
      const items = await fetchRssFeeds();
      if (items.length > 0) {
        const processed = await processWithClaude(items);
        const stored = await storeOpportunities(items, processed);
        console.log(`✅ Scheduled fetch: stored ${stored} new items`);
      }
    } catch (err) {
      console.error("❌ Scheduled fetch failed:", err.message);
    }
  });

  // Also run once on startup (after 30 seconds)
  setTimeout(async () => {
    console.log("🚀 Running initial fetch on startup...");
    try {
      const items = await fetchRssFeeds();
      if (items.length > 0) {
        const processed = await processWithClaude(items);
        const stored = await storeOpportunities(items, processed);
        console.log(`✅ Initial fetch: stored ${stored} items`);
      }
    } catch (err) {
      console.error("❌ Initial fetch failed:", err.message);
    }
  }, 30000);

  fetchScheduled = true;
}

// Initialize and start
async function start() {
  try {
    await initDb();
    console.log("✓ Database initialized");

    scheduleAutoFetch();
    console.log("✓ Scheduled fetching enabled (every 6 hours)");

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`\n🎯 Opportunity Atlas API running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  GET  /api/opportunities?category=product_launches&premium=false&limit=20`);
      console.log(`  GET  /api/opportunities/:id`);
      console.log(`  POST /api/fetch (manual refresh)`);
      console.log(`  GET  /api/stats`);
      console.log(`  GET  /api/health`);
      console.log(`\n💡 Auto-fetch scheduled every 6 hours + initial fetch in 30s`);
      console.log(`\n📝 Database: ${process.env.DATABASE_URL ? "PostgreSQL" : "SQLite (in-memory)"}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
}

start();
