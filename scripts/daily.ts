import "./_env";

import fs from "node:fs";
import path from "node:path";

import { sources, REPORT_LOCALE } from "../lib/sources/registry";
import { fetchSource } from "../lib/sources/dispatch";
import { applySourceFetchLimit } from "../lib/sources/source-policy";
import {
  generateDailyReport,
  type ArticleInput,
} from "../lib/ai/pipeline";
import { getModelTag } from "../lib/ai/llm";
import {
  enrichGithubTrendingSummaries,
  enrichNewsTitlesAndSummaries,
  enrichXViralSummaries,
} from "../lib/ai/enrich";
import { translateAcademicRadar } from "../lib/ai/academic-translation";
import {
  groupRaw,
  isSportsArticle,
  MERGED_SUBGROUP_LIMITS,
  renderHtml,
  renderMarkdown,
} from "../lib/output/render";
import { analyzeWatchlist } from "../lib/trading/runner";
import { fetchCryptoFearGreed } from "../lib/trading/fear-greed";
import { fetchCryptoGlobal } from "../lib/trading/coingecko";
import { generateTradingCommentary } from "../lib/ai/trading-commentary";
import type { TradingSection } from "../lib/ai/pipeline";
import {
  buildFinancialAnalysis,
  fetchFinancialSnapshots,
  type FinancialAnalysisSection,
} from "../lib/financial-analysis";
import {
  fetchAcademicRadar,
  type AcademicRadarSection,
} from "../lib/academic-radar";
import { ensureAcademicRadarAbstracts } from "../lib/academic-radar/abstracts";
import { finalizeAcademicRadarDisplay } from "../lib/academic-radar/display";
import {
  createEmptyAcademicSeenState,
  markAcademicFreshness,
  normalizeAcademicSeenState,
  type AcademicSeenState,
} from "../lib/academic-radar/freshness";
import { todayKey } from "../lib/utils";
import {
  buildDailyAddons,
  buildSourceHealthFromFetchResults,
  type SourceHealthSection,
  type SourceFetchHealthInput,
} from "../lib/daily-addons";

const OUTPUT_DIR = "daily_reports";
const ACADEMIC_SEEN_STATE_PATH = path.join("data", "academic-seen.json");

