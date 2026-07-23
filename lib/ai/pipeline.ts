import { jsonrepair } from "jsonrepair";
import { runLlm } from "./llm";
import { extractJson } from "./json-util";
import { SYSTEM_PROMPT_DIGEST_EN, SYSTEM_PROMPT_DIGEST_ZH } from "./prompts";
import { REPORT_LOCALE } from "../sources/registry";
import type { Category, RawArticle } from "../sources/types";
import type { FinancialAnalysisSection } from "../financial-analysis/types";
import type { AcademicRadarSection } from "../academic-radar";
import type {
  FinanceTopicCluster,
  SourceHealthSection,
  TopReadItem,
} from "../daily-addons";

const SYSTEM_PROMPT_DIGEST =
  REPORT_LOCALE === "en" ? SYSTEM_PROMPT_DIGEST_EN : SYSTEM_PROMPT_DIGEST_ZH;

export interface BriefItem {
  title: string;
  url: string;
  source: string;
  summary: string;
  importance: number;
}

export interface DailyReport {
  hero_headline: string;
  daily_overview: string;
  tech_briefs: BriefItem[];
  finance_briefs: BriefItem[];
  politics_briefs: BriefItem[];
  editor_note: string;
  keywords: string[];
  /** Optional trading-signals section, present when scripts/daily.ts ran successfully. */
  trading?: TradingSection;
  /** Optional A-share / US-market review based on representative market data. */
  financial_analysis?: FinancialAnalysisSection;
  /** Optional research-paper radar tailored to the user's photonics work. */
  academic_radar?: AcademicRadarSection;
  /** Optional deterministic cross-section entry point for morning reading. */
  top_reads?: TopReadItem[];
  /** Optional deterministic clustering of finance creator opinions. */
  finance_topics?: FinanceTopicCluster[];
  /** Optional fetch status summary for enabled sources. */
  source_health?: SourceHealthSection;
}

import type { TickerAnalysis } from "../trading/signals";
import type { CryptoGlobalStats } from "../trading/coingecko";
import type { FearGreedSnapshot } from "../trading/fear-greed";
import type { TradingCommentary } from "./trading-commentary";

export interface TradingSection extends TradingCommentary {
  generated_at: string;
  tickers: TickerAnalysis[];
  crypto_fear_greed?: FearGreedSnapshot;
  crypto_global?: CryptoGlobalStats;
}

export interface ArticleInput extends RawArticle {
  source: string;
}

const PER_CATEGORY_LIMIT: Record<Category, number> = {
  tech: 25,
  finance: 20,
  politics: 15,
};

const MAX_AGE_DAYS = 14;

/**
 * Pick `limit` items from `items` so every source gets a fair shot.
 *
 * Why this exists: the previous `slice(0, limit)` honored insertion order,
 * which is the source-iteration order in daily.ts. That gave whichever
 * source came first 100% of the quota — e.g. all 25 tech slots filled by
 * Hacker News before GitHub Trending / Solidot / V2EX / 阮一峰 got a turn.
 *
 * Strategy: drop items older than MAX_AGE_DAYS, group by sourceId,
 * sort each bucket newest-first, then round-robin one item per source
 * until we hit the limit. Sources with fewer items naturally drop out
 * and others absorb the slack.
 */
function selectRoundRobin(
  items: ArticleInput[],
  limit: number,
): ArticleInput[] {
  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const fresh = items.filter(
    (it) => !it.publishedAt || it.publishedAt.getTime() >= cutoff,
  );

  const bySource = new Map<string, ArticleInput[]>();
  for (const it of fresh) {
    const arr = bySource.get(it.sourceId) ?? [];
    arr.push(it);
    bySource.set(it.sourceId, arr);
  }
  for (const arr of bySource.values()) {
    arr.sort(
      (a, b) =>
        (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0),
    );
  }

  const buckets = Array.from(bySource.values());
  const out: ArticleInput[] = [];
  let madeProgress = true;
  while (out.length < limit && madeProgress) {
    madeProgress = false;
    for (const b of buckets) {
      if (b.length === 0) continue;
      out.push(b.shift()!);
      madeProgress = true;
      if (out.length >= limit) break;
    }
  }
  return out;
}

function fallbackBrief(item: ArticleInput): BriefItem {
  const excerpt = (item.excerpt ?? "").replace(/\s+/g, " ").trim();
  const summary = excerpt ||
    (REPORT_LOCALE === "en"
      ? `Source item from ${item.source}; open the original link for details.`
      : `来自${item.source}的候选条目；具体内容以原文链接为准。`);
  return {
    title: item.title,
    url: item.url,
    source: item.source,
    summary,
    importance: 5,
  };
}

