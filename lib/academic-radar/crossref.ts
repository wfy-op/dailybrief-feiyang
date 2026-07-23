import type { AcademicPaperCandidate } from "./types";

type FetchResult = {
  candidates: AcademicPaperCandidate[];
  sourceNotes: string[];
};

type CrossrefQueryMode = "published" | "relevance";

type CrossrefAuthor = {
  given?: string;
  family?: string;
  name?: string;
};

type CrossrefDate = {
  "date-parts"?: number[][];
};

type CrossrefWork = {
  DOI?: string;
  URL?: string;
  title?: string[];
  abstract?: string;
  author?: CrossrefAuthor[];
  "container-title"?: string[];
  published?: CrossrefDate;
  "published-online"?: CrossrefDate;
  "published-print"?: CrossrefDate;
  issued?: CrossrefDate;
};

type CrossrefResponse = {
  message?: {
    items?: CrossrefWork[];
  };
};

const CROSSREF_ENDPOINT = "https://api.crossref.org/works";
const ROWS_PER_QUERY = 8;
const FROM_DAYS = 3650;
const REQUEST_TIMEOUT_MS = 8_000;
const REQUEST_PAUSE_MS = 500;

const QUERIES = [
  "PCSEL photonic crystal surface emitting laser",
  "photonic crystal laser coupled wave finite element",
  "nanophotonic photonic crystal inverse design machine learning",
  "FDTD FEM nanocavity Q factor mode volume",
  "large language model research agent simulation photonics",
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fromDate(now = new Date()): string {
  const d = new Date(now.getTime() - FROM_DAYS * 86_400_000);
  return d.toISOString().slice(0, 10);
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCrossrefDate(value: CrossrefDate | undefined): Date | undefined {
  const parts = value?.["date-parts"]?.[0];
  if (!parts || !Number.isFinite(parts[0])) return undefined;
  const [year, month = 1, day = 1] = parts;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function workDate(work: CrossrefWork): Date | undefined {
  return (
    parseCrossrefDate(work.published) ??
    parseCrossrefDate(work["published-online"]) ??
    parseCrossrefDate(work["published-print"]) ??
    parseCrossrefDate(work.issued)
  );
}

function authorName(author: CrossrefAuthor): string {
  if (author.name) return author.name;
  return [author.given, author.family].filter(Boolean).join(" ");
}

function candidateFromWork(
  work: CrossrefWork,
  query: string,
): AcademicPaperCandidate | null {
  const title = cleanText(work.title?.[0] ?? "");
  const url = work.URL ?? (work.DOI ? `https://doi.org/${work.DOI}` : "");
  if (!title || !url) return null;

  const journal = cleanText(work["container-title"]?.[0] ?? "");
  const authors = (work.author ?? [])
    .map(authorName)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 8);
  const summary = cleanText(work.abstract ?? "");

  return {
    id: work.DOI ?? url,
    title,
    url,
    source: journal ? `Crossref · ${journal}` : "Crossref",
    summary,
    authors,
    tags: [query],
    publishedAt: workDate(work),
  };
}

async function fetchCrossrefQuery(
  query: string,
  mode: CrossrefQueryMode,
): Promise<CrossrefWork[]> {
  const url = new URL(CROSSREF_ENDPOINT);
  url.searchParams.set("query.title", query);
  url.searchParams.set("rows", String(ROWS_PER_QUERY));
  url.searchParams.set("filter", `from-pub-date:${fromDate()}`);
  if (mode === "published") {
    url.searchParams.set("sort", "published");
    url.searchParams.set("order", "desc");
  }
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
    const data = (await res.json()) as CrossrefResponse;
    return data.message?.items ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCrossrefAcademicCandidates(): Promise<FetchResult> {
  const candidates: AcademicPaperCandidate[] = [];
  const sourceNotes: string[] = [];
  const seen = new Set<string>();
  let requestCount = 0;

  for (const [index, query] of QUERIES.entries()) {
    const modes: CrossrefQueryMode[] =
      index <= 1 ? ["published", "relevance"] : ["published"];
    for (const mode of modes) {
      if (index > 0 || requestCount > 0) await sleep(REQUEST_PAUSE_MS);
      requestCount += 1;
      try {
        const works = await fetchCrossrefQuery(query, mode);
        sourceNotes.push(
          `Crossref ${query} (${mode}): ${works.length} fetched.`,
        );
        for (const work of works) {
          const candidate = candidateFromWork(work, query);
          if (!candidate) continue;
          const key = candidate.id.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          candidates.push(candidate);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        sourceNotes.push(`Crossref ${query} (${mode}): failed (${msg}).`);
      }
    }
  }

  return { candidates, sourceNotes };
}
