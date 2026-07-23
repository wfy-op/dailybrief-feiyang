import assert from "node:assert/strict";

import {
  buildDailyAddons,
  buildFinanceTopicClusters,
  buildSourceHealthFromArticles,
} from "../lib/daily-addons";
import type { DailyReport, ArticleInput } from "../lib/ai/pipeline";
import type { SourceDef } from "../lib/sources/types";

const report: DailyReport = {
  hero_headline: "AI and markets move together",
  daily_overview: "Overview",
  tech_briefs: [
    {
      title: "OpenAI updates coding model",
      url: "https://example.com/openai",
      source: "OpenAI",
      summary: "AI 工具链继续向开发工作流渗透。",
      importance: 9,
    },
  ],
  finance_briefs: [
    {
      title: "Markets rotate back into AI infrastructure",
      url: "https://example.com/markets",
      source: "Financial Times",
      summary: "资金重新关注 AI 基建和半导体链条。",
      importance: 8,
    },
  ],
  politics_briefs: [
    {
      title: "New export control policy",
      url: "https://example.com/policy",
      source: "Reuters",
      summary: "政策变化可能影响半导体供应链。",
      importance: 7,
    },
  ],
  editor_note: "note",
  keywords: ["AI", "markets"],
  financial_analysis: {
    generated_at: "2026-06-05T00:00:00.000Z",
    market_date: "2026-06-04",
    overview: "A股放量上涨，美股科技分化。",
    trend_summary: "A股风险偏好回升，AI/算力和半导体领涨。",
    outlook: {
      a_share: "基准判断看震荡偏强。",
      us_market: "美股需要观察 AI 硬件链能否止跌。",
      key_sectors: "半导体、光通信和机器人是重点。",
      megacaps: "NVDA、AVGO、MSFT 仍是观察核心。",
      scenarios: ["如果成交量延续，则成长风格占优。"],
    },
    a_share: {
      overview: "A股大涨。",
      indices: [],
      sectors: [],
      strongest_sectors: [],
      weakest_sectors: [],
    },
    us_market: {
      overview: "美股分化。",
      indices: [],
      megacaps: [],
      leading_megacaps: [],
      lagging_megacaps: [],
    },
    cross_market: ["VIX 回落支持风险资产。"],
    instruments: [],
    risk_caveat: "不构成投资建议。",
  },
  academic_radar: {
    generated_at: "2026-06-05T00:00:00.000Z",
    profile:
      "PCSEL / CWT / FDTD / FEM / COMSOL / Lumerical / nanophotonics",
    items: [
      {
        id: "paper-1",
        title: "Photonic crystal laser inverse design",
        title_en: "Photonic crystal laser inverse design",
        title_zh: "光子晶体激光器逆向设计",
        url: "https://example.com/paper",
        source: "arXiv",
        summary:
          "This paper studies inverse design for photonic crystal lasers.",
        abstract_en:
          "This paper studies inverse design for photonic crystal lasers.",
        summary_zh: "本文研究光子晶体激光器的逆向设计。",
        abstract_zh: "本文研究光子晶体激光器的逆向设计。",
        authors: [],
        tags: ["PCSEL"],
        published_at: "2026-06-05",
        why_relevant: "可转成 PCSEL / FDTD 验证 case。",
        why_this_matters: "可转成 PCSEL / FDTD 验证 case。",
        relevance: "PCSEL directly relevant",
        score: 9,
        priority: "must-read",
        action: "加入待阅读",
        matched_terms: ["PCSEL"],
        is_new: true,
      },
    ],
    deep_read_candidates: [],
    new_items_count: 1,
    source_notes: [],
    risk_caveat: "metadata based",
  },
};

const creatorArticles: ArticleInput[] = [
  {
    sourceId: "macro-is-dead",
    source: "Macro Is Dead",
    title: "Macro view says $SIVE may be a CPO laser chokepoint",
    localizedTitle: "Macro Is Dead 讨论CPO激光链条风险",
    url: "https://x.com/aleabitoreddit/status/1",
    excerpt: "Tweet from @aleabitoreddit (opinion/NFA): $SIVE CPO CW laser",
    summary: "Macro Is Dead 测试夹具用于覆盖CPO和CW激光器链条聚类。",
    category: "finance",
    publishedAt: new Date("2026-06-05T02:00:00Z"),
  },
  {
    sourceId: "macro-is-dead",
    source: "Macro Is Dead",
    title: "Macro view likes $AAOI for 800G and 1.6T optical modules",
    localizedTitle: "Macro Is Dead 讨论高速光模块需求",
    url: "https://x.com/aleabitoreddit/status/2",
    excerpt: "Tweet from @aleabitoreddit (opinion/NFA): $AAOI optical module",
    summary: "Macro Is Dead 测试夹具用于覆盖800G与1.6T需求聚类。",
    category: "finance",
    publishedAt: new Date("2026-06-05T01:00:00Z"),
  },
  {
    sourceId: "macro-compass",
    source: "The Macro Compass",
    title: "Fed rates and dollar liquidity",
    url: "https://example.com/macro",
    excerpt: "Macro rates and liquidity setup.",
    summary: "利率和美元流动性仍是风险资产的重要变量。",
    category: "finance",
    publishedAt: new Date("2026-06-04T23:00:00Z"),
  },
];

const sourceRegistry: SourceDef[] = [
  {
    id: "macro-is-dead",
    name: "Macro Is Dead",
    type: "rss",
    url: "https://example.com",
    category: "finance",
    subcategory: "creator",
  },
  {
    id: "macro-compass",
    name: "The Macro Compass",
    type: "rss",
    url: "https://example.com",
    category: "finance",
    subcategory: "creator",
  },
  {
    id: "linuxdo",
    name: "LinuxDo",
    type: "api",
    url: "https://linux.do/top.json",
    category: "tech",
    subcategory: "cn-community",
    hideWhenEmpty: true,
  },
];

const financeTopics = buildFinanceTopicClusters(creatorArticles, sourceRegistry);
assert.equal(financeTopics.length, 2);
assert.equal(financeTopics[0].title, "CPO/光通信与硅光");
assert.deepEqual(financeTopics[0].tickers, ["AAOI", "SIVE"]);
assert.equal(financeTopics[0].items.length, 2);
assert.match(financeTopics[0].signal, /瓶颈|光模块|观点信号/);

const sourceHealth = buildSourceHealthFromArticles(creatorArticles, sourceRegistry);
const linuxDoHealth = sourceHealth.items.find((item) => item.id === "linuxdo");
assert.equal(linuxDoHealth?.status, "empty");
assert.equal(linuxDoHealth?.count, 0);

const enriched = buildDailyAddons(report, creatorArticles, sourceRegistry, sourceHealth);
assert.ok(enriched.top_reads);
assert.ok(enriched.finance_topics);
assert.ok(enriched.source_health);
assert.ok(enriched.top_reads.length <= 7);
assert.equal(enriched.top_reads[0].category, "finance");
assert.match(enriched.top_reads[0].title, /A股|市场|金融/);
assert.equal(enriched.finance_topics[0].title, "CPO/光通信与硅光");
assert.equal(enriched.source_health.summary.failed, 0);

console.log("PASS daily addons");
