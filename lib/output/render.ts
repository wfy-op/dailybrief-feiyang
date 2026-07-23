import type {
  ArticleInput,
  BriefItem,
  DailyReport,
  TradingSection,
} from "../ai/pipeline";
import type { WatchlistPick } from "../ai/trading-commentary";
import { REPORT_LOCALE } from "../sources/registry";
import { getReportTz } from "../utils";
import type { Category, SourceDef } from "../sources/types";
import { V2EX_OFF_TOPIC_RE } from "../sources/v2ex";
import type { TickerAnalysis } from "../trading/signals";
import {
  getAssetGroupLabels,
  ASSET_GROUP_ORDER,
  type AssetGroup,
} from "../trading/watchlist";
import type {
  FinancialAnalysisSection,
  FinancialInstrumentSnapshot,
} from "../financial-analysis/types";
import type {
  AcademicPaperItem,
  AcademicRadarSection,
} from "../academic-radar";
import type {
  FinanceTopicCluster,
  SourceHealthSection,
  SourceHealthStatus,
  TopReadCategory,
  TopReadItem,
} from "../daily-addons";

// ----- i18n -----

/**
 * Localized UI strings. `t` resolves to TEXTS_ZH or TEXTS_EN at module
 * init based on REPORT_LOCALE. All hardcoded display text routes through
 * this object so adding a third locale = adding one more table.
 */
const TEXTS_ZH = {
  siteTitle: "每日简报",
  catTech: "技术动态",
  catFinance: "财经要点",
  catPolitics: "时政观察",
  catTrading: "市场行情",
  catTopReads: "今日必读",
  catFinancialAnalysis: "金融分析",
  catAcademic: "学术雷达",
  catCommunity: "社区讨论",
  subFinanceTopics: "观点聚类",
  subAiNews: "AI 媒体",
  subAiResearch: "AI \u7814\u7a76",
  subXViral: "X 推文",
  subBlogWeekly: "博客周刊",
  subCnCommunity: "中文社区",
  subOverseasCommunity: "海外社区",
  subFinanceNews: "财经新闻",
  subMacro: "\u5b8f\u89c2\u4e0e\u653f\u7b56",
  subFinanceCommunity: "社区讨论",
  subWorld: "国际要闻",
  subOverseasNews: "海外科技",
  subOverseas: "海外",
  emptySource: "该源今日无内容。",
  emptyCategory: "该分类今日无内容。",
  emptyGroup: "该组今日无数据。",
  footer: "内容均来自原媒体，本站仅作摘要整理与回链。",
  summaryLabelNews: "中文摘要",
  summaryLabelIntro: "中文介绍",
  tradingMarketOverview: "市场总览",
  tradingTodayFocus: "今日关注",
  tradingAllAssets: "全部资产",
  tradingRiskCaveat: "风险提示",
  financialMarketDate: "最近交易日",
  financialOverview: "市场复盘",
  financialTrendSummary: "走势总结",
  financialOutlook: "后续趋势研判",
  financialASharesColumn: "A股市场",
  financialAShares: "A股复盘",
  financialAIndices: "大盘指数",
  financialASectors: "A股板块",
  financialUSMarketColumn: "美股市场",
  financialUSMarket: "美股复盘",
  financialUSIndices: "美股大盘",
  financialUSMegacaps: "美股重点公司",
  financialCrossMarket: "跨市场观察",
  financialRiskCaveat: "口径说明",
  topReadReason: "为什么要读",
  financeTopicSignal: "观点信号",
  financeTopicRisk: "验证/风险",
  sourceHealth: "源健康",
  sourceHealthOk: "正常",
  sourceHealthEmpty: "空源",
  sourceHealthFailed: "失败",
  academicProfile: "订阅画像",
  academicMustRead: "今日必看",
  academicDeepRead: "周末深读候选",
  academicWatch: "观察池",
  academicScore: "相关度",
  academicTitleZh: "中文标题",
  academicSummaryZh: "中文摘要",
  academicOriginalTitle: "英文原题",
  academicOriginalSummary: "英文摘要",
  academicWhyRelevant: "为什么与你有关",
  academicNew: "新论文",
  academicFeed: "订阅学术更新",
  academicSourceNotes: "来源说明",
  academicRiskCaveat: "口径说明",
  widgetCryptoFearGreed: "加密恐慌贪婪",
  widgetCryptoCap: "加密总市值",
  widgetBtcDom: "BTC 主导率",
  widgetVolume24h: "24h 成交量",
  widgetActiveCoins: "活跃币",
  ticker5d: "5 日",
  tickerVs52wHigh: "距 52w 高",
  tickerTrend: "趋势",
  tickerMacd: "MACD / 信号",
  signalToday: "今天",
  signalDaysAgoSuffix: "天前",
  trendBullish: "多头",
  trendBearish: "空头",
  trendNeutral: "中性",
  mdTodayOverview: "今日总览",
  mdEditorNote: "编辑短评",
  mdTodayKeywords: "今日关键词",
  mdImportance: "重要度",
  archiveLink: "← 历史归档",
};

const TEXTS_EN: typeof TEXTS_ZH = {
  siteTitle: "Daily Brief",
  catTech: "Tech",
  catFinance: "Finance",
  catPolitics: "World",
  catTrading: "Markets",
  catTopReads: "Must Reads",
  catFinancialAnalysis: "Market Review",
  catAcademic: "Academic Radar",
  catCommunity: "Community",
  subFinanceTopics: "Opinion Clusters",
  subAiNews: "AI Media",
  subAiResearch: "AI Research",
  subXViral: "X Viral",
  subBlogWeekly: "Blog Weekly",
  subCnCommunity: "Chinese Community",
  subOverseasCommunity: "Overseas Community",
  subFinanceNews: "Finance News",
  subMacro: "Macro/Policy",
  subFinanceCommunity: "Community",
  subWorld: "World News",
  subOverseasNews: "Overseas Tech",
  subOverseas: "Overseas",
  emptySource: "No content from this source today.",
  emptyCategory: "No content in this category today.",
  emptyGroup: "No data for this group today.",
  footer:
    "Content sourced from original publishers; this site provides summary and backlinks only.",
  summaryLabelNews: "Summary",
  summaryLabelIntro: "Summary",
  tradingMarketOverview: "Market Overview",
  tradingTodayFocus: "Today's Focus",
  tradingAllAssets: "All Assets",
  tradingRiskCaveat: "Risk Disclaimer",
  financialMarketDate: "Latest Session",
  financialOverview: "Market Review",
  financialTrendSummary: "Trend Summary",
  financialOutlook: "Forward Scenarios",
  financialASharesColumn: "A-share Market",
  financialAShares: "A-share Review",
  financialAIndices: "Mainland Indices",
  financialASectors: "A-share Sectors",
  financialUSMarketColumn: "US Market",
  financialUSMarket: "US Market Review",
  financialUSIndices: "US Indices",
  financialUSMegacaps: "US Mega-caps",
  financialCrossMarket: "Cross-market Notes",
  financialRiskCaveat: "Method Note",
  topReadReason: "Why read",
  financeTopicSignal: "Signal",
  financeTopicRisk: "Validation/Risk",
  sourceHealth: "Source Health",
  sourceHealthOk: "OK",
  sourceHealthEmpty: "Empty",
  sourceHealthFailed: "Failed",
  academicProfile: "Profile",
  academicMustRead: "Must Read",
  academicDeepRead: "Weekend Deep Reads",
  academicWatch: "Watchlist",
  academicScore: "Relevance",
  academicTitleZh: "Chinese Title",
  academicSummaryZh: "Chinese Abstract",
  academicOriginalTitle: "Original Title",
  academicOriginalSummary: "Original Abstract",
  academicWhyRelevant: "Why It Matters",
  academicNew: "NEW",
  academicFeed: "Subscribe",
  academicSourceNotes: "Source Notes",
  academicRiskCaveat: "Method Note",
  widgetCryptoFearGreed: "Crypto Fear/Greed",
  widgetCryptoCap: "Crypto Market Cap",
  widgetBtcDom: "BTC Dominance",
  widgetVolume24h: "24h Volume",
  widgetActiveCoins: "Active coins",
  ticker5d: "5d",
  tickerVs52wHigh: "vs 52w High",
  tickerTrend: "Trend",
  tickerMacd: "MACD / Signal",
  signalToday: "today",
  signalDaysAgoSuffix: "d ago",
  trendBullish: "Bullish",
  trendBearish: "Bearish",
  trendNeutral: "Neutral",
  mdTodayOverview: "Today's Overview",
  mdEditorNote: "Editor's Note",
  mdTodayKeywords: "Keywords",
  mdImportance: "Importance",
  archiveLink: "← Archive",
};

const STR = REPORT_LOCALE === "en" ? TEXTS_EN : TEXTS_ZH;
const ASSET_GROUP_LABELS_LOCALIZED = getAssetGroupLabels(REPORT_LOCALE);

// ----- types -----

export type SourceGroup = {
  sourceId: string;
  sourceName: string;
  items: ArticleInput[];
  /**
   * When true, items come from multiple merged sources and the renderer
   * should label each article with `a.source` since the source-tab row
   * is suppressed (only one synthetic group).
   */
  merged?: boolean;
};

export type SubGroup = {
  id: string;
  name: string;
  sources: SourceGroup[];
};

export type RawByCategory = Record<Category, SubGroup[]>;

// ----- labels & ordering -----

const CATEGORY_LABELS: Record<Category, string> = {
  tech: STR.catTech,
  finance: STR.catFinance,
  politics: STR.catPolitics,
};

const CATEGORY_DIGEST_LABELS: Record<Category, string> = {
  tech: STR.catTech,
  finance: STR.catFinance,
  politics: STR.catPolitics,
};

/**
 * L2 ordering per category. Categories not listed render flat (no L2 tabs).
 */
const SUBCATEGORY_ORDER: Partial<Record<Category, string[]>> = {
  // cn-community + overseas-community are listed last so the L1 "community"
  // panel (rendered separately via TECH_COMMUNITY_SUBS) can extract them.
  // Within the "tech" L1 panel itself, COMMUNITY_SUBS is filtered out.
  // Locale filtering at registry level decides which actually appears:
  // zh mode keeps cn-community (V2EX / LinuxDo); en mode keeps
  // overseas-community (Hacker News / r/stocks).
  tech: ["github-trending", "x-viral", "ai-news", "ai-research", "cn-community", "overseas-community"],
  finance: ["news", "creator", "macro"],
  politics: ["world"],
};

const TECH_MAIN_SUBS = new Set(["github-trending", "x-viral", "ai-news"]);
const TECH_COMMUNITY_SUBS = new Set(["cn-community", "overseas-community"]);

const SUBCATEGORY_LABELS: Record<string, string> = {
  "github-trending": "GitHub Trending",
  "cn-community": STR.subCnCommunity,
  "overseas-community": STR.subOverseasCommunity,
  "ai-news": STR.subAiNews,
  "ai-research": STR.subAiResearch,
  "x-viral": STR.subXViral,
  "blog-weekly": STR.subBlogWeekly,
  news: STR.subFinanceNews,
  creator: "财经博主观察",
  macro: STR.subMacro,
  world: STR.subWorld,
};

/**
 * Per-source item caps in the raw display, keyed by "category:subcategory".
 * Each source inside the subcategory shows up to N items. Missing keys = no cap.
 *
 * Default 20 across all L3-tabbed subcategories keeps each tab a single
 * comfortable scroll instead of 25-30 items. Merged subgroups (blog-weekly,
 * finance:news, politics:world) ignore this — they use MERGED_SUBGROUP_LIMITS.
 */
const SOURCE_DISPLAY_LIMITS: Record<string, number> = {
  "tech:github-trending": 20,
  "tech:cn-community": 10,
  "tech:overseas-community": 10,
  "tech:x-viral": 20,
};

/**
 * Sources whose fetcher returns items already sorted by an engagement/heat
 * algorithm we want to preserve. groupRaw skips its default date-desc sort
 * for these so the final render reflects the source's own ranking.
 */
const PRESERVE_FETCH_ORDER_SOURCES = new Set(["attentionvc-ai"]);

