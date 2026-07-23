import type {
  AcademicPaperCandidate,
  AcademicPaperItem,
  AcademicRadarSection,
} from "./types";

export type AbstractResolution = {
  abstract: string;
  source: string;
};

export type AbstractResolver = (
  candidate: AcademicPaperCandidate,
) => Promise<AbstractResolution | null>;

const GENERIC_SUMMARY_RE =
  /^(proceedings|extended abstracts|physics and simulation|optical and quantum electronics|journal of|conference on|cleo \d{4}|20\d{2}\s+\d+(st|nd|rd|th)? international)/i;

const BAD_TEXT_RE =
  /(cookies|enable javascript|access denied|all rights reserved|privacy policy|sign in|institutional access|subscribe to this journal)/i;
const INCOMPLETE_TAIL_RE = /\b(of|and|or|with|for|in|at|by|to|from|the|a|an|as|on)$/i;
const SENTENCE_END_RE = /[.!?。！？)”’'"\]\)]$/;

export function isUsableAcademicAbstract(value: string | undefined): boolean {
  const text = cleanText(value ?? "");
  if (text.length < 90) return false;
  if (GENERIC_SUMMARY_RE.test(text)) return false;
  if (BAD_TEXT_RE.test(text)) return false;
  if (INCOMPLETE_TAIL_RE.test(text)) return false;
  const words = text.split(/\s+/).length;
  if (words >= 25 && !SENTENCE_END_RE.test(text)) return false;
  return words >= 12;
}

function cleanText(value: string): string {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16)),
    )
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function attrValue(tag: string, attr: string): string | undefined {
  const re = new RegExp(`${attr}\\s*=\\s*([\"'])([\\s\\S]*?)\\1`, "i");
  return tag.match(re)?.[2];
}

function extractMetaAbstract(html: string): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const preferred = [
    "citation_abstract",
    "dc.description",
    "dcterms.abstract",
    "description",
    "og:description",
    "twitter:description",
  ];
  for (const name of preferred) {
    for (const tag of metaTags) {
      const key =
        attrValue(tag, "name") ??
        attrValue(tag, "property") ??
        attrValue(tag, "itemprop");
      if (!key || key.toLowerCase() !== name) continue;
      const content = attrValue(tag, "content");
      if (isUsableAcademicAbstract(content)) return cleanText(content ?? "");
    }
  }
  return null;
}

