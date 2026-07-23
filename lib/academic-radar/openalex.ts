import { isUsableAcademicAbstract } from "./abstracts";
import { canonicalAcademicDoi, PCSEL_SEARCH_QUERIES } from "./pcsel-profile";
import type { AcademicPaperCandidate } from "./types";

type FetchResult = {
  candidates: AcademicPaperCandidate[];
  sourceNotes: string[];
};

type OpenAlexAuthor = {
  author?: {
    display_name?: string;
  };
};

type OpenAlexLocation = {
  source?: {
    display_name?: string;
  };
  landing_page_url?: string;
  pdf_url?: string;
};

export type OpenAlexWork = {
  id?: string;
  doi?: string;
  title?: string;
  display_name?: string;
  publication_date?: string;
  publication_year?: number;
  cited_by_count?: number;
  abstract_inverted_index?: Record<string, number[]>;
  authorships?: OpenAlexAuthor[];
  primary_location?: OpenAlexLocation;
};

type OpenAlexResponse = {
  results?: OpenAlexWork[];
};

const OPENALEX_ENDPOINT = "https://api.openalex.org/works";
const ROWS_PER_QUERY = 8;
const FROM_DAYS = 3650;
const REQUEST_TIMEOUT_MS = 8_000;
const REQUEST_PAUSE_MS = 500;

const QUERIES = [
  ...PCSEL_SEARCH_QUERIES.slice(0, 6),
  "nanophotonic photonic crystal inverse design machine learning",
  "FDTD FEM nanocavity Q factor mode volume",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fromDate(now = new Date()): string {
  const d = new Date(now.getTime() - FROM_DAYS * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function cleanText(value: string): string {
  return value.replace(/\s+([.,;:!?])/g, "$1").replace(/\s+/g, " ").trim();
}

function normalizeDoi(value: string): string {
  const doi = canonicalAcademicDoi(value);
  return doi ? `https://doi.org/${doi}` : value;
}

function dateFrom(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function abstractFromIndex(
  index: Record<string, number[]> | undefined,
): string {
  if (!index) return "";
  const words: Array<{ word: string; pos: number }> = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) {
      if (Number.isFinite(pos)) words.push({ word, pos });
    }
  }
  return cleanText(
    words
      .sort((a, b) => a.pos - b.pos)
      .map((item) => item.word)
      .join(" "),
  );
}

export function candidateFromOpenAlexWork(
  work: OpenAlexWork,
  query: string,
): AcademicPaperCandidate | null {
  const title = cleanText(work.title ?? work.display_name ?? "");
  const summary = abstractFromIndex(work.abstract_inverted_index);
  const doi = work.doi ? normalizeDoi(work.doi) : "";
  const landingPage = work.primary_location?.landing_page_url ?? "";
  const url = doi || landingPage || work.id || "";
  if (!title || !url || !isUsableAcademicAbstract(summary)) return null;

  const sourceName = cleanText(work.primary_location?.source?.display_name ?? "");
  const authors = (work.authorships ?? [])
    .map((authorship) => authorship.author?.display_name?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 8);

  return {
    id: doi || work.id || url,
    title,
    url,
    source: sourceName ? `OpenAlex · ${sourceName}` : "OpenAlex",
    summary,
    authors,
    tags: [query],
    publishedAt: dateFrom(work.publication_date),
    abstractSource: "OpenAlex abstract metadata",
    venue: sourceName,
    citationCount: work.cited_by_count ?? 0,
  };
}

async function fetchOpenAlexQuery(query: string): Promise<OpenAlexWork[]> {
  const url = new URL(OPENALEX_ENDPOINT);
  url.searchParams.set("search", query);
  url.searchParams.set("filter", `type:article,from_publication_date:${fromDate()}`);
  url.searchParams.set("sort", "publication_date:desc");
  url.searchParams.set("per-page", String(ROWS_PER_QUERY));
  url.searchParams.set(
    "select",
    [
      "id",
      "doi",
      "title",
      "display_name",
      "publication_date",
      "publication_year",
      "cited_by_count",
      "abstract_inverted_index",
      "authorships",
      "primary_location",
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
    const data = (await res.json()) as OpenAlexResponse;
    return data.results ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchOpenAlexAcademicCandidates(): Promise<FetchResult> {
  const candidates: AcademicPaperCandidate[] = [];
  const sourceNotes: string[] = [];
  const seen = new Set<string>();

  for (const [index, query] of QUERIES.entries()) {
    if (index > 0) await sleep(REQUEST_PAUSE_MS);
    try {
      const works = await fetchOpenAlexQuery(query);
      let accepted = 0;
      for (const work of works) {
        const candidate = candidateFromOpenAlexWork(work, query);
        if (!candidate) continue;
        const key = candidate.id.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(candidate);
        accepted += 1;
      }
      sourceNotes.push(
        `OpenAlex ${query}: ${works.length} fetched, ${accepted} with usable abstracts.`,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      sourceNotes.push(`OpenAlex ${query}: failed (${msg}).`);
    }
  }

  return { candidates, sourceNotes };
}