function displayLimitFor(
  category: Category,
  subId: string | undefined,
): number | undefined {
  if (!subId) return undefined;
  return SOURCE_DISPLAY_LIMITS[`${category}:${subId}`];
}

/**
 * Subcategories that should collapse their sources into a single flat
 * time-sorted list (no L3 source tabs), keyed by "category:subcategory".
 * Value = number of items kept after merging. Each rendered article
 * will display its `source` label inline since the per-source tab row
 * is suppressed.
 *
 * Used when:
 *  - sources are heterogeneous but each publishes few items (blog-weekly)
 *  - the user explicitly wants a curated time-sorted feed rather than
 *    per-source browsing (finance:news, only authoritative sources)
 *
 * Exported so daily.ts can read the cap to keep enrichment in sync.
 */
export const MERGED_SUBGROUP_LIMITS: Record<string, number> = {
  "tech:ai-news": 15,
  "tech:ai-research": 10,
  "finance:news": 12,
  "finance:creator": 50,
  "finance:macro": 10,
  "politics:world": 15,
};

/**
 * Politics sources (especially Al Jazeera / BBC / The Diplomat) regularly
 * mix in World Cup / Olympic / football coverage. Filter at the title level
 * so the merged "国际要闻" stream stays politics-only.
 *
 * Pattern is intentionally specific — avoid generic words like "team" or
 * "match" that overlap with diplomacy headlines.
 */
const POLITICS_SPORTS_RE =
  /\b(World\s*Cup|Olympics?|UEFA|FIFA|NBA|NFL|NHL|MLB|ATP|WTA|Premier\s*League|Bundesliga|La\s*Liga|Serie\s*A|Champions\s*League|Eurovision|Wimbledon|Grand\s*Slam|F1|Formula\s*1|Ronaldo|Messi|Mbappe|Beckham|Lukaku|Mitoma|sportsman|footballer|squad)\b|世界杯|奥运|残奥|冬奥|欧冠|英超|西甲|意甲|德甲|网球|足球|篮球|高尔夫|棒球|板球|橄榄球/i;

export function isSportsArticle(title: string): boolean {
  return POLITICS_SPORTS_RE.test(title);
}

function mergedLimitFor(
  category: Category,
  subId: string,
): number | undefined {
  return MERGED_SUBGROUP_LIMITS[`${category}:${subId}`];
}

// ----- grouping -----

