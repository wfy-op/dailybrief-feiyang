import type { ArticleInput, BriefItem, DailyReport } from "./ai/pipeline";
import type { Category, SourceDef } from "./sources/types";

export type TopReadCategory =
  | Category
  | "trading"
  | "academic"
  | "source-health";

export interface TopReadItem {
  rank: number;
  category: TopReadCategory;
  title: string;
  source: string;
  url?: string;
  reason: string;
  score: number;
}

export interface FinanceTopicItem {
  title: string;
  url: string;
  source: string;
  summary: string;
  tickers: string[];
  publishedAt?: string;
}

export interface FinanceTopicCluster {
  id: string;
  title: string;
  count: number;
  sources: string[];
  tickers: string[];
  signal: string;
  risk: string;
  items: FinanceTopicItem[];
}

export type SourceHealthStatus = "ok" | "empty" | "failed";

export interface SourceHealthItem {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  status: SourceHealthStatus;
  count: number;
  error?: string;
}

export interface SourceHealthSection {
  generated_at: string;
  summary: {
    total: number;
    ok: number;
    empty: number;
    failed: number;
    articles: number;
  };
  items: SourceHealthItem[];
}

export interface SourceFetchHealthInput {
  id: string;
  name: string;
  category: Category;
  subcategory?: string;
  status: SourceHealthStatus;
  count: number;
  error?: string;
}

const FINANCE_CREATOR_TOPIC_DEFS: Array<{
  id: string;
  title: string;
  keywords: RegExp;
}> = [
  {
    id: "cpo-photonics",
    title: "CPO/光通信与硅光",
    keywords:
      /CPO|co-?packaged|optical|photonics?|silicon photonics|SiPH|transceiver|800G|1\.6T|CW laser|laser|光通信|硅光|光模块|激光|SIVE|POET|AAOI|LITE|XFAB|MRVL|AVGO|NVLink/i,
  },
  {
    id: "ai-infra",
    title: "AI Infra/算力链",
    keywords:
      /AI infra|AI infrastructure|compute|GPU|datacenter|data center|neocloud|NVDA|AVGO|NBIS|CRWV|IREN|算力|数据中心|云厂商|资本开支/i,
  },
  {
    id: "semiconductor-chain",
    title: "半导体供应链/设备",
    keywords:
      /semiconductor|foundry|wafer|ASIC|chip|SiC|GaN|MEMS|AEHR|TER|TSM|ASML|半导体|晶圆|代工|设备|芯片/i,
  },
  {
    id: "robotics",
    title: "机器人/具身智能",
    keywords: /robot|robotics|humanoid|actuator|harmonic|绿的谐波|机器人|人形|执行器|减速器/i,
  },
  {
    id: "crypto-regulation",
    title: "加密与金融监管",
    keywords: /crypto|bitcoin|ethereum|stablecoin|COIN|HOOD|CRCL|Clarity Act|SEC|加密|稳定币|监管/i,
  },
  {
    id: "macro-liquidity",
    title: "宏观流动性/利率",
    keywords:
      /Fed|rate|rates|yield|dollar|liquidity|inflation|CPI|Treasury|tariff|利率|美联储|美元|流动性|通胀|关税/i,
  },
];

function sourceEnabled(source: SourceDef): boolean {
  return source.enabled !== false;
}

