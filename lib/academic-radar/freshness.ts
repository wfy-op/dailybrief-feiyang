import type {
  AcademicPaperItem,
  AcademicRadarSection,
} from "./types";

export interface AcademicSeenRecord {
  id: string;
  title: string;
  url: string;
  first_seen_date: string;
  last_seen_date: string;
  seen_count: number;
}

export interface AcademicSeenState {
  version: 1;
  updated_at: string;
  papers: Record<string, AcademicSeenRecord>;
}

export function createEmptyAcademicSeenState(
  updatedAt = new Date().toISOString(),
): AcademicSeenState {
  return {
    version: 1,
    updated_at: updatedAt,
    papers: {},
  };
}

export function academicPaperKey(
  item: Pick<AcademicPaperItem, "id" | "url" | "title">,
): string {
  const candidates = [item.id, item.url, item.title].filter(Boolean);
  for (const value of candidates) {
    const doi = value.match(/10\.\d{4,9}\/[-._;()/:a-z0-9]+/i)?.[0]
      ?.replace(/[.,;:)}\]]+$/, "")
      .toLowerCase();
    if (doi) return `doi:${doi}`;
  }
  for (const value of candidates) {
    const arxiv = value.match(/(?:arxiv:\s*|arxiv\.org\/(?:abs|pdf)\/)(\d{4}\.\d{4,5})(?:v\d+)?/i)?.[1];
    if (arxiv) return `arxiv:${arxiv.toLowerCase()}`;
  }
  const raw = item.id || item.url || item.title;
  return raw.trim().toLowerCase().replace(/[?#].*$/, "").replace(/\/$/, "");
}

export function normalizeAcademicSeenState(
  state: AcademicSeenState,
): AcademicSeenState {
  const papers: Record<string, AcademicSeenRecord> = {};
  for (const record of Object.values(state.papers || {})) {
    const key = academicPaperKey(record);
    const existing = papers[key];
    if (!existing) {
      papers[key] = { ...record, id: key };
      continue;
    }
    papers[key] = {
      id: key,
      title: record.title || existing.title,
      url: record.url || existing.url,
      first_seen_date:
        record.first_seen_date < existing.first_seen_date
          ? record.first_seen_date
          : existing.first_seen_date,
      last_seen_date:
        record.last_seen_date > existing.last_seen_date
          ? record.last_seen_date
          : existing.last_seen_date,
      // Duplicate keys are aliases for one paper, not independent sightings.
      seen_count: Math.max(record.seen_count, existing.seen_count),
    };
  }
  return { ...state, papers };
}

function cloneRadar(radar: AcademicRadarSection): AcademicRadarSection {
  return {
    ...radar,
    items: radar.items.map((item) => ({ ...item })),
    deep_read_candidates: radar.deep_read_candidates.map((item) => ({
      ...item,
    })),
  };
}

function publishedTime(item: AcademicPaperItem): number {
  const time = item.published_at ? Date.parse(item.published_at) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function priorityRank(item: AcademicPaperItem): number {
  if (item.priority === "must-read") return 0;
  if (item.priority === "deep-read") return 1;
  return 2;
}

function freshnessBucket(
  item: AcademicPaperItem,
  previous: AcademicSeenState,
  date: string,
): number {
  const existing = previous.papers[academicPaperKey(item)];
  if (!existing || existing.first_seen_date === date) return 0;
  if (existing.seen_count <= 2) return 1;
  return 2;
}

function orderForDailyDisplay(
  items: AcademicPaperItem[],
  previous: AcademicSeenState,
  date: string,
): AcademicPaperItem[] {
  return [...items].sort((a, b) => {
    const aBucket = freshnessBucket(a, previous, date);
    const bBucket = freshnessBucket(b, previous, date);
    if (aBucket !== bBucket) return aBucket - bBucket;

    const aSeen = previous.papers[academicPaperKey(a)]?.seen_count ?? 0;
    const bSeen = previous.papers[academicPaperKey(b)]?.seen_count ?? 0;
    if (aSeen !== bSeen) return aSeen - bSeen;

    const aPriority = priorityRank(a);
    const bPriority = priorityRank(b);
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aPublished = publishedTime(a);
    const bPublished = publishedTime(b);
    if (aPublished !== bPublished) return bPublished - aPublished;

    return b.score - a.score;
  });
}

function markItem(
  item: AcademicPaperItem,
  state: AcademicSeenState,
  date: string,
): { item: AcademicPaperItem; record: AcademicSeenRecord; isNew: boolean } {
  const key = academicPaperKey(item);
  const existing = state.papers[key];
  const record: AcademicSeenRecord = {
    id: key,
    title: item.title,
    url: item.url,
    first_seen_date: existing?.first_seen_date ?? date,
    last_seen_date: date,
    seen_count:
      existing?.last_seen_date === date
        ? existing.seen_count
        : (existing?.seen_count ?? 0) + 1,
  };
  const isNew = existing === undefined || existing.first_seen_date === date;
  return {
    item: {
      ...item,
      is_new: isNew,
      first_seen_date: record.first_seen_date,
      last_seen_date: record.last_seen_date,
      seen_count: record.seen_count,
    },
    record,
    isNew,
  };
}

export function markAcademicFreshness(
  radar: AcademicRadarSection,
  previous: AcademicSeenState,
  date: string,
): {
  radar: AcademicRadarSection;
  state: AcademicSeenState;
  newItems: AcademicPaperItem[];
} {
  const normalizedPrevious = normalizeAcademicSeenState(previous);
  const nextState: AcademicSeenState = {
    version: 1,
    updated_at: new Date().toISOString(),
    papers: { ...normalizedPrevious.papers },
  };
  const out = cloneRadar(radar);
  const markedByKey = new Map<string, AcademicPaperItem>();
  const newItems: AcademicPaperItem[] = [];

  out.items = orderForDailyDisplay(out.items, normalizedPrevious, date).map((item, index) => {
    // Freshness changes display order after ranking, so display numbers must
    // be assigned here rather than carried over from the pre-sort order.
    const numberedItem = { ...item, paper_no: `P${index + 1}` };
    const marked = markItem(numberedItem, normalizedPrevious, date);
    const key = academicPaperKey(item);
    nextState.papers[key] = marked.record;
    markedByKey.set(key, marked.item);
    if (marked.isNew) newItems.push(marked.item);
    return marked.item;
  });

  out.deep_read_candidates = orderForDailyDisplay(
    out.deep_read_candidates,
    normalizedPrevious,
    date,
  ).map((item) => {
    const key = academicPaperKey(item);
    return markedByKey.get(key) ?? markItem(item, normalizedPrevious, date).item;
  });

  out.new_items_count = newItems.length;
  out.push_channels = {
    rss_path: "academic-feed.xml",
    json_path: "academic-feed.json",
    note: "Subscribe to the RSS feed for new academic radar papers.",
  };
  return { radar: out, state: nextState, newItems };
}