function readAcademicSeenState(): AcademicSeenState {
  if (!fs.existsSync(ACADEMIC_SEEN_STATE_PATH)) {
    return createEmptyAcademicSeenState();
  }
  try {
    const parsed = JSON.parse(
      fs.readFileSync(ACADEMIC_SEEN_STATE_PATH, "utf8"),
    ) as Partial<AcademicSeenState>;
    if (parsed.version === 1 && parsed.papers && typeof parsed.papers === "object") {
      return normalizeAcademicSeenState(parsed as AcademicSeenState);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[daily] academic seen state unreadable; starting fresh: ${msg}`);
  }
  return createEmptyAcademicSeenState();
}

function writeAcademicSeenState(state: AcademicSeenState): void {
  fs.mkdirSync(path.dirname(ACADEMIC_SEEN_STATE_PATH), { recursive: true });
  const temporary = `${ACADEMIC_SEEN_STATE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2), "utf8");
  fs.renameSync(temporary, ACADEMIC_SEEN_STATE_PATH);
}

async function fetchAll(): Promise<{
  articles: ArticleInput[];
  sourceHealth: SourceHealthSection;
}> {
  const articles: ArticleInput[] = [];
  const healthInputs: SourceFetchHealthInput[] = [];
  const enabled = sources.filter((s) => s.enabled !== false);
  for (const source of enabled) {
    try {
      const fetched = await fetchSource(source);
      const items = applySourceFetchLimit(source, fetched);
      console.log(`  ${source.id.padEnd(20)} ${items.length}`);
      healthInputs.push({
        id: source.id,
        name: source.name,
        category: source.category,
        subcategory: source.subcategory,
        status: items.length > 0 ? "ok" : "empty",
        count: items.length,
      });
      articles.push(...items.map((it) => ({ ...it, source: source.name })));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ${source.id.padEnd(20)} FAILED — ${msg}`);
      healthInputs.push({
        id: source.id,
        name: source.name,
        category: source.category,
        subcategory: source.subcategory,
        status: "failed",
        count: 0,
        error: msg,
      });
    }
  }
  return {
    articles,
    sourceHealth: buildSourceHealthFromFetchResults(healthInputs),
  };
}

async function enrichGhTrending(articles: ArticleInput[]): Promise<void> {
  const gh = articles.filter((a) => a.sourceId === "github-trending");
  if (gh.length === 0) return;
  console.log(
    `[daily] enriching ${gh.length} GitHub Trending repos with ${REPORT_LOCALE} summaries…`,
  );
  const t0 = Date.now();
  const summaries = await enrichGithubTrendingSummaries(gh);
  for (const a of gh) {
    const s = summaries.get(a.url);
    if (s) a.summary = s;
  }
  console.log(
    `[daily] enrichment done in ${((Date.now() - t0) / 1000).toFixed(1)}s, matched ${summaries.size}/${gh.length}`,
  );
}

/**
 * finance:news is rendered as a merged time-sorted list (see
 * MERGED_SUBGROUP_LIMITS in render.ts). Enrich exactly the items that
 * will be displayed: take all enabled finance:news articles, sort by
 * publishedAt desc, slice to the merge limit, ask Sonnet for Chinese
 * factual summaries.
 */
async function enrichFinanceNews(articles: ArticleInput[]): Promise<void> {
  await enrichMergedSubgroup(articles, "finance", "news");
}

async function enrichFinanceCreator(articles: ArticleInput[]): Promise<void> {
  await enrichMergedSubgroup(articles, "finance", "creator");
}

async function enrichPolitics(articles: ArticleInput[]): Promise<void> {
  await enrichMergedSubgroup(articles, "politics", "world");
}

async function enrichAiNews(articles: ArticleInput[]): Promise<void> {
  await enrichMergedSubgroup(articles, "tech", "ai-news");
}

async function enrichCommunity(articles: ArticleInput[]): Promise<void> {
  await enrichMergedSubgroup(articles, "tech", "overseas-community");
}

/**
 * X 热帖 enrichment is different from merged subgroups — we preserve the
 * AttentionVC API's heat-rank order (do NOT sort by date) and cap to the
 * displayed limit (matches SOURCE_DISPLAY_LIMITS["tech:x-viral"]).
 *
 * The Sonnet prompt also differs (XVIRAL_SYSTEM_PROMPT in enrich.ts) — X
 * tweet titles are clickbait, the previewText holds the actual claim.
 */
async function enrichXViral(articles: ArticleInput[]): Promise<void> {
  const xPosts = articles
    .filter((a) => a.sourceId === "attentionvc-ai")
    .slice(0, 20);
  if (xPosts.length === 0) return;
  console.log(`[daily] enriching ${xPosts.length} X posts with ${REPORT_LOCALE} summaries…`);
  const t0 = Date.now();
  // Author handle is encoded in the URL (https://x.com/{handle}/status/{id})
  // — extract it to help the model identify whose claim it is.
  const summaries = await enrichXViralSummaries(
    xPosts.map((a) => ({
      url: a.url,
      title: a.title,
      excerpt: a.excerpt,
      author: a.url.match(/x\.com\/([^/]+)\//)?.[1] ?? "",
    })),
  );
  for (const a of xPosts) {
    const s = summaries.get(a.url);
    if (s) a.summary = s;
  }
  console.log(
    `[daily] enrichment done in ${((Date.now() - t0) / 1000).toFixed(1)}s, matched ${summaries.size}/${xPosts.length}`,
  );
}

/**
 * Shared implementation for "merged subgroup" enrichment: collect all
 * enabled articles in (category, subcategory), sort by date desc, take
 * the display cap (from MERGED_SUBGROUP_LIMITS), and ask the LLM to
 * summarize them into REPORT_LOCALE in a single batch. Symmetric to the
 * merge logic in render.ts groupRaw, so display and enrichment stay aligned.
 *
 * Sources whose `lang` already matches REPORT_LOCALE are skipped — no
 * point translating English to English (en mode) or Chinese to Chinese
 * (zh mode).
 */
async function enrichMergedSubgroup(
  articles: ArticleInput[],
  category: "tech" | "finance" | "politics",
  subcategory: string,
): Promise<void> {
  const subSources = sources.filter(
    (s) =>
      s.category === category &&
      s.subcategory === subcategory &&
      s.enabled !== false,
  );
  const enabledIds = new Set(subSources.map((s) => s.id));
  const sameLocaleIds = new Set(
    subSources.filter((s) => (s.lang ?? "en") === REPORT_LOCALE).map((s) => s.id),
  );
  const limit = MERGED_SUBGROUP_LIMITS[`${category}:${subcategory}`] ?? 12;
  // Top-N respects all enabled sources (so we don't reshape the merged
  // timeline). Enrichment only targets items NOT already in the target
  // language within that slice.
  const top = articles
    .filter((a) => enabledIds.has(a.sourceId))
    .filter((a) => category !== "politics" || !isSportsArticle(a.title))
    .sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    )
    .slice(0, limit);
  const toEnrich = top.filter((a) => !sameLocaleIds.has(a.sourceId));
  if (toEnrich.length === 0) return;
  console.log(
    `[daily] enriching ${toEnrich.length}/${top.length} ${category}:${subcategory} items with ${REPORT_LOCALE} summaries…`,
  );
  const t0 = Date.now();
  const summaries = await enrichNewsTitlesAndSummaries(toEnrich);
  for (const a of toEnrich) {
    const s = summaries.get(a.url);
    if (s) {
      a.summary = s.summary;
      if (s.localizedTitle) a.localizedTitle = s.localizedTitle;
    }
  }
  console.log(
    `[daily] enrichment done in ${((Date.now() - t0) / 1000).toFixed(1)}s, matched ${summaries.size}/${toEnrich.length}`,
  );
}

/**
 * Pull daily OHLCV from Yahoo for every ticker in the watchlist, compute
 * indicators + signals, then ask Sonnet for a market overview + a
 * picks-to-watch list. Returns null if no ticker came back.
 */
async function runTrading(): Promise<TradingSection | null> {
  console.log(`[daily] analyzing watchlist + crypto context (Yahoo / alt.me / CoinGecko)…`);
  const t0 = Date.now();
  const [tickers, cryptoFearGreed, cryptoGlobal] = await Promise.all([
    analyzeWatchlist(),
    fetchCryptoFearGreed(),
    fetchCryptoGlobal(),
  ]);
  console.log(
    `[daily] indicators ready in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${tickers.length} tickers` +
      (cryptoFearGreed ? `, F&G ${cryptoFearGreed.value}` : ", F&G ✗") +
      (cryptoGlobal
        ? `, BTC dom ${cryptoGlobal.btcDominance.toFixed(1)}%`
        : ", CG ✗"),
  );
  if (tickers.length === 0) return null;
  console.log(`[daily] generating trading commentary with ${getModelTag()}…`);
  const t1 = Date.now();
  const commentary = await generateTradingCommentary({
    tickers,
    cryptoFearGreed: cryptoFearGreed ?? undefined,
    cryptoGlobal: cryptoGlobal ?? undefined,
  });
  console.log(
    `[daily] trading commentary ready in ${((Date.now() - t1) / 1000).toFixed(1)}s`,
  );
  return {
    ...commentary,
    tickers,
    crypto_fear_greed: cryptoFearGreed ?? undefined,
    crypto_global: cryptoGlobal ?? undefined,
    generated_at: new Date().toISOString(),
  };
}

async function runFinancialAnalysis(): Promise<FinancialAnalysisSection | null> {
  console.log(`[daily] building A-share / US financial analysis (Yahoo)…`);
  const t0 = Date.now();
  const instruments = await fetchFinancialSnapshots();
  console.log(
    `[daily] financial market data ready in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${instruments.length} instruments`,
  );
  if (instruments.length === 0) return null;
  return buildFinancialAnalysis({ instruments });
}

async function runAcademicRadar(date: string): Promise<{
  radar: AcademicRadarSection;
  state: AcademicSeenState;
}> {
  console.log(`[daily] building academic radar (Crossref / optional arXiv)…`);
  const t0 = Date.now();
  let radar = await fetchAcademicRadar();
  console.log(
    `[daily] academic radar ready in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${radar.items.length} ranked papers`,
  );
  if (radar.items.length > 0) {
    console.log(`[daily] resolving missing academic abstracts from original pages / metadata…`);
    const tAbstract = Date.now();
    const resolved = await ensureAcademicRadarAbstracts(radar);
    radar = finalizeAcademicRadarDisplay(resolved.radar);
    console.log(
      `[daily] academic abstracts ready in ${((Date.now() - tAbstract) / 1000).toFixed(1)}s — ${radar.items.length} papers with abstracts`,
    );
  }
  if (radar.items.length > 0) {
    try {
      console.log(`[daily] translating academic titles + abstracts with ${getModelTag()}…`);
      const t1 = Date.now();
      radar = await translateAcademicRadar(radar);
      console.log(
        `[daily] academic translation ready in ${((Date.now() - t1) / 1000).toFixed(1)}s`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`[daily] academic translation quality gate failed; hiding radar: ${msg}`);
      radar = {
        ...radar,
        items: [],
        deep_read_candidates: [],
        source_notes: [...radar.source_notes, `Translation gate failed: ${msg}`],
      };
    }
  }

  const marked = markAcademicFreshness(radar, readAcademicSeenState(), date);
  console.log(
    `[daily] academic freshness ready — ${marked.newItems.length} new papers`,
  );
  return {
    radar: finalizeAcademicRadarDisplay(marked.radar),
    state: marked.state,
  };
}

async function main() {
  const date = todayKey();
  console.log(`[daily] ${date} — fetching sources…\n`);
  const { articles, sourceHealth } = await fetchAll();
  console.log(`\n[daily] total articles: ${articles.length}`);
  if (articles.length === 0) {
    throw new Error("no articles fetched — aborting");
  }

  // Enrich GH Trending, finance news, and politics with Chinese summaries.
  await enrichGhTrending(articles);
  await enrichFinanceNews(articles);
  await enrichFinanceCreator(articles);
  await enrichPolitics(articles);
  await enrichAiNews(articles);
  await enrichCommunity(articles);
  await enrichXViral(articles);

  // Trading signals: Yahoo fetch + indicators + commentary. Non-fatal —
  // if it errors, we still ship the news digest.
  let trading: TradingSection | null = null;
  try {
    trading = await runTrading();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[daily] trading section failed: ${msg}`);
  }

  let financialAnalysis: FinancialAnalysisSection | null = null;
  try {
    financialAnalysis = await runFinancialAnalysis();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[daily] financial analysis failed: ${msg}`);
  }

  let academicRadar: AcademicRadarSection | null = null;
  let academicSeenState: AcademicSeenState | null = null;
  try {
    const academicResult = await runAcademicRadar(date);
    academicRadar = academicResult.radar;
    academicSeenState = academicResult.state;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[daily] academic radar failed: ${msg}`);
  }

  console.log(`[daily] generating digest with ${getModelTag()}…`);
  const t0 = Date.now();
  const { report } = await generateDailyReport(articles);
  if (trading) report.trading = trading;
  if (financialAnalysis) report.financial_analysis = financialAnalysis;
  if (academicRadar) report.academic_radar = academicRadar;
  const reportWithAddons = buildDailyAddons(
    report,
    articles,
    sources,
    sourceHealth,
  );
  console.log(`[daily] digest ready in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const dateDir = path.join(OUTPUT_DIR, date);
  fs.mkdirSync(dateDir, { recursive: true });
  const base = path.join(dateDir, date);
  const raw = groupRaw(articles, sources);
  fs.writeFileSync(`${base}.json`, JSON.stringify(reportWithAddons, null, 2), "utf8");
  // Sidecar with all fetched articles + LLM-attached summary, so
  // scripts/render.ts can rebuild HTML/MD for UI iteration without
  // re-fetching or re-calling the LLM.
  fs.writeFileSync(
    `${base}-articles.json`,
    JSON.stringify({ date, articles, sourceHealth }, null, 2),
    "utf8",
  );
  fs.writeFileSync(`${base}.html`, renderHtml(reportWithAddons, raw, date), "utf8");
  if (process.env.OUTPUT_MARKDOWN === "true") {
    fs.writeFileSync(`${base}.md`, renderMarkdown(reportWithAddons, date), "utf8");
    console.log(`[daily] wrote ${base}.{json,html,md,articles.json}`);
  } else {
    console.log(`[daily] wrote ${base}.{json,html,articles.json}`);
  }

  // Seen-state only advances after every required report artifact has been
  // written successfully, so a failed/partial generation cannot poison the
  // next run's freshness decisions.
  if (academicSeenState) writeAcademicSeenState(academicSeenState);

  console.log(`[daily] done.`);
}

main().catch((e) => {
  console.error(`[daily] FAILED:`, e);
  process.exit(1);
});