export function buildDeterministicDailyReport(
  articles: ArticleInput[],
): DailyReport {
  const grouped: Record<Category, ArticleInput[]> = {
    tech: [],
    finance: [],
    politics: [],
  };
  for (const article of articles) grouped[article.category].push(article);
  const selected = {
    tech: selectRoundRobin(grouped.tech, 5).slice(0, 5),
    finance: selectRoundRobin(grouped.finance, 5).slice(0, 5),
    politics: selectRoundRobin(grouped.politics, 3).slice(0, 3),
  };
  const lead = selected.tech[0] ?? selected.finance[0] ?? selected.politics[0];
  const counts = `${selected.tech.length}/${selected.finance.length}/${selected.politics.length}`;
  const sourceKeywords = [...new Set(
    [...selected.tech, ...selected.finance, ...selected.politics].map((item) => item.source),
  )].slice(0, 5);

  if (REPORT_LOCALE === "en") {
    return {
      hero_headline: lead?.title ?? "Daily source digest",
      daily_overview: `Deterministic fallback digest built directly from fetched source metadata after the language-model summary was unavailable. It includes ${counts} technology, finance, and politics items respectively; titles, links, sources, and excerpts are preserved from the fetched candidates.`,
      tech_briefs: selected.tech.map(fallbackBrief),
      finance_briefs: selected.finance.map(fallbackBrief),
      politics_briefs: selected.politics.map(fallbackBrief),
      editor_note: "This edition used the deterministic fallback. Treat excerpts as source-provided context and open the original links before acting on them.",
      keywords: ["technology", "finance", "politics", ...sourceKeywords].slice(0, 8),
    };
  }
  return {
    hero_headline: lead?.title ?? "每日来源简报",
    daily_overview: `语言模型摘要不可用，本版已自动切换为确定性降级简报，直接保留抓取候选中的标题、链接、来源与摘要。科技、财经、时政分别收录 ${counts} 条；这里不补写来源之外的判断，阅读和决策前请打开原文核对。`,
    tech_briefs: selected.tech.map(fallbackBrief),
    finance_briefs: selected.finance.map(fallbackBrief),
    politics_briefs: selected.politics.map(fallbackBrief),
    editor_note: "本版使用确定性降级路径；摘要仅保留来源材料，不替代原文核验，也不构成投资或行动建议。",
    keywords: ["科技", "财经", "时政", ...sourceKeywords].slice(0, 8),
  };
}

