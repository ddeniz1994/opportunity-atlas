import React, { useState, useEffect } from 'react';
import { TrendingUp, Unlock, Lock, ExternalLink, Filter } from 'lucide-react';

export default function OpportunityAtlas() {
  const [opportunities, setOpportunities] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);

  // Mock data + structure for real integration
  const mockOpportunities = [
    {
      id: 1,
      title: "OpenAI Releases o1 Model - Reasoning Capabilities",
      source: "TechCrunch",
      category: "product_launches",
      date: "Today",
      relevance: 95,
      isPremium: false,
      actionHint: "AI-first products can leverage reasoning APIs - consider positioning as AI-native solution",
      tags: ["AI", "API", "Product"]
    },
    {
      id: 2,
      title: "Figma Raises Series C at $10B Valuation",
      source: "TechCrunch",
      category: "funding",
      date: "2 days ago",
      relevance: 75,
      isPremium: true,
      actionHint: "Design tools gaining adoption - explore design-centric B2B partnerships",
      tags: ["Funding", "Design", "Opportunity"]
    },
    {
      id: 3,
      title: "EU Digital Markets Act Enforcement Begins",
      source: "The Verge",
      category: "regulatory",
      date: "1 week ago",
      relevance: 85,
      isPremium: true,
      actionHint: "Compliance-as-service opportunity - European market needs DMA-ready solutions",
      tags: ["Regulation", "EU", "Market"]
    },
    {
      id: 4,
      title: "Anthropic Raises $5B for Claude Model Development",
      source: "Bloomberg",
      category: "funding",
      date: "3 days ago",
      relevance: 88,
      isPremium: false,
      actionHint: "Claude ecosystem growing - LLM integrations becoming standard, partner opportunities",
      tags: ["AI", "Funding", "Partnership"]
    },
    {
      id: 5,
      title: "Stripe Expands to 50 New Markets This Quarter",
      source: "Stripe Blog",
      category: "market_expansion",
      date: "Today",
      relevance: 92,
      isPremium: false,
      actionHint: "Global payment expansion = untapped markets for SaaS - geographic expansion plays",
      tags: ["Expansion", "Growth", "Market"]
    },
    {
      id: 6,
      title: "Gen Z Preferences Shift Away from TikTok - YouTube Shorts Gains 30%",
      source: "eMarketer",
      category: "market_trends",
      date: "4 days ago",
      relevance: 78,
      isPremium: true,
      actionHint: "Content strategy shift needed - YouTube Shorts optimization becoming table stakes",
      tags: ["Social", "Trend", "Content"]
    },
    {
      id: 7,
      title: "Notion Releases Database API - Automation Market Opens",
      source: "Notion Blog",
      category: "product_launches",
      date: "2 weeks ago",
      relevance: 82,
      isPremium: false,
      actionHint: "No-code automation expanding - build Notion integrations as growth lever",
      tags: ["API", "No-Code", "Integration"]
    },
    {
      id: 8,
      title: "B2B SaaS CAC Recovery Time Down to 14 Months (2024 Benchmark)",
      source: "OpenView Partners",
      category: "industry_data",
      date: "5 days ago",
      relevance: 71,
      isPremium: true,
      actionHint: "Unit economics improving - acquisition efficiency is now competitive advantage",
      tags: ["Data", "SaaS", "Growth"]
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setOpportunities(mockOpportunities);
      setLoading(false);
    }, 800);
  }, []);

  const categoryConfig = {
    all: { label: "All Sources", icon: "🌍", free: true },
    product_launches: { label: "Product Launches", icon: "🚀", free: true },
    funding: { label: "Funding News", icon: "💰", free: false },
    market_expansion: { label: "Market Expansion", icon: "📈", free: true },
    market_trends: { label: "Market Trends", icon: "📊", free: false },
    regulatory: { label: "Regulatory", icon: "⚖️", free: false },
    industry_data: { label: "Industry Data", icon: "📉", free: false },
  };

  const filteredOps = selectedCategory === 'all' 
    ? opportunities 
    : opportunities.filter(o => o.category === selectedCategory);

  const displayedOps = isPremium 
    ? filteredOps 
    : filteredOps.filter(o => !o.isPremium);

  const handleCategoryClick = (cat) => {
    if (!isPremium && categoryConfig[cat] && !categoryConfig[cat].free) {
      return; // Can't access premium categories
    }
    setSelectedCategory(cat);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                ◆ Opportunity Atlas
              </h1>
              <p className="text-slate-400 text-sm mt-1">Growth intelligence, daily curated</p>
            </div>
            <button
              onClick={() => setIsPremium(!isPremium)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                isPremium
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-100 hover:bg-slate-600'
              }`}
            >
              {isPremium ? '✓ Premium' : 'Upgrade'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filter Bar */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 text-sm font-medium">FILTER BY</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(categoryConfig).map(([key, config]) => {
              const isLocked = !isPremium && !config.free && key !== 'all';
              const isSelected = selectedCategory === key;
              
              return (
                <button
                  key={key}
                  onClick={() => handleCategoryClick(key)}
                  disabled={isLocked}
                  className={`p-3 rounded-lg transition-all text-left group relative overflow-hidden ${
                    isSelected
                      ? 'bg-cyan-600 text-white ring-2 ring-cyan-400/50'
                      : isLocked
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-lg">{config.icon}</span>
                    {isLocked && <Lock className="w-3 h-3" />}
                  </div>
                  <span className="text-xs font-semibold mt-2 block">{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opportunities Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="w-12 h-12 border-3 border-slate-600 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-slate-400 mt-4">Scanning opportunity sources...</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {selectedCategory === 'all' ? 'All Opportunities' : categoryConfig[selectedCategory]?.label}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {displayedOps.length} opportunities {!isPremium && '(free tier)'}
                </p>
              </div>
            </div>

            {displayedOps.length === 0 ? (
              <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 mb-4">Premium sources locked</p>
                <button
                  onClick={() => setIsPremium(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Unlock Premium
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedOps.map((opp) => (
                  <div
                    key={opp.id}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600/80 transition-all group cursor-pointer hover:shadow-lg hover:shadow-cyan-500/10"
                  >
                    {/* Header with premium badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                          {opp.title}
                        </h3>
                      </div>
                      {opp.isPremium && !isPremium && (
                        <Lock className="w-4 h-4 text-amber-500 ml-2 flex-shrink-0" />
                      )}
                    </div>

                    {/* Source + Date */}
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <span className="px-2 py-1 bg-slate-700/50 rounded text-slate-300">
                        {opp.source}
                      </span>
                      <span className="text-slate-500">{opp.date}</span>
                    </div>

                    {/* Relevance Score */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-400">Relevance</span>
                        <span className="text-xs font-bold text-cyan-400">{opp.relevance}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${opp.relevance}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action Hint */}
                    <div className="mb-3 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-100">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      {opp.actionHint}
                    </div>

                    {/* Tags */}
                    <div className="flex gap-1 flex-wrap mb-3">
                      {opp.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Footer */}
                    <a
                      href="#"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Learn more <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Premium CTA */}
        {!isPremium && filteredOps.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-lg p-6 text-center">
            <h3 className="text-lg font-bold text-white mb-2">Unlock Advanced Insights</h3>
            <p className="text-slate-300 text-sm mb-4">
              Get regulatory alerts, market trends, industry benchmarks, and more
            </p>
            <button
              onClick={() => setIsPremium(true)}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-cyan-500/20"
            >
              <Unlock className="w-4 h-4 inline mr-2" />
              Upgrade to Premium
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