function compactText(value: string | undefined, max = 140): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3)}...`;
}

function extractTickers(text: string): string[] {
  const tickers = new Set<string>();
  for (const match of text.matchAll(/\$([A-Z][A-Z0-9]{0,5})\b/g)) {
    tickers.add(match[1]);
  }
  for (const symbol of [
    "SIVE",
    "AAOI",
    "POET",
    "XFAB",
    "LITE",
    "MRVL",
    "AVGO",
    "NVDA",
    "NBIS",
    "CRWV",
    "IREN",
    "COIN",
    "HOOD",
    "CRCL",
    "AEHR",
  ]) {
    if (new RegExp(`\\b${symbol}\\b`, "i").test(text)) tickers.add(symbol);
  }
  return Array.from(tickers).sort();
}

function titleForArticle(article: ArticleInput): string {
  return article.localizedTitle?.trim() || article.title;
}

function topicForArticle(article: ArticleInput): { id: string; title: string } {
  const haystack = [
    article.title,
    article.localizedTitle,
    article.summary,
    article.excerpt,
    article.meta,
  ]
    .filter(Boolean)
    .join(" ");
  const matched = FINANCE_CREATOR_TOPIC_DEFS.find((topic) =>
    topic.keywords.test(haystack),
  );
  return matched ?? { id: "other", title: "其他财经观点" };
}

function buildClusterSignal(title: string, items: FinanceTopicItem[]): string {
  const sample = items
    .slice(0, 3)
    .map((item) => item.summary)
    .filter(Boolean)
    .join("；");
  const tickers = Array.from(new Set(items.flatMap((item) => item.tickers)));
  const tickerText = tickers.length ? `涉及 ${tickers.join("、")}。` : "";
  return `观点信号集中在「${title}」：${compactText(sample, 150)}${tickerText}`;
}

export function buildFinanceTopicClusters(
  articles: ArticleInput[],
  registry: SourceDef[],
): FinanceTopicCluster[] {
  const creatorIds = new Set(
    registry
      .filter(
        (source) =>
          sourceEnabled(source) &&
          source.category === "finance" &&
          source.subcategory === "creator",
      )
      .map((source) => source.id),
  );
  const buckets = new Map<string, { title: string; items: FinanceTopicItem[] }>();

  for (const article of articles) {
    if (!creatorIds.has(article.sourceId)) continue;
    const topic = topicForArticle(article);
    const text = [
      article.title,
      article.localizedTitle,
      article.summary,
      article.excerpt,
    ]
      .filter(Boolean)
      .join(" ");
    const item: FinanceTopicItem = {
      title: titleForArticle(article),
      url: article.url,
      source: article.source,
      summary: compactText(article.summary || article.excerpt || article.title, 160),
      tickers: extractTickers(text),
      publishedAt: article.publishedAt?.toISOString(),
    };
    const bucket = buckets.get(topic.id) ?? { title: topic.title, items: [] };
    bucket.items.push(item);
    buckets.set(topic.id, bucket);
  }

  return Array.from(buckets.entries())
    .map(([id, bucket]) => {
      const sortedItems = bucket.items
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
        .slice(0, 4);
      const tickers = Array.from(
        new Set(bucket.items.flatMap((item) => item.tickers)),
      ).sort();
      const sources = Array.from(new Set(bucket.items.map((item) => item.source))).sort();
      return {
        id,
        title: bucket.title,
        count: bucket.items.length,
        sources,
        tickers,
        signal: buildClusterSignal(bucket.title, sortedItems),
        risk:
          "这是财经博主观点聚合，不构成投资建议；需要用公司公告、财报和价格行为交叉验证。",
        items: sortedItems,
      };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.title.localeCompare(b.title, "zh-CN");
    })
    .slice(0, 6);
}

export function buildSourceHealthFromFetchResults(
  inputs: SourceFetchHealthInput[],
): SourceHealthSection {
  const items = inputs.map((input) => ({ ...input }));
  const summary = {
    total: items.length,
    ok: items.filter((item) => item.status === "ok").length,
    empty: items.filter((item) => item.status === "empty").length,
    failed: items.filter((item) => item.status === "failed").length,
    articles: items.reduce((sum, item) => sum + item.count, 0),
  };
  return {
    generated_at: new Date().toISOString(),
    summary,
    items,
  };
}

export function buildSourceHealthFromArticles(
  articles: ArticleInput[],
  registry: SourceDef[],
): SourceHealthSection {
  const counts = new Map<string, number>();
  for (const article of articles) {
    counts.set(article.sourceId, (counts.get(article.sourceId) ?? 0) + 1);
  }
  return buildSourceHealthFromFetchResults(
    registry.filter(sourceEnabled).map((source) => {
      const count = counts.get(source.id) ?? 0;
      return {
        id: source.id,
        name: source.name,
        category: source.category,
        subcategory: source.subcategory,
        status: count > 0 ? ("ok" as const) : ("empty" as const),
        count,
      };
    }),
  );
}

function addTopReadCandidate(
  candidates: Omit<TopReadItem, "rank">[],
  item: Omit<TopReadItem, "rank">,
): void {
  if (!item.title.trim() || !item.reason.trim()) return;
  const key = `${item.url ?? ""}|${item.title}`;
  if (candidates.some((candidate) => `${candidate.url ?? ""}|${candidate.title}` === key)) {
    return;
  }
  candidates.push(item);
}

function addBriefCandidates(
  candidates: Omit<TopReadItem, "rank">[],
  category: Category,
  items: BriefItem[],
): void {
  for (const item of items) {
    addTopReadCandidate(candidates, {
      category,
      title: item.title,
      source: item.source,
      url: item.url,
      reason: item.summary,
      score: item.importance,
    });
  }
}

function pickTopReads(candidates: Omit<TopReadItem, "rank">[]): TopReadItem[] {
  const sorted = candidates
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const selected: Omit<TopReadItem, "rank">[] = [];
  const perCategory = new Map<TopReadCategory, number>();
  for (const item of sorted) {
    const count = perCategory.get(item.category) ?? 0;
    if (count >= 2 && selected.length < 5) continue;
    selected.push(item);
    perCategory.set(item.category, count + 1);
    if (selected.length >= 7) break;
  }
  for (const item of sorted) {
    if (selected.length >= 7) break;
    if (!selected.includes(item)) selected.push(item);
  }
  return selected.slice(0, 7).map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export function buildTopReads(
  report: DailyReport,
  financeTopics: FinanceTopicCluster[],
  sourceHealth: SourceHealthSection,
): TopReadItem[] {
  const candidates: Omit<TopReadItem, "rank">[] = [];
  if (report.financial_analysis) {
    addTopReadCandidate(candidates, {
      category: "finance",
      title: `金融分析：${compactText(report.financial_analysis.overview, 34)}`,
      source: "DailyBrief",
      reason: compactText(
        [
          report.financial_analysis.trend_summary,
          report.financial_analysis.outlook.a_share,
          report.financial_analysis.outlook.key_sectors,
        ].join(" "),
        180,
      ),
      score: 10,
    });
  }

  for (const cluster of financeTopics.slice(0, 2)) {
    addTopReadCandidate(candidates, {
      category: "finance",
      title: `财经观点：${cluster.title}`,
      source: cluster.sources.join(" / ") || "Finance creators",
      reason: compactText(cluster.signal, 180),
      score: 8.8 + Math.min(cluster.count, 5) / 10,
    });
  }

  const academicItems = report.academic_radar?.items ?? [];
  academicItems
    .filter((paper) => paper.priority === "must-read" || paper.is_new)
    .slice(0, 2)
    .forEach((paper, index) => {
    addTopReadCandidate(candidates, {
      category: "academic",
      title: `${paper.paper_no || `P${index + 1}`} ${paper.title_zh || paper.title}`,
      source: paper.source,
      url: paper.url,
      reason: compactText(
        paper.why_this_matters ||
          paper.why_relevant ||
          paper.abstract_zh ||
          paper.summary_zh ||
          paper.abstract_en ||
          paper.summary,
        180,
      ),
      score: Math.max(7.5, paper.score),
    });
    });

  if (report.trading?.watchlist?.length) {
    const pick = report.trading.watchlist[0];
    addTopReadCandidate(candidates, {
      category: "trading",
      title: `市场关注：${pick.symbol} ${pick.stance}`,
      source: "DailyBrief",
      reason: compactText(pick.rationale, 180),
      score: 7.8,
    });
  }

  addBriefCandidates(candidates, "tech", report.tech_briefs);
  addBriefCandidates(candidates, "finance", report.finance_briefs);
  addBriefCandidates(candidates, "politics", report.politics_briefs);

  if (sourceHealth.summary.failed > 0 || sourceHealth.summary.empty > 0) {
    addTopReadCandidate(candidates, {
      category: "source-health",
      title: `源健康：${sourceHealth.summary.failed} 个失败，${sourceHealth.summary.empty} 个空源`,
      source: "DailyBrief",
      reason:
        "用于判断当天内容缺口是源端无更新、网络阻断，还是抓取异常。",
      score: sourceHealth.summary.failed > 0 ? 6.8 : 5.5,
    });
  }

  return pickTopReads(candidates);
}

export function buildDailyAddons(
  report: DailyReport,
  articles: ArticleInput[],
  registry: SourceDef[],
  sourceHealth?: SourceHealthSection,
): DailyReport {
  const resolvedHealth =
    sourceHealth ?? buildSourceHealthFromArticles(articles, registry);
  const financeTopics = buildFinanceTopicClusters(articles, registry);
  const topReads = buildTopReads(report, financeTopics, resolvedHealth);
  return {
    ...report,
    top_reads: topReads,
    finance_topics: financeTopics,
    source_health: resolvedHealth,
  };
}
