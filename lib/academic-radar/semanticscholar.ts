import { isUsableAcademicAbstract } from "./abstracts";
import {
  canonicalAcademicDoi,
  PCSEL_SEARCH_QUERIES,
} from "./pcsel-profile";
import type { AcademicPaperCandidate } from "./types";

type FetchResult = {
  candidates: AcademicPaperCandidate[];
  sourceNotes: string[];
};

type SemanticScholarAuthor = {
  name?: string;
};

export type SemanticScholarPaper = {
  title?: string;
  year?: number;
  authors?: SemanticScholarAuthor[];
  venue?: string;
  citationCount?: number;
  influentialCitationCount?: number;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
  };
  url?: string;
  openAccessPdf?: {
    url?: string;
  };
  abstract?: string;
};

type SemanticScholarResponse = {
  data?: SemanticScholarPaper[];
};

const ENDPOINT = "https://api.semanticscholar.org/graph/v1/paper/search";
const REQUEST_TIMEOUT_MS = 8_000;
const REQUEST_PAUSE_MS = 650;
const LIMIT_PER_QUERY = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dateFromYear(year: number | undefined): Date | undefined {
  if (!Number.isInteger(year)) return undefined;
  const date = new Date(Date.UTC(year as number, 0, 1));
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function extractPdfUrls(paper: SemanticScholarPaper): string[] {
  const urls: string[] = [];
  const add = (value: string | undefined): void => {
    const clean = value?.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (
      lower.endsWith(".pdf") ||
      lower.includes("/pdf") ||
      lower.includes("content/pdf") ||
      lower.includes("viewmedia.cfm")
    ) {
      urls.push(clean);
    }
  };
  add(paper.openAccessPdf?.url);
  return [...new Set(urls)];
}

export function candidateFromSemanticScholarPaper(
  paper: SemanticScholarPaper,
): AcademicPaperCandidate | null {
  const title = cleanText(paper.title ?? "");
  const summary = cleanText(paper.abstract ?? "");
  if (!title || !isUsableAcademicAbstract(summary)) return null;

  const doi = canonicalAcademicDoi(paper.externalIds?.DOI);
  const arxiv = paper.externalIds?.ArXiv?.trim();
  const id = doi ? `https://doi.org/${doi}` : arxiv ? `https://arxiv.org/abs/${arxiv}` : paper.url ?? title;
  const url = doi ? `https://doi.org/${doi}` : paper.url ?? id;
  const venue = cleanText(paper.venue ?? "");
  const authors = (paper.authors ?? [])
    .map((author) => cleanText(author.name ?? ""))
    .filter(Boolean)
    .slice(0, 8);

  return {
    id,
    title,
    url,
    source: venue ? `Semantic Scholar · ${venue}` : "Semantic Scholar",
    summary,
    authors,
    tags: ["Semantic Scholar", "paper-skill"],
    publishedAt: dateFromYear(paper.year),
    abstractSource: "Semantic Scholar abstract metadata",
    venue,
    citationCount: paper.citationCount ?? 0,
    influentialCitationCount: paper.influentialCitationCount ?? 0,
    pdfUrls: extractPdfUrls(paper),
  };
}

async function querySemanticScholar(query: string): Promise<SemanticScholarPaper[]> {
  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("limit", String(LIMIT_PER_QUERY));
  url.searchParams.set(
    "fields",
    [
      "title",
      "year",
      "authors",
      "venue",
      "citationCount",
      "influentialCitationCount",
      "externalIds",
      "url",
      "openAccessPdf",
      "abstract",
    ].join(","),
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DailyBrief academic radar (personal research digest)",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as SemanticScholarResponse;
    return data.data ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchSemanticScholarAcademicCandidates(): Promise<FetchResult> {
  const candidates: AcademicPaperCandidate[] = [];
  const sourceNotes: string[] = [];
  const seen = new Set<string>();
  const queries = PCSEL_SEARCH_QUERIES.slice(0, 6);

  for (const [index, query] of queries.entries()) {
    if (index > 0) await sleep(REQUEST_PAUSE_MS);
    try {
      const papers = await querySemanticScholar(query);
      let accepted = 0;
      for (const paper of papers) {
        const candidate = candidateFromSemanticScholarPaper(paper);
        if (!candidate) continue;
        const key = candidate.id.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
        accepted += 1;
      }
      sourceNotes.push(
        `Semantic Scholar ${query}: ${papers.length} fetched, ${accepted} with usable abstracts.`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      sourceNotes.push(`Semantic Scholar ${query}: failed (${msg}).`);
    }
  }
  return { candidates, sourceNotes };
}