function extractJsonLdAbstract(html: string): string | null {
  const scripts = html.match(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  ) ?? [];
  for (const script of scripts) {
    const body = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(decodeHtml(body));
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        for (const key of ["abstract", "description"]) {
          const value = record[key];
          if (typeof value === "string" && isUsableAcademicAbstract(value)) {
            return cleanText(value);
          }
        }
        for (const value of Object.values(record)) {
          if (Array.isArray(value)) queue.push(...value);
          else if (value && typeof value === "object") queue.push(value);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }
  return null;
}

function extractSectionAbstract(html: string): string | null {
  const candidates: string[] = [];
  const abstractBlocks =
    html.match(
      /<(section|div|article)\b[^>]*(?:id|class)\s*=\s*["'][^"']*abstract[^"']*["'][^>]*>[\s\S]{80,10000}?<\/\1>/gi,
    ) ?? [];
  candidates.push(...abstractBlocks);

  const headingMatch = html.match(
    /<(h2|h3|strong|b)\b[^>]*>\s*abstract\s*<\/\1>[\s\S]{0,6000}?(?=<(h2|h3)\b|<\/section>|<\/article>|<\/div>)/i,
  );
  if (headingMatch) candidates.push(headingMatch[0]);

  for (const candidate of candidates) {
    const cleaned = cleanText(candidate.replace(/\babstract\b[:.\s]*/i, ""));
    if (isUsableAcademicAbstract(cleaned)) return cleaned;
  }
  return null;
}

export function extractAbstractFromHtml(html: string): string | null {
  return (
    extractMetaAbstract(html) ??
    extractJsonLdAbstract(html) ??
    extractSectionAbstract(html)
  );
}

function doiFrom(value: string): string | null {
  const match = value.match(/10\.\d{4,9}\/[^\s"'<>]+/i);
  return match ? match[0].replace(/[).,;]+$/, "") : null;
}

function candidateDoi(candidate: AcademicPaperCandidate): string | null {
  return doiFrom(candidate.id) ?? doiFrom(candidate.url);
}

async function fetchText(url: string, timeoutMs = 18_000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DailyBrief academic abstract resolver",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function resolveFromOriginalPage(
  candidate: AcademicPaperCandidate,
): Promise<AbstractResolution | null> {
  const urls = [
    candidate.url,
    candidateDoi(candidate)
      ? `https://doi.org/${candidateDoi(candidate)}`
      : "",
  ].filter(Boolean);
  for (const url of [...new Set(urls)]) {
    try {
      const html = await fetchText(url);
      const abstract = extractAbstractFromHtml(html);
      if (abstract) return { abstract, source: `original page: ${url}` };
    } catch {
      // try next source
    }
  }
  return null;
}

function openAlexAbstractFromIndex(index: unknown): string | null {
  if (!index || typeof index !== "object") return null;
  const entries = Object.entries(index as Record<string, unknown>);
  const words: Array<{ word: string; pos: number }> = [];
  for (const [word, positions] of entries) {
    if (!Array.isArray(positions)) continue;
    for (const pos of positions) {
      if (typeof pos === "number") words.push({ word, pos });
    }
  }
  const text = words
    .sort((a, b) => a.pos - b.pos)
    .map((item) => item.word)
    .join(" ");
  return isUsableAcademicAbstract(text) ? text : null;
}

async function resolveFromOpenAlex(
  candidate: AcademicPaperCandidate,
): Promise<AbstractResolution | null> {
  const doi = candidateDoi(candidate);
  if (!doi) return null;
  try {
    const url = `https://api.openalex.org/works?filter=doi:${encodeURIComponent(
      `https://doi.org/${doi}`,
    )}&select=title,abstract_inverted_index,doi`;
    const data = JSON.parse(await fetchText(url, 15_000)) as {
      results?: Array<{ abstract_inverted_index?: unknown }>;
    };
    const abstract = openAlexAbstractFromIndex(
      data.results?.[0]?.abstract_inverted_index,
    );
    return abstract ? { abstract, source: "OpenAlex abstract metadata" } : null;
  } catch {
    return null;
  }
}

async function resolveFromSemanticScholar(
  candidate: AcademicPaperCandidate,
): Promise<AbstractResolution | null> {
  const doi = candidateDoi(candidate);
  if (!doi) return null;
  try {
    const url = `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(
      doi,
    )}?fields=title,abstract,url`;
    const data = JSON.parse(await fetchText(url, 15_000)) as {
      abstract?: string;
    };
    return isUsableAcademicAbstract(data.abstract)
      ? { abstract: cleanText(data.abstract ?? ""), source: "Semantic Scholar" }
      : null;
  } catch {
    return null;
  }
}

export async function resolvePaperAbstract(
  candidate: AcademicPaperCandidate,
): Promise<AbstractResolution | null> {
  return (
    (await resolveFromOriginalPage(candidate)) ??
    (await resolveFromOpenAlex(candidate)) ??
    (await resolveFromSemanticScholar(candidate))
  );
}

export async function ensureAcademicAbstracts(
  candidates: AcademicPaperCandidate[],
  opts: { resolve?: AbstractResolver } = {},
): Promise<{
  candidates: AcademicPaperCandidate[];
  sourceNotes: string[];
}> {
  const resolve = opts.resolve ?? resolvePaperAbstract;
  const out: AcademicPaperCandidate[] = [];
  const sourceNotes: string[] = [];

  for (const candidate of candidates) {
    if (isUsableAcademicAbstract(candidate.summary)) {
      out.push(candidate);
      continue;
    }
    const resolved = await resolve(candidate);
    if (resolved && isUsableAcademicAbstract(resolved.abstract)) {
      out.push({
        ...candidate,
        summary: resolved.abstract,
        abstractSource: resolved.source,
      });
      sourceNotes.push(`abstract resolved: ${candidate.title} (${resolved.source})`);
    } else {
      sourceNotes.push(`abstract unresolved; dropped: ${candidate.title}`);
    }
  }
  return { candidates: out, sourceNotes };
}

export async function ensureAcademicRadarAbstracts(
  radar: AcademicRadarSection,
  opts: { resolve?: AbstractResolver } = {},
): Promise<{ radar: AcademicRadarSection; sourceNotes: string[] }> {
  const sourceNotes: string[] = [];
  const resolvedItems: AcademicPaperItem[] = [];
  const resolve = opts.resolve ?? resolvePaperAbstract;

  for (const item of radar.items) {
    const existingAbstract = item.abstract_en || item.summary;
    if (isUsableAcademicAbstract(existingAbstract)) {
      resolvedItems.push({
        ...item,
        summary: existingAbstract,
        abstract_en: existingAbstract,
      });
      continue;
    }
    const resolved = await resolve({
      id: item.id,
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary,
      authors: item.authors,
      tags: item.tags,
      publishedAt: item.published_at ? new Date(item.published_at) : undefined,
    });
    if (resolved && isUsableAcademicAbstract(resolved.abstract)) {
      resolvedItems.push({
        ...item,
        summary: resolved.abstract,
        abstract_en: resolved.abstract,
        abstract_source: resolved.source,
      });
      sourceNotes.push(`abstract resolved: ${item.title} (${resolved.source})`);
    } else {
      // Keep unresolved diagnostics out of the public report; unresolved
      // papers are dropped so the user never sees a "missing abstract" item.
    }
  }

  // Resolution can drop papers after the ranking stage. Re-number the kept
  // items so the public daily list never has gaps such as P1, P3, P7.
  const numberedItems = resolvedItems.map((item, index) => ({
    ...item,
    paper_no: `P${index + 1}`,
  }));
  const kept = new Set(numberedItems.map((item) => item.id));
  const resolvedById = new Map(numberedItems.map((item) => [item.id, item]));
  return {
    radar: {
      ...radar,
      items: numberedItems,
      deep_read_candidates: radar.deep_read_candidates
        .filter((item) => kept.has(item.id))
        .map((item) => resolvedById.get(item.id) ?? item),
      source_notes: [...radar.source_notes, ...sourceNotes],
    },
    sourceNotes,
  };
}
