import Parser from "rss-parser";

import type { AcademicPaperCandidate } from "./types";

type FetchResult = {
  candidates: AcademicPaperCandidate[];
  sourceNotes: string[];
};

const ARXIV_ENDPOINT = "https://export.arxiv.org/api/query";
const MAX_RESULTS_PER_QUERY = 8;
const REQUEST_TIMEOUT_MS = 6_000;
const REQUEST_PAUSE_MS = 1_000;
const REQUEST_HEADERS = {
  "User-Agent": "DailyBrief academic radar (personal research digest)",
};

const QUERIES = [
  {
    label: "PCSEL / photonic crystal laser",
    query:
      'all:PCSEL OR all:"photonic crystal surface emitting laser" OR all:"photonic crystal surface-emitting laser" OR all:"photonic crystal laser"',
  },
  {
    label: "AI for photonics",
    query:
      '(all:photonics OR all:nanophotonic OR all:"photonic crystal") AND (all:"inverse design" OR all:"machine learning" OR all:"deep learning" OR all:"reinforcement learning" OR all:"Bayesian optimization" OR all:transformer)',
  },
];

const parser = new Parser({
  timeout: REQUEST_TIMEOUT_MS,
  headers: REQUEST_HEADERS,
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function arxivUrl(query: string): string {
  const url = new URL(ARXIV_ENDPOINT);
  url.searchParams.set("search_query", query);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(MAX_RESULTS_PER_QUERY));
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");
  return url.toString();
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function dateField(value: unknown): Date | undefined {
  const text = stringField(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function arrayField(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function candidateFromItem(
  item: Record<string, unknown>,
  queryLabel: string,
): AcademicPaperCandidate | null {
  const title = stringField(item.title)?.replace(/\s+/g, " ");
  const url = stringField(item.link) ?? stringField(item.guid);
  if (!title || !url) return null;

  const summary =
    stringField(item.contentSnippet) ??
    stringField(item.content) ??
    stringField(item.summary) ??
    "";
  const creator = stringField(item.creator) ?? stringField(item["dc:creator"]);
  const authors = creator
    ? creator
        .split(/,\s*/)
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const tags = unique([queryLabel, ...arrayField(item.categories)]);
  const publishedAt =
    dateField(item.isoDate) ?? dateField(item.pubDate) ?? dateField(item.updated);

  return {
    id: url,
    title,
    url,
    source: "arXiv",
    summary,
    authors,
    tags,
    publishedAt,
  };
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

async function parseUrlWithRetry(url: string, label: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return await parser.parseString(xml);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: ${msg}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchArxivAcademicCandidates(): Promise<FetchResult> {
  const candidates: AcademicPaperCandidate[] = [];
  const sourceNotes: string[] = [];
  const seen = new Set<string>();

  for (const [index, def] of QUERIES.entries()) {
    if (index > 0) await sleep(REQUEST_PAUSE_MS);
    try {
      const feed = await parseUrlWithRetry(arxivUrl(def.query), def.label);
      const items = feed.items ?? [];
      sourceNotes.push(`arXiv ${def.label}: ${items.length} fetched.`);
      for (const item of items) {
        const candidate = candidateFromItem(
          item as Record<string, unknown>,
          def.label,
        );
        if (!candidate) continue;
        const key = candidate.url.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      sourceNotes.push(`arXiv ${def.label}: failed (${msg}).`);
    }
  }

  return { candidates, sourceNotes };
}