async function callOnce(userPayloadJson: string): Promise<DailyReport> {
  // Claude Code CLI's built-in system prompt biases the model toward
  // conversational markdown output. Anchor the format expectation in the
  // user message (instruction recency wins) *and* explicitly demand every
  // schema field be populated — without this Sonnet has been observed to
  // emit a JSON shell with empty arrays to "satisfy" a JSON-only ask.
  const userPrompt =
    REPORT_LOCALE === "en"
      ? [
          "**Output language: ENGLISH ONLY.** Every string value in the JSON — hero_headline, daily_overview, every brief's title/summary, editor_note, keywords — must be written entirely in English. No Chinese characters anywhere.",
          "",
          "Your task: generate today's daily brief from the candidate news below. **The response MUST be a single valid JSON object** — starts with `{`, ends with `}`, no markdown, no code fences, no explanations.",
          "",
          "The JSON must contain every field non-empty (briefs arrays per the system-prompt counts):",
          "  - hero_headline: 10-25 word headline of the day",
          "  - daily_overview: **150-250 word** paragraph covering tech / finance / politics signals so a reader sees the whole picture at a glance",
          "  - tech_briefs: **3-5** tech BriefItems",
          "  - finance_briefs: **3-5** finance BriefItems",
          "  - politics_briefs: **2-3** politics BriefItems",
          "  - editor_note: 30-60 word editor's note",
          "  - keywords: 5-8 keywords",
          "",
          "BriefItem fields: title, url (copied verbatim from candidate), source, summary, importance (1-10).",
          "**Quote rule (important!)**: For any quotation INSIDE a JSON string, use single quotes ' or curly quotes '\" — **never** raw double quotes \", which break JSON parsing.",
          "No trailing commas.",
          "",
          `Candidate news (JSON array, ${userPayloadJson.length} chars):`,
          userPayloadJson,
        ].join("\n")
      : [
          "你的任务：根据下方候选新闻，生成一份当日简报，**响应必须是一个合法 JSON 对象**——以 `{` 开头，以 `}` 结尾，不要 markdown / 不要代码围栏 / 不要任何解释。",
          "",
          "JSON 必须包含全部字段且不能为空（briefs 数组按 system prompt 规定的条数填充）：",
          "  - hero_headline: 10-25 字的当日一句话头条",
          "  - daily_overview: **150-220 字** 的当日总览段落，一段话覆盖技术 / 财经 / 时政 的核心信号，让读者一眼抓住全貌",
          "  - tech_briefs: **3-5 条** 科技 BriefItem",
          "  - finance_briefs: **3-5 条** 财经 BriefItem",
          "  - politics_briefs: **2-3 条** 时政 BriefItem",
          "  - editor_note: 30-60 字的编辑短评",
          "  - keywords: 5-8 个关键词",
          "",
          "BriefItem 字段：title、url（必须从候选条目原样选取）、source、summary、importance(1-10)。",
          "**引号规则（重要！）**：JSON 字符串内的中文引用请使用**中文全角引号**「」或者 “”，**绝对不要**用英文双引号 \" —— 那会导致 JSON 解析失败。例：写 商务部回应「内卷」 而不是 商务部回应\"内卷\"。",
          "不要使用单引号、不要末尾多余逗号。",
          "",
          "候选新闻（JSON 数组，共 " + userPayloadJson.length + " 字符）：",
          userPayloadJson,
        ].join("\n");
  const { text } = await runLlm({
    systemPrompt: SYSTEM_PROMPT_DIGEST,
    userPrompt,
  });
  const cleaned = extractJson(text);
  let parsed: Partial<DailyReport>;
  try {
    parsed = JSON.parse(cleaned) as Partial<DailyReport>;
  } catch (strictErr) {
    // LLMs routinely emit JSON with unescaped quotes inside Chinese
    // strings (e.g. 商务部回应"内卷"). jsonrepair fixes most of these
    // mechanically before we ever surface a failure.
    try {
      const repaired = jsonrepair(cleaned);
      parsed = JSON.parse(repaired) as Partial<DailyReport>;
      console.warn("[pipeline] JSON.parse failed but jsonrepair recovered");
    } catch {
      try {
        const fs = await import("node:fs");
        fs.mkdirSync("logs", { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        fs.writeFileSync(`logs/claude-raw-${ts}.txt`, text, "utf8");
        fs.writeFileSync(`logs/claude-cleaned-${ts}.txt`, cleaned, "utf8");
        console.warn(
          `[pipeline] both JSON.parse and jsonrepair failed; raw at logs/claude-raw-${ts}.txt`,
        );
      } catch {
        // best-effort logging
      }
      throw strictErr;
    }
  }
  return {
    hero_headline: parsed.hero_headline ?? "",
    daily_overview: parsed.daily_overview ?? "",
    tech_briefs: parsed.tech_briefs ?? [],
    finance_briefs: parsed.finance_briefs ?? [],
    politics_briefs: parsed.politics_briefs ?? [],
    editor_note: parsed.editor_note ?? "",
    keywords: parsed.keywords ?? [],
  };
}

export async function generateDailyReport(
  articles: ArticleInput[],
  options: { call?: (payload: string) => Promise<DailyReport> } = {},
): Promise<{ report: DailyReport; tokensUsed: number }> {
  const grouped: Record<Category, ArticleInput[]> = {
    tech: [],
    finance: [],
    politics: [],
  };
  for (const a of articles) grouped[a.category].push(a);

  const compact = (Object.keys(grouped) as Category[]).flatMap((c) =>
    selectRoundRobin(grouped[c], PER_CATEGORY_LIMIT[c]),
  );

  const userPayload = compact.map((a, i) => ({
    n: i + 1,
    title: a.title,
    url: a.url,
    source: a.source,
    category: a.category,
    excerpt: (a.excerpt ?? "").slice(0, 200),
    published: a.publishedAt?.toISOString() ?? "",
  }));
  const userPayloadJson = JSON.stringify(userPayload);

  let report: DailyReport;
  const generate = options.call ?? callOnce;
  try {
    report = await generate(userPayloadJson);
  } catch (firstErr) {
    // One retry — claude CLI occasionally wraps in narration on the first
    // pass but obeys when the same prompt is repeated.
    console.warn(
      `[pipeline] first claude CLI call failed, retrying: ${
        firstErr instanceof Error ? firstErr.message : String(firstErr)
      }`,
    );
    try {
      report = await generate(userPayloadJson);
    } catch (secondErr) {
      console.error(
        `[pipeline] second digest call failed; using deterministic fallback: ${
          secondErr instanceof Error ? secondErr.message : String(secondErr)
        }`,
      );
      report = buildDeterministicDailyReport(articles);
    }
  }

  // Max subscription has no per-call token meter — we expose 0 for schema
  // compatibility; consumers should treat 0 as "metric not available".
  return { report, tokensUsed: 0 };
}