export function groupRaw(
  articles: ArticleInput[],
  registry: SourceDef[],
): RawByCategory {
  const subcatOf = new Map<string, string | undefined>();
  for (const s of registry) subcatOf.set(s.id, s.subcategory);
  // Drop articles from sources that have since been disabled — important
  // when scripts/render.ts re-renders against a stale sidecar that still
  // contains the disabled sources' fetched data.
  const enabledIds = new Set(
    registry.filter((s) => s.enabled !== false).map((s) => s.id),
  );

  type Bucket = { sourceName: string; items: ArticleInput[] };
  const buckets: Record<Category, Map<string, Bucket>> = {
    tech: new Map(),
    finance: new Map(),
    politics: new Map(),
  };
  // Pre-seed empty buckets for most enabled sources so per-source-tabbed
  // subcategories can keep stable nav. Fragile community sources may opt out
  // to avoid rendering empty columns when today's public endpoint is blocked.
  for (const s of registry) {
    if (s.enabled === false) continue;
    if (s.hideWhenEmpty === true) continue;
    if (!buckets[s.category].has(s.id)) {
      buckets[s.category].set(s.id, { sourceName: s.name, items: [] });
    }
  }

  for (const a of articles) {
    if (!enabledIds.has(a.sourceId)) continue;
    if (a.category === "politics" && isSportsArticle(a.title)) continue;
    if (
      (a.sourceId === "v2ex-hot" || a.sourceId === "linuxdo") &&
      V2EX_OFF_TOPIC_RE.test(a.title)
    )
      continue;
    const map = buckets[a.category];
    let b = map.get(a.sourceId);
    if (!b) {
      b = { sourceName: a.source, items: [] };
      map.set(a.sourceId, b);
    }
    b.items.push(a);
  }

  for (const cat of Object.keys(buckets) as Category[]) {
    for (const [id, b] of buckets[cat].entries()) {
      if (PRESERVE_FETCH_ORDER_SOURCES.has(id)) continue;
      b.items.sort(
        (a, b) =>
          (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
      );
    }
  }

  function toSourceGroup(
    sourceId: string,
    b: Bucket,
    limit: number | undefined,
  ): SourceGroup {
    return {
      sourceId,
      sourceName: b.sourceName,
      items: limit ? b.items.slice(0, limit) : b.items,
    };
  }

  function sortByRegistry(list: SourceGroup[]): SourceGroup[] {
    return [...list].sort((a, b) => {
      const ia = registry.findIndex((s) => s.id === a.sourceId);
      const ib = registry.findIndex((s) => s.id === b.sourceId);
      return ia - ib;
    });
  }

  const out: RawByCategory = { tech: [], finance: [], politics: [] };

  for (const cat of Object.keys(buckets) as Category[]) {
    const order = SUBCATEGORY_ORDER[cat];
    if (!order) {
      // Flat: one synthetic subgroup with every source.
      const sources: SourceGroup[] = [];
      for (const [id, b] of buckets[cat].entries()) {
        sources.push(toSourceGroup(id, b, undefined));
      }
      out[cat] = sources.length
        ? [{ id: "all", name: CATEGORY_LABELS[cat], sources: sortByRegistry(sources) }]
        : [];
      continue;
    }
    // Subcategory split: bucket each source under its registered subcategory.
    const subs: SubGroup[] = [];
    for (const subId of order) {
      const mergeLimit = mergedLimitFor(cat, subId);
      if (mergeLimit !== undefined) {
        // Merge: flatten all sources under this subcategory into a single
        // time-sorted SourceGroup. Articles keep their `source` field so
        // the renderer can label them.
        const flat: ArticleInput[] = [];
        for (const [id, b] of buckets[cat].entries()) {
          if (subcatOf.get(id) === subId) flat.push(...b.items);
        }
        if (flat.length === 0) continue;
        flat.sort(
          (a, b) =>
            (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
        );
        subs.push({
          id: subId,
          name: SUBCATEGORY_LABELS[subId] ?? subId,
          sources: [
            {
              sourceId: "_merged",
              sourceName: SUBCATEGORY_LABELS[subId] ?? subId,
              items: flat.slice(0, mergeLimit),
              merged: true,
            },
          ],
        });
        continue;
      }

      const limit = displayLimitFor(cat, subId);
      const sources: SourceGroup[] = [];
      for (const [id, b] of buckets[cat].entries()) {
        if (subcatOf.get(id) === subId) sources.push(toSourceGroup(id, b, limit));
      }
      if (sources.length === 0) continue;
      subs.push({
        id: subId,
        name: SUBCATEGORY_LABELS[subId] ?? subId,
        sources: sortByRegistry(sources),
      });
    }
    out[cat] = subs;
  }

  return out;
}

// ----- HTML helpers -----

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlLines(s: string): string {
  return escapeHtml(s).replace(/\n/g, "<br>");
}

function formatDate(d: Date | undefined): string {
  if (!d) return "";
  try {
    // zh: "05/20 16:00"  · en: "May 20, 4:00 PM" → keep 24h en-GB style "20/05 16:00"
    const localeTag = REPORT_LOCALE === "en" ? "en-GB" : "zh-CN";
    return d.toLocaleString(localeTag, {
      timeZone: getReportTz(),
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

// ----- raw article renderers -----

function hasCjk(s: string): boolean {
  return /[\u3400-\u9fff]/.test(s);
}

function fallbackLocalizedTitle(title: string, summary: string | undefined): string {
  if (REPORT_LOCALE !== "zh" || hasCjk(title) || !summary || !hasCjk(summary)) {
    return "";
  }
  const firstSentence = summary.split(/[。！？.!?]/)[0]?.trim() ?? "";
  if (!firstSentence) return "";
  return firstSentence.length > 34
    ? `${firstSentence.slice(0, 34)}...`
    : firstSentence;
}

function renderArticleHtml(a: ArticleInput, showSource = false): string {
  const url = escapeHtml(a.url);
  const excerpt = a.excerpt ? escapeHtml(a.excerpt) : "";
  // Backwards-compat: old sidecar JSON files may carry `cnSummary` instead.
  const summaryText = a.summary ?? (a as unknown as { cnSummary?: string }).cnSummary;
  const displayTitle =
    a.localizedTitle?.trim() || fallbackLocalizedTitle(a.title, summaryText) || a.title;
  const title = escapeHtml(displayTitle);
  const originalTitle =
    displayTitle !== a.title ? escapeHtml(a.title) : "";
  const summary = summaryText ? escapeHtml(summaryText) : "";
  const meta = a.meta ? escapeHtml(a.meta) : "";
  const time = formatDate(a.publishedAt);
  const sourceLabel = showSource && a.source ? escapeHtml(a.source) : "";
  const metaLine = [sourceLabel, time].filter(Boolean).join(" · ");
  // News-style summary label for finance/politics, project-intro style for GH/tech.
  const newsy = a.category === "finance" || a.category === "politics";
  const summaryLabel = newsy ? STR.summaryLabelNews : STR.summaryLabelIntro;
  return `<article class="article">
  <h3 class="article-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
  ${originalTitle ? `<p class="article-meta">${REPORT_LOCALE === "en" ? "Original" : "\u539f\u6807\u9898"}: ${originalTitle}</p>` : ""}
  ${meta ? `<p class="article-stats">${meta}</p>` : ""}
  ${metaLine ? `<p class="article-meta">${metaLine}</p>` : ""}
  ${excerpt ? `<p class="article-excerpt">${excerpt}</p>` : ""}
  ${summary ? `<p class="article-summary"><span class="summary-label">${summaryLabel}</span> ${summary}</p>` : ""}
</article>`;
}

function renderSourceContent(
  category: Category,
  subId: string,
  source: SourceGroup,
  isActive: boolean,
): string {
  const showSource = source.merged === true;
  return `<div class="source-content${isActive ? " active" : ""}" data-source-content="${escapeHtml(source.sourceId)}" data-sub="${escapeHtml(subId)}" data-cat="${category}">
    ${source.items.length === 0 ? `<p class="empty">${STR.emptySource}</p>` : source.items.map((a) => renderArticleHtml(a, showSource)).join("\n")}
  </div>`;
}

function renderSourceTabs(
  category: Category,
  subId: string,
  sources: SourceGroup[],
): string {
  // Single-source L2s (X 推文 / GitHub Trending) skip the L3 row — the L2 tab
  // label already identifies the dataset. L3 only earns its row when there
  // are ≥2 sources to switch between (e.g. 社区讨论 V2EX vs LinuxDo).
  if (sources.length < 2) return "";
  return `<nav class="source-tabs">${sources
    .map(
      (s, i) =>
        `<button class="source-tab${i === 0 ? " active" : ""}" data-source="${escapeHtml(s.sourceId)}" data-sub="${escapeHtml(subId)}" data-cat="${category}">${escapeHtml(s.sourceName)}<span class="count">${s.items.length}</span></button>`,
    )
    .join("")}</nav>`;
}

function renderSubContent(category: Category, sub: SubGroup, isActive: boolean): string {
  return `<div class="sub-content${isActive ? " active" : ""}" data-sub-content="${escapeHtml(sub.id)}" data-cat="${category}">
    ${renderSourceTabs(category, sub.id, sub.sources)}
    <div class="source-contents">
      ${sub.sources.map((s, i) => renderSourceContent(category, sub.id, s, i === 0)).join("\n")}
    </div>
  </div>`;
}

function renderRawCategoryPanel(
  category: Category,
  subs: SubGroup[],
): string {
  if (subs.length === 0) {
    return `<p class="empty">${STR.emptyCategory}</p>`;
  }
  if (subs.length === 1) {
    return renderSubContent(category, subs[0], true);
  }
  const subTabs = subs
    .map((s, i) => {
      const count = s.sources.reduce((n, src) => n + src.items.length, 0);
      return `<button class="sub-tab${i === 0 ? " active" : ""}" data-sub="${escapeHtml(s.id)}" data-cat="${category}">${escapeHtml(s.name)}<span class="count">${count}</span></button>`;
    })
    .join("");
  const panels = subs
    .map((s, i) => renderSubContent(category, s, i === 0))
    .join("\n");
  return `<nav class="sub-tabs">${subTabs}</nav>\n<div class="sub-contents">${panels}</div>`;
}

function topReadCategoryLabel(category: TopReadCategory): string {
  if (category === "trading") return STR.catTrading;
  if (category === "academic") return STR.catAcademic;
  if (category === "source-health") return STR.sourceHealth;
  return CATEGORY_LABELS[category];
}

function renderTopReadsPanel(items: TopReadItem[]): string {
  if (items.length === 0) return `<p class="empty">${STR.emptyCategory}</p>`;
  return `<section class="top-reads">
    <div class="top-read-list">
      ${items
        .map((item) => {
          const title = escapeHtml(item.title);
          const titleHtml = item.url
            ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${title}</a>`
            : title;
          return `<article class="top-read-card">
        <div class="top-read-head">
          <span class="top-read-rank">#${item.rank}</span>
          <span class="top-read-category">${escapeHtml(topReadCategoryLabel(item.category))}</span>
        </div>
        <h2 class="top-read-title">${titleHtml}</h2>
        <p class="top-read-meta">${escapeHtml(item.source)}</p>
        <p class="top-read-reason"><span>${STR.topReadReason}</span>${escapeHtml(item.reason)}</p>
      </article>`;
        })
        .join("\n")}
    </div>
  </section>`;
}

function renderFinanceTopicsPanel(topics: FinanceTopicCluster[]): string {
  if (topics.length === 0) return `<p class="empty">${STR.emptyCategory}</p>`;
  return `<section class="finance-topics">
    ${topics
      .map(
        (topic) => `<article class="finance-topic-card">
      <div class="finance-topic-head">
        <h2 class="finance-topic-title">${escapeHtml(topic.title)}</h2>
        <span class="finance-topic-count">${topic.count}</span>
      </div>
      ${
        topic.tickers.length
          ? `<p class="finance-topic-tags">${topic.tickers.map((ticker) => `<span>${escapeHtml(ticker)}</span>`).join("")}</p>`
          : ""
      }
      <p class="finance-topic-signal"><strong>${STR.financeTopicSignal}</strong>${escapeHtml(topic.signal)}</p>
      <div class="finance-topic-items">
        ${topic.items
          .map(
            (item) => `<article class="finance-topic-item">
          <h3><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.title)}</a></h3>
          <p class="article-meta">${escapeHtml(item.source)}</p>
          <p>${escapeHtml(item.summary)}</p>
        </article>`,
          )
          .join("\n")}
      </div>
      <p class="finance-topic-risk"><strong>${STR.financeTopicRisk}</strong>${escapeHtml(topic.risk)}</p>
    </article>`,
      )
      .join("\n")}
  </section>`;
}

function renderFinancePanel(
  financial: FinancialAnalysisSection | undefined,
  financeTopics: FinanceTopicCluster[],
  financeSubs: SubGroup[],
): string {
  if (!financial && financeTopics.length === 0 && financeSubs.length === 0) {
    return `<p class="empty">${STR.emptyCategory}</p>`;
  }
  const financeTabs: Array<{
    id: string;
    name: string;
    count: number;
    html: string;
  }> = [];
  if (financial) {
    financeTabs.push({
      id: "financial-analysis",
      name: STR.catFinancialAnalysis,
      count: financial.instruments.length,
      html: renderFinancialPanel(financial),
    });
  }
  if (financeTopics.length > 0) {
    financeTabs.push({
      id: "finance-topics",
      name: STR.subFinanceTopics,
      count: financeTopics.reduce((sum, topic) => sum + topic.count, 0),
      html: renderFinanceTopicsPanel(financeTopics),
    });
  }
  for (const sub of financeSubs) {
    const count = sub.sources.reduce((n, src) => n + src.items.length, 0);
    financeTabs.push({
      id: sub.id,
      name: sub.name,
      count,
      html: renderSubContent("finance", sub, true),
    });
  }
  if (financeTabs.length === 1 && financeTopics.length === 0) return financeTabs[0].html;
  const subTabs = financeTabs
    .map(
      (tab, i) =>
        `<button class="sub-tab${i === 0 ? " active" : ""}" data-sub="${escapeHtml(tab.id)}" data-cat="finance">${escapeHtml(tab.name)}<span class="count">${tab.count}</span></button>`,
    )
    .join("");
  const panels = financeTabs
    .map(
      (tab, i) =>
        `<div class="sub-content${i === 0 ? " active" : ""}" data-sub-content="${escapeHtml(tab.id)}" data-cat="finance">${tab.html}</div>`,
    )
    .join("\n");
  return `<nav class="sub-tabs">${subTabs}</nav>\n<div class="sub-contents">${panels}</div>`;
}

function sourceHealthStatusLabel(status: SourceHealthStatus): string {
  if (status === "ok") return STR.sourceHealthOk;
  if (status === "failed") return STR.sourceHealthFailed;
  return STR.sourceHealthEmpty;
}

function renderSourceHealthPanel(health: SourceHealthSection | undefined): string {
  if (!health) return "";
  const problematic = health.items.filter((item) => item.status !== "ok");
  const visible = problematic.length > 0 ? problematic : health.items.slice(0, 8);
  return `<section class="source-health-panel">
    <div class="source-health-head">
      <h2>${STR.sourceHealth}</h2>
      <p>${health.summary.ok}/${health.summary.total} ${STR.sourceHealthOk} · ${health.summary.empty} ${STR.sourceHealthEmpty} · ${health.summary.failed} ${STR.sourceHealthFailed} · ${health.summary.articles} items</p>
    </div>
    <div class="source-health-list">
      ${visible
        .map(
          (item) => `<article class="source-health-item status-${item.status}">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.category)}${item.subcategory ? ` / ${escapeHtml(item.subcategory)}` : ""}</span>
        </div>
        <span class="source-health-status">${sourceHealthStatusLabel(item.status)} · ${item.count}</span>
        ${item.error ? `<p>${escapeHtml(compactError(item.error))}</p>` : ""}
      </article>`,
        )
        .join("\n")}
    </div>
  </section>`;
}

function compactError(error: string): string {
  return error.replace(/\s+/g, " ").trim().slice(0, 180);
}

// ----- top-level renderer -----

export function renderHtml(
  report: DailyReport,
  raw: RawByCategory,
  date: string,
): string {
  const trading = report.trading;
  const financial = report.financial_analysis;
  const academic = report.academic_radar;
  const topReads = report.top_reads ?? [];
  const financeTopics = report.finance_topics ?? [];
  const sourceHealth = report.source_health;

  // Split tech raw subgroups: "tech" L1 panel (github-trending + ai-news)
  // vs. "community" L1 panel (cn-community). Keeps the registry simple
  // (V2EX/LinuxDo still live under category=tech) while exposing the
  // forums as their own top-level tab per UX preference.
  const techMainSubs = raw.tech.filter((s) => TECH_MAIN_SUBS.has(s.id));
  const techCommunitySubs = raw.tech.filter((s) => TECH_COMMUNITY_SUBS.has(s.id));

  const sumItems = (subs: SubGroup[]) =>
    subs.reduce(
      (n, sg) => n + sg.sources.reduce((m, s) => m + s.items.length, 0),
      0,
    );
  const counts = {
    tech: sumItems(techMainSubs),
    finance: sumItems(raw.finance),
    politics: sumItems(raw.politics),
    community: sumItems(techCommunitySubs),
    academic: academic?.items.length ?? 0,
    topReads: topReads.length,
  };
  const financeCount = counts.finance + (financial?.instruments.length ?? 0);
  const defaultPanel = topReads.length > 0 ? "top-reads" : "tech";

  return `<!doctype html>
<html lang="${REPORT_LOCALE === "en" ? "en" : "zh-CN"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${STR.siteTitle} · ${date}</title>
<link rel="alternate" type="application/rss+xml" title="DailyBrief Academic Radar" href="/academic-feed.xml">
<style>
  :root {
    --bg: #fafaf9;
    --bg-elevated: #ffffff;
    --fg: #18181b;
    --fg-soft: #3f3f46;
    --muted: #71717a;
    --rule: #e4e4e7;
    --card: #f4f4f5;
    --link: #1d4ed8;
    --accent: #18181b;
    --accent-fg: #fafaf9;
    --rank-high-bg: #fee2e2;
    --rank-high-fg: #991b1b;
    --rank-mid-bg: #fef3c7;
    --rank-mid-fg: #92400e;
    --rank-low-bg: #e0e7ff;
    --rank-low-fg: #3730a3;
    --hero-grad-from: #fafaf9;
    --hero-grad-to: #f4f4f5;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0a0a0a;
      --bg-elevated: #18181b;
      --fg: #fafafa;
      --fg-soft: #d4d4d8;
      --muted: #a1a1aa;
      --rule: #27272a;
      --card: #18181b;
      --link: #93c5fd;
      --accent: #fafafa;
      --accent-fg: #0a0a0a;
      --rank-high-bg: rgba(239,68,68,0.18);
      --rank-high-fg: #fca5a5;
      --rank-mid-bg: rgba(245,158,11,0.18);
      --rank-mid-fg: #fcd34d;
      --rank-low-bg: rgba(99,102,241,0.18);
      --rank-low-fg: #a5b4fc;
      --hero-grad-from: #18181b;
      --hero-grad-to: #0a0a0a;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
      "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  main { max-width: 960px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }

  /* ===== header ===== */
  header.report-header { margin-bottom: 1.25rem; }
  .eyebrow {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--muted);
    font-weight: 500;
  }
  h1.report-title {
    font-size: 2.2rem;
    font-weight: 700;
    margin: 0.4rem 0 1.2rem;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .archive-link {
    display: inline-block;
    margin-bottom: 1rem;
    font-size: 0.85rem;
    color: var(--muted);
    text-decoration: none;
    border-bottom: 1px dashed var(--rule);
    padding-bottom: 1px;
  }
  .archive-link:hover { color: var(--accent); border-bottom-style: solid; }
  .hero-card {
    background: linear-gradient(135deg, var(--hero-grad-from) 0%, var(--hero-grad-to) 100%);
    border: 1px solid var(--rule);
    border-left: 4px solid var(--accent);
    padding: 1rem 1.4rem;
    border-radius: 0.6rem;
  }
  .hero-eyebrow {
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 500;
  }
  .hero-headline {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0.35rem 0 0;
    line-height: 1.45;
    color: var(--fg);
  }
  .overview-card {
    margin: 0.7rem 0 0;
    padding: 0.7rem 1.1rem;
    background: var(--card);
    border-radius: 0.5rem;
    border-left: 3px solid var(--muted);
  }
  .overview-card .eyebrow { display: block; margin-bottom: 0.3rem; }
  .overview-text {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.65;
    color: var(--fg-soft);
  }

  /* ===== primary tabs ===== */
  .tabs {
    display: flex;
    gap: 0.25rem;
    margin: 1.25rem 0 0.75rem;
    border-bottom: 1px solid var(--rule);
    flex-wrap: wrap;
  }
  .tab {
    background: none;
    border: none;
    padding: 0.7rem 1.1rem;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-family: inherit;
    transition: color 0.15s;
  }
  .tab:hover { color: var(--fg); }
  .tab.active {
    color: var(--fg);
    border-bottom-color: var(--accent);
  }
  .tab .count {
    font-size: 0.72rem;
    color: var(--muted);
    margin-left: 0.4rem;
    font-weight: 400;
  }
  .panel { display: none; }
  .panel.active { display: block; }

  /* ===== digest (AI 简报) — compact ===== */
  .digest-category { margin-bottom: 1.1rem; }
  .category-header {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    margin: 0 0 0.55rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid var(--rule);
  }
  .category-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--fg);
    margin: 0;
    letter-spacing: 0.05em;
  }
  .category-count {
    font-size: 0.7rem;
    color: var(--muted);
    background: var(--card);
    padding: 0.12rem 0.45rem;
    border-radius: 999px;
  }
  .brief-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  @media (min-width: 720px) {
    .brief-list { grid-template-columns: 1fr 1fr; }
  }
  .brief {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 0.5rem;
    padding: 0.7rem 0.95rem;
    transition: border-color 0.15s, transform 0.15s;
  }
  .brief:hover {
    border-color: var(--muted);
    transform: translateY(-1px);
  }
  .brief-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.3rem;
  }
  .brief-source {
    font-size: 0.72rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 500;
  }
  .brief-rank {
    font-size: 0.7rem;
    padding: 0.12rem 0.5rem;
    border-radius: 999px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .brief-rank.high { background: var(--rank-high-bg); color: var(--rank-high-fg); }
  .brief-rank.mid  { background: var(--rank-mid-bg);  color: var(--rank-mid-fg); }
  .brief-rank.low  { background: var(--rank-low-bg);  color: var(--rank-low-fg); }
  .brief-title {
    font-size: 0.98rem;
    font-weight: 600;
    margin: 0 0 0.3rem;
    line-height: 1.35;
  }
  .brief-title a { color: var(--fg); text-decoration: none; }
  .brief-title a:hover { color: var(--link); text-decoration: underline; }
  .brief-summary {
    margin: 0;
    color: var(--fg-soft);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  .editor-card {
    background: var(--card);
    border-left: 3px solid var(--muted);
    border-radius: 0.5rem;
    padding: 1rem 1.3rem;
    margin: 1.5rem 0 1.2rem;
  }
  .editor-card .eyebrow { display: block; margin-bottom: 0.4rem; }
  .editor-text {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--fg);
  }
  .keywords { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0 0 1.5rem; }
  .keyword {
    background: var(--card);
    color: var(--fg-soft);
    padding: 0.25rem 0.7rem;
    border-radius: 999px;
    font-size: 0.8rem;
  }

  /* ===== L2 sub-tabs ===== */
  .sub-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 1rem 0;
  }
  .sub-tab {
    background: var(--card);
    border: 1px solid transparent;
    padding: 0.5rem 1.05rem;
    border-radius: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--fg-soft);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .sub-tab:hover { border-color: var(--muted); color: var(--fg); }
  .sub-tab.active {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .sub-tab .count {
    font-size: 0.7rem;
    opacity: 0.75;
    margin-left: 0.4rem;
    font-weight: 400;
  }
  .sub-content { display: none; }
  .sub-content.active { display: block; }

  /* ===== L3 source-tabs ===== */
  .source-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.9rem 0 1.3rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid var(--rule);
  }
  .source-tab {
    background: none;
    border: 1px solid var(--rule);
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    font-size: 0.83rem;
    color: var(--fg-soft);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .source-tab:hover { border-color: var(--muted); color: var(--fg); }
  .source-tab.active {
    background: var(--fg);
    color: var(--bg);
    border-color: var(--fg);
  }
  .source-tab .count {
    font-size: 0.7rem;
    opacity: 0.75;
    margin-left: 0.3rem;
  }
  .source-content { display: none; }
  .source-content.active { display: block; }

  /* ===== article cards in raw panels ===== */
  .article {
    padding: 1rem 0;
    border-bottom: 1px solid var(--rule);
  }
  .article:first-child { padding-top: 0; }
  .article:last-child { border-bottom: none; }
  .article-title {
    font-size: 1rem;
    margin: 0 0 0.3rem;
    font-weight: 500;
    line-height: 1.45;
  }
  .article-title a { color: var(--fg); text-decoration: none; }
  .article-title a:hover { color: var(--link); text-decoration: underline; }
  .article-meta { color: var(--muted); font-size: 0.76rem; margin: 0 0 0.35rem; }
  .article-stats {
    color: var(--muted);
    font-size: 0.8rem;
    margin: 0 0 0.4rem;
    font-feature-settings: "tnum";
  }
  .article-excerpt {
    margin: 0;
    color: var(--fg-soft);
    font-size: 0.9rem;
    line-height: 1.6;
  }
  .article-summary {
    margin: 0.55rem 0 0;
    padding: 0.6rem 0.85rem;
    background: var(--card);
    border-left: 2px solid var(--link);
    border-radius: 0.3rem;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--fg);
  }
  .summary-label {
    display: inline-block;
    font-size: 0.68rem;
    color: var(--link);
    margin-right: 0.4rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .empty {
    color: var(--muted);
    text-align: center;
    padding: 2rem 0;
    font-size: 0.9rem;
  }

  /* ===== top reads / finance topics / source health ===== */
  .top-read-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  @media (min-width: 760px) {
    .top-read-list { grid-template-columns: 1fr 1fr; }
  }
  .top-read-card,
  .finance-topic-card,
  .source-health-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 0.5rem;
    padding: 0.9rem 1rem;
  }
  .top-read-head,
  .finance-topic-head,
  .source-health-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.45rem;
  }
  .top-read-rank {
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--accent-fg);
    background: var(--accent);
    border-radius: 999px;
    padding: 0.12rem 0.5rem;
  }
  .top-read-category,
  .finance-topic-count {
    color: var(--muted);
    font-size: 0.76rem;
    white-space: nowrap;
  }
  .top-read-title,
  .finance-topic-title {
    margin: 0 0 0.3rem;
    font-size: 1.02rem;
    line-height: 1.4;
  }
  .top-read-title a,
  .finance-topic-item a { color: var(--fg); text-decoration: none; }
  .top-read-title a:hover,
  .finance-topic-item a:hover { color: var(--link); text-decoration: underline; }
  .top-read-meta {
    margin: 0 0 0.45rem;
    color: var(--muted);
    font-size: 0.76rem;
  }
  .top-read-reason,
  .finance-topic-signal,
  .finance-topic-risk,
  .finance-topic-item p {
    margin: 0.4rem 0 0;
    color: var(--fg-soft);
    font-size: 0.88rem;
    line-height: 1.65;
  }
  .top-read-reason span,
  .finance-topic-signal strong,
  .finance-topic-risk strong {
    display: inline-block;
    color: var(--link);
    font-size: 0.72rem;
    font-weight: 700;
    margin-right: 0.45rem;
  }
  .finance-topics {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.8rem;
  }
  .finance-topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.45rem 0;
  }
  .finance-topic-tags span {
    border: 1px solid var(--rule);
    border-radius: 999px;
    color: var(--muted);
    font-size: 0.74rem;
    padding: 0.1rem 0.48rem;
  }
  .finance-topic-items {
    margin-top: 0.55rem;
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }
  .finance-topic-item {
    padding: 0.55rem 0;
    border-top: 1px solid var(--rule);
  }
  .finance-topic-item h3 {
    margin: 0 0 0.25rem;
    font-size: 0.92rem;
    line-height: 1.4;
  }
  .source-health-panel {
    margin-top: 1.4rem;
    background: var(--card);
  }
  .source-health-head h2 {
    margin: 0;
    font-size: 0.95rem;
  }
  .source-health-head p {
    margin: 0;
    color: var(--muted);
    font-size: 0.8rem;
  }
  .source-health-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.45rem;
  }
  @media (min-width: 760px) {
    .source-health-list { grid-template-columns: 1fr 1fr; }
  }
  .source-health-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.25rem 0.75rem;
    align-items: start;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--rule);
    border-left: 3px solid var(--muted);
    border-radius: 0.4rem;
    background: var(--bg-elevated);
    font-size: 0.82rem;
  }
  .source-health-item.status-failed { border-left-color: #dc2626; }
  .source-health-item.status-empty { border-left-color: #d97706; }
  .source-health-item.status-ok { border-left-color: #16a34a; }
  .source-health-item span {
    display: block;
    color: var(--muted);
    font-size: 0.74rem;
  }
  .source-health-status {
    text-align: right;
    white-space: nowrap;
  }
  .source-health-item p {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.5;
  }

  /* ===== financial analysis panel ===== */
  .financial-overview {
    margin: 0.4rem 0 1.2rem;
    padding: 0.9rem 1.15rem;
    background: var(--card);
    border-left: 3px solid var(--accent);
    border-radius: 0.45rem;
  }
  .financial-overview p {
    margin: 0.35rem 0 0;
    color: var(--fg-soft);
    font-size: 0.92rem;
    line-height: 1.75;
  }
  .financial-section { margin: 1.3rem 0; }
  .financial-market-columns {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;
    align-items: start;
    margin: 1.35rem 0;
  }
  .financial-market-column {
    min-width: 0;
    padding-top: 0.75rem;
    border-top: 2px solid var(--rule);
  }
  .financial-market-heading {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--fg);
  }
  .financial-market-column .financial-section:first-of-type {
    margin-top: 0;
  }
  .financial-section-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
  @media (min-width: 720px) {
    .financial-section-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (min-width: 900px) {
    .financial-market-columns { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  }
  .financial-card {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 0.5rem;
    padding: 0.75rem 0.95rem;
  }
  .financial-card-head {
    display: flex;
    justify-content: space-between;
    gap: 0.7rem;
    align-items: flex-start;
    margin-bottom: 0.35rem;
  }
  .financial-name { margin: 0; font-size: 0.95rem; font-weight: 650; }
  .financial-symbol { color: var(--muted); font-size: 0.74rem; font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
  .financial-pct { font-size: 0.95rem; font-weight: 650; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .financial-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    color: var(--muted);
    font-size: 0.78rem;
  }
  .financial-notes {
    margin: 0.45rem 0 0;
    padding-left: 1.1rem;
    color: var(--fg-soft);
    font-size: 0.9rem;
    line-height: 1.65;
  }
  .financial-risk {
    margin-top: 1.3rem;
    padding: 0.85rem 1.05rem;
    background: var(--card);
    border-left: 3px solid #d97706;
    border-radius: 0.45rem;
    color: var(--fg-soft);
    font-size: 0.85rem;
    line-height: 1.65;
  }

  /* ===== academic radar panel ===== */
  .academic-overview {
    margin: 0.4rem 0 1.2rem;
    padding: 0.9rem 1.15rem;
    background: var(--card);
    border-left: 3px solid #2563eb;
    border-radius: 0.45rem;
  }
  .academic-overview p {
    margin: 0.35rem 0 0;
    color: var(--fg-soft);
    font-size: 0.92rem;
    line-height: 1.75;
  }
  .academic-section { margin: 1.35rem 0; }
  .academic-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .academic-paper {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 0.5rem;
    padding: 0.85rem 1rem;
  }
  .academic-paper-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.45rem;
  }
  .academic-title {
    margin: 0;
    font-size: 0.98rem;
    line-height: 1.35;
  }
  .academic-title a { color: var(--fg); text-decoration: none; }
  .academic-title a:hover { color: var(--link); text-decoration: underline; }
  .academic-priority {
    white-space: nowrap;
    border-radius: 999px;
    padding: 0.18rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 650;
    background: var(--rank-low-bg);
    color: var(--rank-low-fg);
  }
  .academic-priority.must-read {
    background: var(--rank-high-bg);
    color: var(--rank-high-fg);
  }
  .academic-priority.deep-read {
    background: var(--rank-mid-bg);
    color: var(--rank-mid-fg);
  }
  .academic-paper-no {
    white-space: nowrap;
    border-radius: 999px;
    padding: 0.18rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 750;
    background: var(--fg);
    color: var(--bg);
  }
  .academic-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.35rem;
  }
  .academic-new {
    white-space: nowrap;
    border-radius: 999px;
    padding: 0.18rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    background: #dcfce7;
    color: #166534;
  }
  @media (prefers-color-scheme: dark) {
    .academic-new {
      background: rgba(34,197,94,0.18);
      color: #86efac;
    }
  }
  .academic-feed-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
  }
  .academic-feed-links a {
    color: var(--link);
    text-decoration: none;
    font-weight: 600;
  }
  .academic-feed-links a:hover { text-decoration: underline; }
  .academic-meta {
    margin: 0 0 0.45rem;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.55;
  }
  .academic-summary,
  .academic-relevance,
  .academic-action {
    margin: 0.45rem 0 0;
    color: var(--fg-soft);
    font-size: 0.9rem;
    line-height: 1.65;
  }
  .academic-action { color: var(--fg); }
  .academic-original {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.55;
  }
  .academic-label {
    display: inline-block;
    color: var(--link);
    font-size: 0.72rem;
    font-weight: 650;
    margin-right: 0.35rem;
  }
  .academic-why {
    margin: 0.55rem 0 0;
    padding: 0.62rem 0.78rem;
    background: var(--card);
    border-left: 2px solid #2563eb;
    border-radius: 0.3rem;
    color: var(--fg);
    font-size: 0.88rem;
    line-height: 1.7;
  }
  .academic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.55rem;
  }
  .academic-tag {
    border: 1px solid var(--rule);
    border-radius: 999px;
    padding: 0.14rem 0.48rem;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .academic-notes {
    margin: 0.45rem 0 0;
    padding-left: 1.1rem;
    color: var(--fg-soft);
    font-size: 0.86rem;
    line-height: 1.65;
  }

  /* ===== trading panel ===== */
  .crypto-widgets {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.55rem;
    margin: 0.4rem 0 1.2rem;
  }
  @media (min-width: 720px) {
    .crypto-widgets { grid-template-columns: repeat(4, 1fr); }
  }
  .crypto-widget {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 0.5rem;
    padding: 0.7rem 0.85rem;
    text-align: center;
  }
  .widget-label {
    font-size: 0.7rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.3rem;
  }
  .widget-value {
    font-size: 1.5rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--fg);
    line-height: 1.1;
  }
  .widget-sub {
    font-size: 0.78rem;
    color: var(--muted);
    margin-top: 0.25rem;
  }
  .widget-sub.positive { color: #16a34a; }
  .widget-sub.negative { color: #dc2626; }
  @media (prefers-color-scheme: dark) {
    .widget-sub.positive { color: #4ade80; }
    .widget-sub.negative { color: #fca5a5; }
  }
  .crypto-widget.fg-fear-extreme { border-left: 4px solid #b91c1c; }
  .crypto-widget.fg-fear-extreme .widget-value { color: #b91c1c; }
  .crypto-widget.fg-fear { border-left: 4px solid #d97706; }
  .crypto-widget.fg-fear .widget-value { color: #d97706; }
  .crypto-widget.fg-neutral { border-left: 4px solid var(--muted); }
  .crypto-widget.fg-greed { border-left: 4px solid #65a30d; }
  .crypto-widget.fg-greed .widget-value { color: #65a30d; }
  .crypto-widget.fg-greed-extreme { border-left: 4px solid #16a34a; }
  .crypto-widget.fg-greed-extreme .widget-value { color: #16a34a; }
  @media (prefers-color-scheme: dark) {
    .crypto-widget.fg-fear-extreme .widget-value,
    .crypto-widget.fg-fear .widget-value { color: #fca5a5; }
    .crypto-widget.fg-greed .widget-value,
    .crypto-widget.fg-greed-extreme .widget-value { color: #4ade80; }
  }

  .trading-overview-card {
    margin: 0 0 1.5rem;
    padding: 1rem 1.3rem;
    background: var(--card);
    border-radius: 0.5rem;
    border-left: 3px solid var(--accent);
  }
  .trading-overview-card .eyebrow { display: block; margin-bottom: 0.4rem; }
  .trading-overview-text { font-size: 0.92rem; line-height: 1.75; color: var(--fg-soft); margin: 0; }

  .trading-section-title {
    font-size: 0.95rem;
    font-weight: 600;
    margin: 1.5rem 0 0.8rem;
    padding-bottom: 0.4rem;
    border-bottom: 1px solid var(--rule);
    color: var(--fg);
    letter-spacing: 0.05em;
  }

  /* picks (Sonnet's watchlist) */
  .trading-picks {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }
  @media (min-width: 720px) {
    .trading-picks { grid-template-columns: 1fr 1fr; }
  }
  .trading-pick {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-left: 4px solid var(--muted);
    border-radius: 0.5rem;
    padding: 0.8rem 1rem;
  }
  .trading-pick.stance-bull { border-left-color: #16a34a; }
  .trading-pick.stance-bear { border-left-color: #dc2626; }
  .trading-pick.stance-neutral { border-left-color: var(--muted); }
  .pick-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    margin-bottom: 0.45rem;
  }
  .pick-symbol-block {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .pick-symbol { font-weight: 700; font-size: 1rem; color: var(--fg); }
  .pick-name { color: var(--muted); font-size: 0.82rem; }
  .pick-stance {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    white-space: nowrap;
  }
  .pick-stance-bull { background: rgba(22,163,74,0.12); color: #16a34a; }
  .pick-stance-bear { background: rgba(220,38,38,0.12); color: #dc2626; }
  .pick-stance-neutral { background: var(--card); color: var(--muted); }
  .pick-rationale { margin: 0; font-size: 0.88rem; line-height: 1.65; color: var(--fg-soft); }

  /* asset-group tabs */
  .trading-group-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0.6rem 0 1.2rem;
  }
  .trading-group-tab {
    background: var(--card);
    border: 1px solid transparent;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--fg-soft);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .trading-group-tab:hover { border-color: var(--muted); color: var(--fg); }
  .trading-group-tab.active {
    background: var(--accent);
    color: var(--accent-fg);
  }
  .trading-group-tab .count {
    font-size: 0.7rem;
    opacity: 0.75;
    margin-left: 0.4rem;
    font-weight: 400;
  }
  .trading-group-content { display: none; }
  .trading-group-content.active { display: block; }

  /* ticker cards */
  .ticker-card {
    background: var(--bg-elevated);
    border: 1px solid var(--rule);
    border-radius: 0.55rem;
    padding: 0.85rem 1.1rem;
    margin-bottom: 0.7rem;
  }
  .ticker-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.65rem;
  }
  .ticker-id { min-width: 0; }
  .ticker-symbol { margin: 0; font-size: 1rem; font-weight: 700; font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
  .ticker-name { margin: 0.15rem 0 0; font-size: 0.82rem; color: var(--muted); }
  .ticker-price-block { text-align: right; flex-shrink: 0; }
  .ticker-price { display: block; font-size: 1.05rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .ticker-pct { display: inline-block; font-size: 0.82rem; font-weight: 500; margin-top: 0.15rem; font-variant-numeric: tabular-nums; }
  .ticker-pct.positive, .positive { color: #16a34a; }
  .ticker-pct.negative, .negative { color: #dc2626; }

  .ticker-indicators {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.35rem 0.9rem;
    margin: 0;
    font-size: 0.82rem;
    color: var(--fg-soft);
  }
  @media (min-width: 720px) {
    .ticker-indicators { grid-template-columns: repeat(3, 1fr); }
  }
  .ticker-indicators > div { display: flex; gap: 0.4rem; align-items: baseline; min-width: 0; }
  .ticker-indicators dt { color: var(--muted); font-size: 0.74rem; margin: 0; white-space: nowrap; }
  .ticker-indicators dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 500; color: var(--fg); }
  .trend-bullish { color: #16a34a; }
  .trend-bearish { color: #dc2626; }
  .trend-neutral { color: var(--muted); }
  .rsi-overbought { color: #d97706; }
  .rsi-oversold { color: #2563eb; }

  .ticker-signals {
    margin-top: 0.65rem;
    padding-top: 0.55rem;
    border-top: 1px dashed var(--rule);
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .signal-pill {
    font-size: 0.72rem;
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
    font-weight: 500;
  }
  .signal-pill.tone-bull { background: rgba(22,163,74,0.13); color: #166534; }
  .signal-pill.tone-bear { background: rgba(220,38,38,0.13); color: #991b1b; }
  .signal-pill.tone-caution { background: rgba(217,119,6,0.15); color: #92400e; }
  @media (prefers-color-scheme: dark) {
    .signal-pill.tone-bull { color: #4ade80; }
    .signal-pill.tone-bear { color: #fca5a5; }
    .signal-pill.tone-caution { color: #fcd34d; }
    .trend-bullish, .positive, .ticker-pct.positive { color: #4ade80; }
    .trend-bearish, .negative, .ticker-pct.negative { color: #fca5a5; }
    .rsi-overbought { color: #fcd34d; }
    .rsi-oversold { color: #93c5fd; }
    .trading-pick.stance-bull { border-left-color: #4ade80; }
    .trading-pick.stance-bear { border-left-color: #fca5a5; }
    .pick-stance-bull { background: rgba(74,222,128,0.15); color: #4ade80; }
    .pick-stance-bear { background: rgba(252,165,165,0.15); color: #fca5a5; }
  }
  .signal-age { opacity: 0.7; font-weight: 400; }

  .trading-risk {
    margin: 1.5rem 0 0;
    padding: 0.9rem 1.2rem;
    background: var(--card);
    border-radius: 0.45rem;
    border-left: 3px solid #d97706;
  }
  .trading-risk .eyebrow { display: block; margin-bottom: 0.35rem; }
  .trading-risk p { margin: 0; font-size: 0.82rem; line-height: 1.65; color: var(--fg-soft); }

  footer {
    margin-top: 2.5rem;
    border-top: 1px solid var(--rule);
    padding-top: 1.1rem;
    color: var(--muted);
    font-size: 0.82rem;
  }

  /* ===== editorial visual system ===== */
  :root {
    --bg: #f3f0e8;
    --bg-elevated: rgba(255, 255, 255, 0.9);
    --fg: #15241f;
    --fg-soft: #46564f;
    --muted: #758079;
    --rule: rgba(21, 36, 31, 0.12);
    --card: rgba(255, 255, 255, 0.58);
    --link: #0f766e;
    --accent: #123f38;
    --accent-fg: #f9f7ef;
    --warm: #d97745;
    --warm-soft: #f6e5d8;
    --shadow-sm: 0 1px 2px rgba(21, 36, 31, 0.04), 0 8px 24px rgba(21, 36, 31, 0.055);
    --shadow-lg: 0 24px 70px rgba(15, 52, 46, 0.16);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1715;
      --bg-elevated: rgba(25, 38, 34, 0.92);
      --fg: #f3f0e8;
      --fg-soft: #c8d0cc;
      --muted: #909c96;
      --rule: rgba(235, 239, 235, 0.12);
      --card: rgba(31, 47, 42, 0.72);
      --link: #7dd3c7;
      --accent: #7dd3c7;
      --accent-fg: #10231f;
      --warm: #f3a372;
      --warm-soft: rgba(217, 119, 69, 0.16);
      --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2), 0 10px 30px rgba(0, 0, 0, 0.18);
      --shadow-lg: 0 28px 80px rgba(0, 0, 0, 0.34);
    }
  }
  html { scroll-behavior: smooth; }
  body {
    min-height: 100vh;
    background:
      radial-gradient(circle at 9% 4%, rgba(217, 119, 69, 0.12), transparent 25rem),
      radial-gradient(circle at 92% 12%, rgba(15, 118, 110, 0.1), transparent 28rem),
      var(--bg);
  }
  main {
    max-width: 1120px;
    padding: 2rem 1.5rem 5rem;
  }
  header.report-header {
    position: relative;
    overflow: hidden;
    margin-bottom: 1rem;
    padding: clamp(1.45rem, 3.5vw, 2.6rem);
    color: #f8f6ef;
    background:
      linear-gradient(120deg, rgba(8, 38, 33, 0.98), rgba(18, 78, 68, 0.95)),
      #123f38;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.35rem;
    box-shadow: var(--shadow-lg);
    isolation: isolate;
  }
  header.report-header::before,
  header.report-header::after {
    content: "";
    position: absolute;
    border-radius: 999px;
    pointer-events: none;
    z-index: -1;
  }
  header.report-header::before {
    width: 24rem;
    height: 24rem;
    top: -17rem;
    right: -5rem;
    background: rgba(242, 177, 123, 0.2);
  }
  header.report-header::after {
    width: 13rem;
    height: 13rem;
    right: 14%;
    bottom: -10rem;
    background: rgba(125, 211, 199, 0.18);
  }
  .report-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: clamp(1.2rem, 3vw, 2rem);
  }
  .report-brand {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
  }
  .report-brand::before {
    content: "";
    width: 0.62rem;
    height: 0.62rem;
    border-radius: 50%;
    background: #f0a16f;
    box-shadow: 0 0 0 0.35rem rgba(240, 161, 111, 0.15);
  }
  header.report-header .eyebrow {
    color: rgba(248, 246, 239, 0.72);
    font-weight: 700;
    letter-spacing: 0.18em;
  }
  h1.report-title {
    margin: 0;
    color: #fffdf7;
    font-size: clamp(2.35rem, 7vw, 4.8rem);
    font-weight: 760;
    letter-spacing: -0.055em;
    line-height: 0.95;
    font-variant-numeric: tabular-nums;
  }
  .report-deck {
    max-width: 820px;
    margin: 1.2rem 0 0;
    color: #fffaf1;
    font-size: clamp(1.05rem, 2.2vw, 1.38rem);
    font-weight: 650;
    line-height: 1.5;
    text-wrap: balance;
  }
  .report-overview {
    max-width: 900px;
    margin: 1rem 0 0;
    padding-top: 1rem;
    color: rgba(248, 246, 239, 0.74);
    border-top: 1px solid rgba(255, 255, 255, 0.14);
    font-size: 0.9rem;
    line-height: 1.75;
  }
  .archive-link {
    margin: 0;
    padding: 0.4rem 0.75rem;
    color: rgba(255, 255, 255, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(10px);
  }
  .archive-link:hover {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.12);
  }
  .tabs {
    position: sticky;
    top: 0.7rem;
    z-index: 20;
    gap: 0.3rem;
    margin: 1rem 0 1.2rem;
    padding: 0.38rem;
    border: 1px solid var(--rule);
    border-radius: 1rem;
    background: color-mix(in srgb, var(--bg-elevated) 84%, transparent);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(18px) saturate(130%);
  }
  .tab {
    margin: 0;
    padding: 0.62rem 0.9rem;
    border: 0;
    border-radius: 0.7rem;
    font-size: 0.88rem;
    font-weight: 650;
    transition: color 0.18s ease, background 0.18s ease, transform 0.18s ease;
  }
  .tab:hover { color: var(--fg); background: var(--card); }
  .tab.active {
    color: var(--accent-fg);
    border: 0;
    background: var(--accent);
    box-shadow: 0 5px 16px rgba(15, 63, 56, 0.2);
  }
  .tab.active .count { color: inherit; opacity: 0.68; }
  .panel.active { animation: panel-in 0.28s ease both; }
  @keyframes panel-in {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .top-read-list { gap: 0.9rem; }
  .top-read-card,
  .finance-topic-card,
  .financial-card,
  .academic-paper,
  .ticker-card,
  .trading-pick {
    border-color: var(--rule);
    border-radius: 0.95rem;
    box-shadow: var(--shadow-sm);
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .top-read-card:hover,
  .finance-topic-card:hover,
  .financial-card:hover,
  .academic-paper:hover,
  .ticker-card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--link) 35%, var(--rule));
    box-shadow: 0 14px 34px rgba(21, 36, 31, 0.1);
  }
  .top-read-card { padding: 1.15rem 1.2rem; }
  @media (min-width: 760px) {
    .top-read-card:first-child {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
      gap: 0.4rem 2rem;
      padding: 1.5rem 1.6rem;
      color: #f8f6ef;
      background: linear-gradient(125deg, #163f38, #245f54);
      border-color: transparent;
      box-shadow: 0 18px 50px rgba(15, 63, 56, 0.2);
    }
    .top-read-card:first-child .top-read-head,
    .top-read-card:first-child .top-read-title,
    .top-read-card:first-child .top-read-meta { grid-column: 1; }
    .top-read-card:first-child .top-read-reason {
      grid-column: 2;
      grid-row: 1 / span 3;
      align-self: center;
      color: rgba(248, 246, 239, 0.82);
    }
    .top-read-card:first-child .top-read-title { font-size: 1.38rem; }
    .top-read-card:first-child .top-read-title a { color: #fff; }
    .top-read-card:first-child .top-read-meta,
    .top-read-card:first-child .top-read-category { color: rgba(248, 246, 239, 0.64); }
    .top-read-card:first-child .top-read-reason span { color: #f3b183; }
    .top-read-card:first-child .top-read-rank { color: #173d36; background: #f3b183; }
  }
  .top-read-rank { background: var(--warm); color: #fff; }
  .top-read-title { font-size: 1.05rem; letter-spacing: -0.012em; }
  .top-read-reason span { color: var(--link); }
  .category-header {
    margin-top: 1.35rem;
    padding-bottom: 0.55rem;
    border-bottom-width: 2px;
  }
  .category-title { font-size: 1rem; letter-spacing: 0.02em; }
  .sub-tabs {
    gap: 0.45rem;
    padding: 0.35rem;
    border-radius: 0.85rem;
    background: var(--card);
  }
  .sub-tab { border-radius: 0.65rem; }
  .source-tab { background: var(--bg-elevated); }
  .article {
    margin: 0.65rem 0;
    padding: 1rem 1.1rem;
    border: 1px solid var(--rule);
    border-radius: 0.85rem;
    background: var(--bg-elevated);
    box-shadow: var(--shadow-sm);
  }
  .article:first-child { padding-top: 1rem; }
  .article:last-child { border-bottom: 1px solid var(--rule); }
  .article-title { font-size: 1.02rem; font-weight: 650; }
  .article-summary {
    border-left-color: var(--warm);
    border-radius: 0.55rem;
    background: var(--warm-soft);
  }
  .summary-label { color: var(--warm); }
  .financial-overview,
  .academic-overview,
  .trading-overview-card,
  .editor-card {
    border: 1px solid var(--rule);
    border-left: 4px solid var(--link);
    border-radius: 0.9rem;
    background: var(--card);
    box-shadow: var(--shadow-sm);
  }
  .financial-risk,
  .trading-risk { border-radius: 0.85rem; background: var(--warm-soft); }
  .academic-paper { padding: 1.05rem 1.15rem; }
  .academic-paper-no { background: var(--accent); color: var(--accent-fg); }
  .academic-label { color: var(--link); }
  .keyword,
  .finance-topic-tags span,
  .academic-tag,
  .signal-pill { border-radius: 999px; }
  .source-health-panel {
    margin-top: 1.8rem;
    padding: 1.1rem;
    border-radius: 1rem;
    background: var(--card);
    box-shadow: var(--shadow-sm);
  }
  .source-health-item { border-radius: 0.7rem; }
  footer { margin-top: 3rem; text-align: center; }
  button:focus-visible,
  a:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--warm) 70%, transparent);
    outline-offset: 3px;
  }
  @media (max-width: 719px) {
    main { padding: 0.8rem 0.8rem 3rem; }
    header.report-header { border-radius: 1rem; }
    .report-header-top { align-items: flex-start; }
    .report-overview { font-size: 0.84rem; }
    .tabs {
      top: 0.4rem;
      flex-wrap: nowrap;
      overflow-x: auto;
      scrollbar-width: none;
      border-radius: 0.85rem;
    }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex: 0 0 auto; padding: 0.58rem 0.78rem; }
    .top-read-card,
    .finance-topic-card,
    .academic-paper,
    .financial-card { border-radius: 0.82rem; }
    .academic-paper-head { flex-direction: column; }
    .academic-badges { justify-content: flex-start; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; }
  }
</style>
</head>
<body>
<main>
  <header class="report-header">
    <div class="report-header-top">
      <span class="report-brand eyebrow">${STR.siteTitle}</span>
      ${process.env.WEB_MODE === "true" ? `<a class="archive-link" href="/archive.html">${STR.archiveLink}</a>` : ""}
    </div>
    <h1 class="report-title">${date}</h1>
    ${report.hero_headline ? `<p class="report-deck">${escapeHtml(report.hero_headline)}</p>` : ""}
    ${report.daily_overview ? `<p class="report-overview">${escapeHtml(report.daily_overview)}</p>` : ""}
  </header>

  <nav class="tabs" role="tablist">
    ${topReads.length > 0 ? `<button class="tab active" data-tab="top-reads">${STR.catTopReads}<span class="count">${counts.topReads}</span></button>` : ""}
    <button class="tab${defaultPanel === "tech" ? " active" : ""}" data-tab="tech">${CATEGORY_LABELS.tech}<span class="count">${counts.tech}</span></button>
    ${academic ? `<button class="tab" data-tab="academic">${STR.catAcademic}<span class="count">${counts.academic}</span></button>` : ""}
    ${trading ? `<button class="tab" data-tab="trading">${STR.catTrading}<span class="count">${trading.tickers.length}</span></button>` : ""}
    <button class="tab" data-tab="politics">${CATEGORY_LABELS.politics}<span class="count">${counts.politics}</span></button>
    <button class="tab" data-tab="finance">${CATEGORY_LABELS.finance}<span class="count">${financeCount}</span></button>
    ${techCommunitySubs.length > 0 ? `<button class="tab" data-tab="community">${STR.catCommunity}<span class="count">${counts.community}</span></button>` : ""}
  </nav>

  ${topReads.length > 0 ? `<section class="panel active" data-panel="top-reads">${renderTopReadsPanel(topReads)}</section>` : ""}
  <section class="panel${defaultPanel === "tech" ? " active" : ""}" data-panel="tech">
    ${renderRawCategoryPanel("tech", techMainSubs)}
  </section>
  ${academic ? `<section class="panel" data-panel="academic">${renderAcademicPanel(academic)}</section>` : ""}
  ${trading ? `<section class="panel" data-panel="trading">${renderTradingPanel(trading)}</section>` : ""}
  <section class="panel" data-panel="politics">
    ${renderRawCategoryPanel("politics", raw.politics)}
  </section>
  <section class="panel" data-panel="finance">
    ${renderFinancePanel(financial, financeTopics, raw.finance)}
  </section>
  ${techCommunitySubs.length > 0 ? `<section class="panel" data-panel="community">
    ${renderRawCategoryPanel("tech", techCommunitySubs)}
  </section>` : ""}

  ${renderSourceHealthPanel(sourceHealth)}

  <footer>
    ${STR.footer}
  </footer>
</main>
<script>
  document.querySelectorAll('.tabs > .tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.dataset.tab;
      document.querySelectorAll('.tabs > .tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      document.querySelectorAll('.panel').forEach(function (p) {
        p.classList.toggle('active', p.dataset.panel === target);
      });
    });
  });
  // Scope sub-tab / source-tab toggles to the parent .panel so two L1 panels
  // can share the same data-cat (e.g. tech main + community both data-cat=tech)
  // without stomping on each other's active state.
  document.querySelectorAll('.sub-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = btn.closest('.panel');
      if (!panel) return;
      var sub = btn.dataset.sub;
      panel.querySelectorAll('.sub-tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      panel.querySelectorAll('.sub-content').forEach(function (p) {
        p.classList.toggle('active', p.dataset.subContent === sub);
      });
    });
  });
  document.querySelectorAll('.source-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var subContent = btn.closest('.sub-content');
      if (!subContent) return;
      var src = btn.dataset.source;
      subContent.querySelectorAll('.source-tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      subContent.querySelectorAll('.source-content').forEach(function (p) {
        p.classList.toggle('active', p.dataset.sourceContent === src);
      });
    });
  });
  // Trading panel: asset-group sub-tabs (US/crypto/china/commodity)
  document.querySelectorAll('.trading-group-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var grp = btn.dataset.group;
      document.querySelectorAll('.trading-group-tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      document.querySelectorAll('.trading-group-content').forEach(function (p) {
        p.classList.toggle('active', p.dataset.group === grp);
      });
    });
  });
</script>
</body>
</html>`;
}

// ----- academic radar panel -----

function priorityLabel(priority: AcademicPaperItem["priority"]): string {
  if (priority === "must-read") return STR.academicMustRead;
  if (priority === "deep-read") return STR.academicDeepRead;
  return STR.academicWatch;
}

function formatAcademicDate(value: string | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function renderAcademicPaper(item: AcademicPaperItem, paperNo: string): string {
  const titleZh = item.title_zh || item.title;
  const titleEn = item.title_en || item.title;
  const abstractZh = item.abstract_zh || item.summary_zh || item.summary;
  const abstractEn = item.abstract_en || item.summary;
  const whyThisMatters =
    item.why_this_matters || item.why_relevant || item.relevance;
  const title = escapeHtml(titleZh);
  const originalTitle = escapeHtml(titleEn);
  const url = escapeHtml(item.url);
  const no = escapeHtml(paperNo);
  const priority = escapeHtml(priorityLabel(item.priority));
  const date = formatAcademicDate(item.published_at);
  const authors = item.authors.slice(0, 4).join(", ");
  const meta = [
    item.source,
    date,
    authors,
    item.first_seen_date ? `${STR.academicNew} ${item.first_seen_date}` : "",
    `${STR.academicScore} ${item.score.toFixed(1)}`,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join(" · ");
  const tags = item.tags
    .slice(0, 7)
    .map((tag) => `<span class="academic-tag">${escapeHtml(tag)}</span>`)
    .join("");

  return `<article class="academic-paper">
    <header class="academic-paper-head">
      <div>
        <span class="academic-label">${STR.academicTitleZh}</span>
        <h3 class="academic-title"><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
      </div>
      <div class="academic-badges">
        ${no ? `<span class="academic-paper-no">${no}</span>` : ""}
        ${item.is_new ? `<span class="academic-new">${STR.academicNew}</span>` : ""}
        <span class="academic-priority ${item.priority}">${priority}</span>
      </div>
    </header>
    ${meta ? `<p class="academic-meta">${meta}</p>` : ""}
    <p class="academic-original"><span class="academic-label">${STR.academicOriginalTitle}</span>${originalTitle}</p>
    ${abstractZh ? `<p class="academic-summary"><span class="academic-label">${STR.academicSummaryZh}</span>${escapeHtml(abstractZh)}</p>` : ""}
    ${abstractEn ? `<p class="academic-relevance"><span class="academic-label">${STR.academicOriginalSummary}</span>${escapeHtml(abstractEn)}</p>` : ""}
    <p class="academic-why"><span class="academic-label">${STR.academicWhyRelevant}</span><br>${escapeHtmlLines(whyThisMatters)}</p>
    <p class="academic-action">${escapeHtml(item.action)}</p>
    ${tags ? `<div class="academic-tags">${tags}</div>` : ""}
  </article>`;
}

function renderAcademicSection(
  title: string,
  items: AcademicPaperItem[],
): string {
  return `<section class="academic-section">
    <h2 class="category-title trading-section-title">${escapeHtml(title)}</h2>
    <div class="academic-grid">
      ${
        items.length === 0
          ? `<p class="empty">${STR.emptyGroup}</p>`
          : items
              .map((item) => renderAcademicPaper(item, item.paper_no ?? ""))
              .join("\n")
      }
    </div>
  </section>`;
}

function renderAcademicPanel(academic: AcademicRadarSection): string {
  const mustRead = academic.items.filter((item) => item.priority === "must-read");
  const watch = academic.items.filter((item) => item.priority === "watch");
  const deepRead = academic.deep_read_candidates.filter(
    (item) => item.priority !== "must-read",
  );
  const feedLinks = academic.push_channels
    ? `<p class="academic-feed-links">
      <a href="/${escapeHtml(academic.push_channels.rss_path)}">${STR.academicFeed} RSS</a>
      <a href="/${escapeHtml(academic.push_channels.json_path)}">${STR.academicFeed} JSON</a>
      <span>${STR.academicNew}: ${academic.new_items_count ?? 0}</span>
    </p>`
    : "";

  return `<section class="academic-overview">
    <span class="eyebrow">${STR.academicProfile}</span>
    <p>${escapeHtml(academic.profile)}</p>
    ${feedLinks}
  </section>
  ${renderAcademicSection(STR.academicMustRead, mustRead)}
  ${renderAcademicSection(STR.academicDeepRead, deepRead)}
  ${watch.length > 0 ? renderAcademicSection(STR.academicWatch, watch) : ""}
  <section class="financial-risk">
    <strong>${STR.academicSourceNotes}</strong>
    <ul class="academic-notes">
      ${academic.source_notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
    </ul>
    <strong>${STR.academicRiskCaveat}</strong><br>
    ${escapeHtml(academic.risk_caveat)}
  </section>`;
}

// ----- financial analysis panel -----

function renderFinancialCard(item: FinancialInstrumentSnapshot): string {
  const pctCls = item.pct1Day >= 0 ? "positive" : "negative";
  const signalLine =
    item.signals.length > 0 ? ` · ${item.signals.map(escapeHtml).join(" / ")}` : "";
  return `<article class="financial-card">
    <header class="financial-card-head">
      <div>
        <h3 class="financial-name">${escapeHtml(item.displayName)}</h3>
        <span class="financial-symbol">${escapeHtml(item.symbol)}</span>
      </div>
      <span class="financial-pct ${pctCls}">${fmtPct(item.pct1Day)}</span>
    </header>
    <div class="financial-meta">
      <span>${STR.ticker5d} ${fmtPct(item.pct5Day)}</span>
      <span>RSI ${fmtNum(item.rsi14, 1)}</span>
      <span>${TREND_LABEL[item.trend]}</span>
      ${signalLine ? `<span>${signalLine}</span>` : ""}
    </div>
  </article>`;
}

function renderFinancialList(
  title: string,
  items: FinancialInstrumentSnapshot[],
): string {
  return `<section class="financial-section">
    <h2 class="category-title trading-section-title">${escapeHtml(title)}</h2>
    <div class="financial-section-grid">
      ${items.length === 0 ? `<p class="empty">${STR.emptyGroup}</p>` : items.map(renderFinancialCard).join("\n")}
    </div>
  </section>`;
}

function renderFinancialPanel(financial: FinancialAnalysisSection): string {
  return `<section class="financial-overview">
    <span class="eyebrow">${STR.financialOverview} · ${STR.financialMarketDate} ${escapeHtml(financial.market_date)}</span>
    <p>${escapeHtml(financial.overview)}</p>
  </section>

  <section class="financial-section">
    <h2 class="category-title trading-section-title">${STR.financialTrendSummary}</h2>
    <p class="overview-text trading-overview-text">${escapeHtml(financial.trend_summary)}</p>
  </section>

  <section class="financial-section">
    <h2 class="category-title trading-section-title">${STR.financialOutlook}</h2>
    <ul class="financial-notes">
      ${financial.outlook.scenarios.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
    </ul>
  </section>

  <div class="financial-market-columns">
    <section class="financial-market-column" data-financial-column="a-share">
      <h2 class="financial-market-heading">${STR.financialASharesColumn}</h2>
      <section class="financial-section">
        <h3 class="category-title trading-section-title">${STR.financialAShares}</h3>
        <p class="overview-text trading-overview-text">${escapeHtml(financial.a_share.overview)}</p>
      </section>
      <section class="financial-section">
        <h3 class="category-title trading-section-title">${STR.financialOutlook}</h3>
        <p class="overview-text trading-overview-text">${escapeHtml(financial.outlook.a_share)}</p>
        <p class="overview-text trading-overview-text">${escapeHtml(financial.outlook.key_sectors)}</p>
      </section>
      ${renderFinancialList(STR.financialAIndices, financial.a_share.indices)}
      ${renderFinancialList(STR.financialASectors, financial.a_share.sectors)}
    </section>

    <section class="financial-market-column" data-financial-column="us-market">
      <h2 class="financial-market-heading">${STR.financialUSMarketColumn}</h2>
      <section class="financial-section">
        <h3 class="category-title trading-section-title">${STR.financialUSMarket}</h3>
        <p class="overview-text trading-overview-text">${escapeHtml(financial.us_market.overview)}</p>
      </section>
      <section class="financial-section">
        <h3 class="category-title trading-section-title">${STR.financialOutlook}</h3>
        <p class="overview-text trading-overview-text">${escapeHtml(financial.outlook.us_market)}</p>
        <p class="overview-text trading-overview-text">${escapeHtml(financial.outlook.megacaps)}</p>
      </section>
      ${renderFinancialList(STR.financialUSIndices, financial.us_market.indices)}
      ${renderFinancialList(STR.financialUSMegacaps, financial.us_market.megacaps)}
    </section>
  </div>

  <section class="financial-section">
    <h2 class="category-title trading-section-title">${STR.financialCrossMarket}</h2>
    <ul class="financial-notes">
      ${financial.cross_market.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
    </ul>
  </section>

  <section class="financial-risk">
    <strong>${STR.financialRiskCaveat}</strong><br>
    ${escapeHtml(financial.risk_caveat)}
  </section>`;
}

// ----- trading panel -----

const SIGNAL_TONE: Record<string, "bull" | "bear" | "caution"> = {
  "golden-cross": "bull",
  "macd-bull-cross": "bull",
  "above-sma50-sma200": "bull",
  "near-52w-high": "bull",
  "death-cross": "bear",
  "macd-bear-cross": "bear",
  "below-sma50-sma200": "bear",
  "near-52w-low": "bear",
  "rsi-overbought": "caution",
  "rsi-oversold": "caution",
};

const TREND_LABEL: Record<TickerAnalysis["trend"], string> = {
  bullish: STR.trendBullish,
  bearish: STR.trendBearish,
  neutral: STR.trendNeutral,
};

function stanceClass(stance: string): "bull" | "bear" | "neutral" {
  // Supports both legacy ("看多"/"看空") and current ("偏上行"/"偏下行")
  // stance values. The current values were chosen to avoid Sonnet's
  // "no investment advice" guardrail; rendering keeps both readable.
  if (/多|涨|上行|bull/i.test(stance)) return "bull";
  if (/空|跌|下行|bear/i.test(stance)) return "bear";
  return "neutral";
}

function fmtNum(n: number | null | undefined, dp = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  // Use thousand separators only for prices >= 1000
  const abs = Math.abs(n);
  if (abs >= 1000) return n.toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n.toFixed(dp);
}

function fmtPct(n: number, dp = 2): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(dp)}%`;
}

function renderPickCard(p: WatchlistPick): string {
  const cls = stanceClass(p.stance);
  const symbol = escapeHtml(p.symbol);
  const name = escapeHtml(p.display_name ?? p.symbol);
  const stance = escapeHtml(p.stance);
  const rationale = escapeHtml(p.rationale ?? "");
  return `<article class="trading-pick stance-${cls}">
    <header class="pick-head">
      <div class="pick-symbol-block">
        <span class="pick-symbol">${symbol}</span>
        <span class="pick-name">${name}</span>
      </div>
      <span class="pick-stance pick-stance-${cls}">${stance}</span>
    </header>
    <p class="pick-rationale">${rationale}</p>
  </article>`;
}

function renderTickerCard(t: TickerAnalysis): string {
  const trendCls = t.trend;
  const priceCls = t.pct1Day >= 0 ? "positive" : "negative";
  const pct5Cls = t.pct5Day >= 0 ? "positive" : "negative";
  const signals = t.signals
    .map((s) => {
      const tone = SIGNAL_TONE[s.type] ?? "caution";
      const ageSuffix =
        s.daysAgo !== undefined
          ? ` <span class="signal-age">(${s.daysAgo === 0 ? STR.signalToday : `${s.daysAgo} ${STR.signalDaysAgoSuffix}`})</span>`
          : "";
      return `<span class="signal-pill tone-${tone}">${escapeHtml(s.label)}${ageSuffix}</span>`;
    })
    .join("");
  const currencyPrefix = t.currency === "USD" ? "$" : t.currency === "HKD" ? "HK$" : t.currency === "CNY" ? "¥" : "";
  return `<article class="ticker-card">
    <header class="ticker-head">
      <div class="ticker-id">
        <h3 class="ticker-symbol">${escapeHtml(t.symbol)}</h3>
        <p class="ticker-name">${escapeHtml(t.displayName)}</p>
      </div>
      <div class="ticker-price-block">
        <span class="ticker-price">${currencyPrefix}${fmtNum(t.currentPrice)}</span>
        <span class="ticker-pct ${priceCls}">${fmtPct(t.pct1Day)}</span>
      </div>
    </header>
    <dl class="ticker-indicators">
      <div><dt>${STR.ticker5d}</dt><dd class="${pct5Cls}">${fmtPct(t.pct5Day)}</dd></div>
      <div><dt>${STR.tickerVs52wHigh}</dt><dd>${fmtPct(t.pct52WeekHigh, 1)}</dd></div>
      <div><dt>RSI(14)</dt><dd class="rsi-${t.rsiState}">${fmtNum(t.rsi14, 1)}</dd></div>
      <div><dt>${STR.tickerTrend}</dt><dd class="trend-${trendCls}">${TREND_LABEL[t.trend]}</dd></div>
      <div><dt>SMA 20 / 50 / 200</dt><dd>${fmtNum(t.sma20)} / ${fmtNum(t.sma50)} / ${fmtNum(t.sma200)}</dd></div>
      <div><dt>${STR.tickerMacd}</dt><dd>${fmtNum(t.macd, 3)} / ${fmtNum(t.macdSignal, 3)}</dd></div>
    </dl>
    ${signals ? `<div class="ticker-signals">${signals}</div>` : ""}
  </article>`;
}

function fearGreedTone(value: number): "fear-extreme" | "fear" | "neutral" | "greed" | "greed-extreme" {
  if (value <= 24) return "fear-extreme";
  if (value <= 44) return "fear";
  if (value <= 55) return "neutral";
  if (value <= 74) return "greed";
  return "greed-extreme";
}

function fmtBigUsd(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  return `$${n.toFixed(0)}`;
}

function renderCryptoWidgets(t: TradingSection): string {
  const fg = t.crypto_fear_greed;
  const cg = t.crypto_global;
  if (!fg && !cg) return "";
  const items: string[] = [];
  if (fg) {
    const tone = fearGreedTone(fg.value);
    items.push(`<div class="crypto-widget fg-${tone}">
      <div class="widget-label">${STR.widgetCryptoFearGreed}</div>
      <div class="widget-value">${fg.value}</div>
      <div class="widget-sub">${escapeHtml(fg.classificationCn)}</div>
    </div>`);
  }
  if (cg) {
    const tone = cg.marketCapChangePct24h >= 0 ? "positive" : "negative";
    items.push(`<div class="crypto-widget">
      <div class="widget-label">${STR.widgetCryptoCap}</div>
      <div class="widget-value">${fmtBigUsd(cg.totalMarketCapUsd)}</div>
      <div class="widget-sub ${tone}">${fmtPct(cg.marketCapChangePct24h)} / 24h</div>
    </div>`);
    items.push(`<div class="crypto-widget">
      <div class="widget-label">${STR.widgetBtcDom}</div>
      <div class="widget-value">${cg.btcDominance.toFixed(1)}%</div>
      <div class="widget-sub">ETH ${cg.ethDominance.toFixed(1)}%</div>
    </div>`);
    items.push(`<div class="crypto-widget">
      <div class="widget-label">${STR.widgetVolume24h}</div>
      <div class="widget-value">${fmtBigUsd(cg.total24hVolumeUsd)}</div>
      <div class="widget-sub">${STR.widgetActiveCoins} ${cg.activeCryptocurrencies.toLocaleString()}</div>
    </div>`);
  }
  return `<div class="crypto-widgets">${items.join("")}</div>`;
}

function renderTradingPanel(trading: TradingSection): string {
  const tickers = trading.tickers;
  const groupCounts: Record<AssetGroup, number> = {
    "us-equity": 0,
    crypto: 0,
    "china-equity": 0,
    "commodity-fx": 0,
    macro: 0,
  };
  for (const t of tickers) groupCounts[t.group as AssetGroup] = (groupCounts[t.group as AssetGroup] ?? 0) + 1;

  const groupTabs = ASSET_GROUP_ORDER.map(
    (g, i) =>
      `<button class="trading-group-tab${i === 0 ? " active" : ""}" data-group="${g}">${escapeHtml(ASSET_GROUP_LABELS_LOCALIZED[g])}<span class="count">${groupCounts[g] ?? 0}</span></button>`,
  ).join("");

  const groupPanels = ASSET_GROUP_ORDER.map((g, i) => {
    const groupTickers = tickers.filter((t) => t.group === g);
    // Crypto sub-tab carries an extra header widget panel (F&G + global stats)
    const cryptoWidgets =
      g === "crypto" ? renderCryptoWidgets(trading) : "";
    return `<div class="trading-group-content${i === 0 ? " active" : ""}" data-group="${g}">
      ${cryptoWidgets}
      ${groupTickers.length === 0 ? `<p class="empty">${STR.emptyGroup}</p>` : groupTickers.map(renderTickerCard).join("")}
    </div>`;
  }).join("");

  const overview = escapeHtml(trading.market_overview ?? "");
  const risk = escapeHtml(trading.risk_caveat ?? "");

  return `<section class="trading-overview-card">
    <span class="eyebrow">${STR.tradingMarketOverview}</span>
    <p class="overview-text trading-overview-text">${overview}</p>
  </section>

  ${
    trading.watchlist.length > 0
      ? `<section class="trading-watchlist">
    <h2 class="category-title trading-section-title">${STR.tradingTodayFocus}</h2>
    <div class="trading-picks">
      ${trading.watchlist.map(renderPickCard).join("\n")}
    </div>
  </section>`
      : ""
  }

  <section class="trading-tickers">
    <h2 class="category-title trading-section-title">${STR.tradingAllAssets}</h2>
    <nav class="trading-group-tabs">${groupTabs}</nav>
    <div class="trading-group-contents">${groupPanels}</div>
  </section>

  ${
    risk
      ? `<section class="trading-risk">
    <span class="eyebrow">${STR.tradingRiskCaveat}</span>
    <p>${risk}</p>
  </section>`
      : ""
  }`;
}

// ----- markdown -----

function renderBriefMarkdown(b: BriefItem): string {
  const importance = Number.isFinite(b.importance) ? b.importance : 0;
  return `### [${b.title}](${b.url})\n${b.source} · ${STR.mdImportance} ${importance}/10\n\n${b.summary}\n`;
}

function renderSectionMarkdown(title: string, briefs: BriefItem[]): string {
  if (briefs.length === 0) return "";
  return `## ${title}\n\n${briefs.map(renderBriefMarkdown).join("\n")}\n`;
}

function renderAcademicPaperMarkdown(
  item: AcademicPaperItem,
  paperNo: string,
): string {
  const titleZh = item.title_zh || item.title;
  const titleEn = item.title_en || item.title;
  const abstractZh = item.abstract_zh || item.summary_zh || item.summary;
  const abstractEn = item.abstract_en || item.summary;
  const whyThisMatters =
    item.why_this_matters || item.why_relevant || item.relevance;
  const date = formatAcademicDate(item.published_at);
  const meta = [
    paperNo,
    item.source,
    date,
    `${STR.academicScore} ${item.score.toFixed(1)}`,
    item.is_new ? STR.academicNew : "",
    priorityLabel(item.priority),
  ]
    .filter(Boolean)
    .join(" · ");
  const tags = item.tags.length > 0 ? `\n\n${item.tags.map((tag) => `\`#${tag}\``).join(" ")}` : "";
  return `### ${paperNo ? `${paperNo} - ` : ""}[${titleZh}](${item.url})\n${meta}\n\n${STR.academicOriginalTitle}：${titleEn}\n\n${STR.academicTitleZh}：${titleZh}\n\n${STR.academicSummaryZh}：${abstractZh}\n\n${STR.academicOriginalSummary}：${abstractEn}\n\n${STR.academicWhyRelevant}：\n${whyThisMatters}\n\n${item.action}${tags}\n`;
}

function renderAcademicMarkdown(academic: AcademicRadarSection): string {
  const mustRead = academic.items.filter((item) => item.priority === "must-read");
  const deepRead = academic.deep_read_candidates.filter(
    (item) => item.priority !== "must-read",
  );
  const watch = academic.items.filter((item) => item.priority === "watch");
  const renderPaper = (item: AcademicPaperItem) =>
    renderAcademicPaperMarkdown(item, item.paper_no ?? "");

  return [
    `## ${STR.catAcademic}`,
    "",
    `${STR.academicProfile}：${academic.profile}`,
    "",
    mustRead.length > 0
      ? `### ${STR.academicMustRead}\n\n${mustRead.map(renderPaper).join("\n")}`
      : "",
    deepRead.length > 0
      ? `### ${STR.academicDeepRead}\n\n${deepRead.map(renderPaper).join("\n")}`
      : "",
    watch.length > 0
      ? `### ${STR.academicWatch}\n\n${watch.map(renderPaper).join("\n")}`
      : "",
    `### ${STR.academicSourceNotes}`,
    academic.source_notes.map((note) => `- ${note}`).join("\n"),
    "",
    `### ${STR.academicRiskCaveat}`,
    academic.risk_caveat,
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderFinancialItemMarkdown(item: FinancialInstrumentSnapshot): string {
  const signals = item.signals.length > 0 ? `；信号：${item.signals.join(" / ")}` : "";
  return `- ${item.displayName} (${item.symbol})：${fmtPct(item.pct1Day)}，5日 ${fmtPct(item.pct5Day)}，RSI ${fmtNum(item.rsi14, 1)}，趋势${TREND_LABEL[item.trend]}${signals}`;
}

function renderFinancialMarkdown(financial: FinancialAnalysisSection): string {
  return [
    `## ${STR.catFinancialAnalysis}`,
    "",
    `${STR.financialMarketDate}：${financial.market_date}`,
    "",
    financial.overview,
    "",
    `### ${STR.financialTrendSummary}`,
    "",
    financial.trend_summary,
    "",
    `### ${STR.financialOutlook}`,
    "",
    financial.outlook.scenarios.map((note) => `- ${note}`).join("\n"),
    "",
    `### ${STR.financialASharesColumn}`,
    "",
    `#### ${STR.financialAShares}`,
    "",
    financial.a_share.overview,
    "",
    `#### ${STR.financialOutlook}`,
    "",
    financial.outlook.a_share,
    "",
    financial.outlook.key_sectors,
    "",
    `#### ${STR.financialAIndices}`,
    financial.a_share.indices.map(renderFinancialItemMarkdown).join("\n"),
    "",
    `#### ${STR.financialASectors}`,
    financial.a_share.sectors.map(renderFinancialItemMarkdown).join("\n"),
    "",
    `### ${STR.financialUSMarketColumn}`,
    "",
    `#### ${STR.financialUSMarket}`,
    "",
    financial.us_market.overview,
    "",
    `#### ${STR.financialOutlook}`,
    "",
    financial.outlook.us_market,
    "",
    financial.outlook.megacaps,
    "",
    `#### ${STR.financialUSIndices}`,
    financial.us_market.indices.map(renderFinancialItemMarkdown).join("\n"),
    "",
    `#### ${STR.financialUSMegacaps}`,
    financial.us_market.megacaps.map(renderFinancialItemMarkdown).join("\n"),
    "",
    `### ${STR.financialCrossMarket}`,
    financial.cross_market.map((note) => `- ${note}`).join("\n"),
    "",
    `### ${STR.financialRiskCaveat}`,
    "",
    financial.risk_caveat,
    "",
  ].join("\n");
}

export function renderMarkdown(report: DailyReport, date: string): string {
  const blocks: string[] = [];
  blocks.push(`# ${STR.siteTitle} · ${date}\n`);
  if (report.hero_headline) blocks.push(`> ${report.hero_headline}\n`);
  if (report.daily_overview) {
    blocks.push(`## ${STR.mdTodayOverview}\n\n${report.daily_overview}\n`);
  }
  if (report.financial_analysis) {
    blocks.push(renderFinancialMarkdown(report.financial_analysis));
  }
  if (report.academic_radar) {
    blocks.push(renderAcademicMarkdown(report.academic_radar));
  }
  blocks.push(
    renderSectionMarkdown(CATEGORY_DIGEST_LABELS.tech, report.tech_briefs),
  );
  blocks.push(
    renderSectionMarkdown(
      CATEGORY_DIGEST_LABELS.finance,
      report.finance_briefs,
    ),
  );
  blocks.push(
    renderSectionMarkdown(
      CATEGORY_DIGEST_LABELS.politics,
      report.politics_briefs,
    ),
  );
  if (report.editor_note) {
    blocks.push(`## ${STR.mdEditorNote}\n\n${report.editor_note}\n`);
  }
  if (report.keywords.length > 0) {
    blocks.push(
      `## ${STR.mdTodayKeywords}\n\n${report.keywords.map((k) => `\`#${k}\``).join(" ")}\n`,
    );
  }
  return blocks.filter(Boolean).join("\n");
}
