# Deploy Opportunity Atlas to Railway

Railway makes deploying Node.js apps super easy. This guide walks you through it.

## What You Get

- **Production database** — PostgreSQL (included in Railway)
- **Auto-scaling** — Handles traffic spikes
- **Environment variables** — Secure API key storage
- **Scheduled jobs** — Auto-fetch every 6 hours
- **Free tier** — $5/month (usually covers hobby projects)

## Step 1: Prepare GitHub (5 mins)

You'll need the code in a GitHub repo for Railway to deploy.

```bash
# In your project directory
git init
git add .
git commit -m "Initial Opportunity Atlas backend"

# Create repo on GitHub (via github.com) then:
git remote add origin https://github.com/YOUR_USERNAME/opportunity-atlas.git
git push -u origin main
```

## Step 2: Create Railway Project (2 mins)

1. Go to **https://railway.app**
2. Sign up with GitHub
3. Click **New Project** → **Deploy from GitHub**
4. Select your `opportunity-atlas` repo
5. Railway auto-detects Node.js and deploys 🚀

## Step 3: Add PostgreSQL Database (1 min)

1. In Railway dashboard, click **Add Service**
2. Select **PostgreSQL**
3. Railway creates a database automatically
4. Copy the `DATABASE_URL` (you'll need this)

## Step 4: Set Environment Variables (2 mins)

1. Go to your Railway project **Settings**
2. Click **Variables**
3. Add these:

```
ANTHROPIC_API_KEY=sk-ant-...          # Your Claude API key
NODE_ENV=production
DATABASE_URL=postgresql://...         # Auto-filled by Railway
PORT=3001
```

**Where to get ANTHROPIC_API_KEY:**
1. Go to **https://console.anthropic.com/account/keys**
2. Create new API key
3. Paste it in Railway

## Step 5: Deploy! (1 min)

1. Click **Deploy** button in Railway
2. Wait for build to finish (~2 mins)
3. Check **Deployments** tab for status

Once deployed, you'll get a public URL like:
```
https://opportunity-atlas-prod-abc123.railway.app
```

## Test Your Deployment

```bash
# Replace with your actual Railway URL
DEPLOY_URL="https://opportunity-atlas-prod-abc123.railway.app"

# Check health
curl $DEPLOY_URL/api/health

# Get opportunities
curl "$DEPLOY_URL/api/opportunities?limit=5"

# Trigger fetch (warning: this might use API calls)
curl -X POST $DEPLOY_URL/api/fetch
```

## Auto-Fetching in Production

The backend automatically:
- ✅ Fetches news on startup
- ✅ Fetches every 6 hours via cron
- ✅ Stores in PostgreSQL (persists data)
- ✅ Deduplicates (same item not stored twice)

You don't need to do anything! Data refreshes automatically.

## Connect Frontend

Update your React frontend to use the production URL:

```javascript
// In opportunity-atlas-mvp.jsx
const API_URL = "https://opportunity-atlas-prod-abc123.railway.app";

useEffect(() => {
  fetch(`${API_URL}/api/opportunities?premium=${isPremium}`)
    .then(r => r.json())
    .then(data => setOpportunities(data.data))
}, [isPremium]);
```

## Monitoring & Logs

In Railway dashboard:
1. Click **Logs** to see real-time output
2. Look for "✅ Scheduled fetch" messages (every 6 hours)
3. Check "❌ errors" if something breaks

```
✓ Database initialized
✓ Scheduled fetching enabled (every 6 hours)
🎯 Opportunity Atlas API running on http://localhost:3001
🚀 Running initial fetch on startup...
✅ Initial fetch: stored 8 items
⏰ Running scheduled fetch...
✅ Scheduled fetch: stored 3 new items
```

## Pricing & Costs

**Free tier (~$5/month):**
- 500 MB PostgreSQL storage
- 100 GB bandwidth
- Good for MVP

**When you grow:**
- Pay-as-you-go ($0.10/GB bandwidth)
- Scale database as needed
- Usually $10-50/month for small SaaS

## Troubleshooting

**"Build failed"**
- Check Node.js version (need >=18)
- Check package.json syntax
- See Railway logs for details

**"Database connection error"**
- Verify DATABASE_URL is set
- Check PostgreSQL service is running in Railway
- Restart the service

**"No data showing"**
- First fetch takes 30 seconds
- Check logs: "Running initial fetch..."
- Manual fetch: `curl -X POST $DEPLOY_URL/api/fetch`

**"API key invalid"**
- Verify ANTHROPIC_API_KEY is correct
- Check it starts with `sk-ant-`
- No spaces or extra characters

## Next: Connect Frontend

Once deployed, update the React component to point to your Railway URL instead of localhost.

Then proceed to **Step 2: Slack Integration** 🎯
