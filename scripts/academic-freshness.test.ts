import assert from "node:assert/strict";

import { buildAcademicRadar } from "../lib/academic-radar";
import {
  createEmptyAcademicSeenState,
  academicPaperKey,
  markAcademicFreshness,
  normalizeAcademicSeenState,
} from "../lib/academic-radar/freshness";
import type {
  AcademicPaperItem,
  AcademicRadarSection,
} from "../lib/academic-radar";

const radar = buildAcademicRadar(
  [
    {
      id: "https://doi.org/10.1000/old",
      title: "PCSEL modeling and design tool for photonic crystal surface-emitting lasers",
      url: "https://doi.org/10.1000/old",
      source: "Crossref",
      summary: "A PCSEL design paper for photonic crystal surface-emitting lasers.",
      publishedAt: new Date("2026-05-20T00:00:00Z"),
    },
    {
      id: "https://doi.org/10.1000/new",
      title: "Laterally coupled photonic crystal surface emitting laser arrays",
      url: "https://doi.org/10.1000/new",
      source: "Crossref",
      summary:
        "We propose laterally coupled PCSEL arrays based on photonic crystal surface-emitting lasers.",
      publishedAt: new Date("2026-05-28T00:00:00Z"),
    },
  ],
  new Date("2026-05-29T00:00:00+08:00"),
);

const previous = createEmptyAcademicSeenState("2026-05-28T00:00:00.000Z");
previous.papers["https://doi.org/10.1000/old"] = {
  id: "https://doi.org/10.1000/old",
  title: "PCSEL modeling and design tool for photonic crystal surface-emitting lasers",
  url: "https://doi.org/10.1000/old",
  first_seen_date: "2026-05-28",
  last_seen_date: "2026-05-28",
  seen_count: 1,
};

const marked = markAcademicFreshness(radar, previous, "2026-05-29");
assert.equal(marked.radar.new_items_count, 1);
assert.equal(marked.newItems.length, 1);
assert.equal(marked.newItems[0].id, "https://doi.org/10.1000/new");
assert.equal(
  marked.radar.items.find((item) => item.id === "https://doi.org/10.1000/old")
    ?.is_new,
  false,
);
assert.equal(
  marked.radar.items.find((item) => item.id === "https://doi.org/10.1000/new")
    ?.is_new,
  true,
);
assert.equal(
  marked.radar.items.find((item) => item.id === "https://doi.org/10.1000/new")
    ?.first_seen_date,
  "2026-05-29",
);

const second = markAcademicFreshness(marked.radar, marked.state, "2026-05-30");
assert.equal(second.radar.new_items_count, 0);
assert.equal(
  second.radar.items.find((item) => item.id === "https://doi.org/10.1000/new")
    ?.is_new,
  false,
);

const sameDayRerun = markAcademicFreshness(marked.radar, marked.state, "2026-05-29");
assert.equal(sameDayRerun.radar.new_items_count, 1);
assert.equal(
  sameDayRerun.radar.items.find((item) => item.id === "https://doi.org/10.1000/new")
    ?.is_new,
  true,
);
assert.equal(
  sameDayRerun.radar.items.find((item) => item.id === "https://doi.org/10.1000/new")
    ?.seen_count,
  marked.radar.items.find((item) => item.id === "https://doi.org/10.1000/new")
    ?.seen_count,
  "same-day reruns must not increment seen_count",
);
assert.equal(
  academicPaperKey({
    id: "https://dx.doi.org/10.1000/ABC.1",
    url: "https://example.invalid",
    title: "paper",
  }),
  "doi:10.1000/abc.1",
);
const aliases = createEmptyAcademicSeenState();
aliases.papers.a = {
  id: "https://doi.org/10.1000/ABC.1",
  title: "paper",
  url: "https://doi.org/10.1000/ABC.1",
  first_seen_date: "2026-05-20",
  last_seen_date: "2026-05-28",
  seen_count: 3,
};
aliases.papers.b = {
  id: "doi:10.1000/abc.1",
  title: "paper",
  url: "https://dx.doi.org/10.1000/abc.1",
  first_seen_date: "2026-05-21",
  last_seen_date: "2026-05-29",
  seen_count: 4,
};
const normalizedAliases = normalizeAcademicSeenState(aliases);
assert.deepEqual(Object.keys(normalizedAliases.papers), ["doi:10.1000/abc.1"]);
assert.equal(normalizedAliases.papers["doi:10.1000/abc.1"].seen_count, 4);

function paper(overrides: Partial<AcademicPaperItem>): AcademicPaperItem {
  return {
    id: overrides.id ?? "paper",
    title: overrides.title ?? "paper",
    title_en: overrides.title_en ?? overrides.title ?? "paper",
    title_zh: overrides.title_zh ?? "paper",
    url: overrides.url ?? "https://doi.org/10.1000/paper",
    source: overrides.source ?? "Crossref",
    summary: overrides.summary ?? "abstract text.",
    abstract_en: overrides.abstract_en ?? overrides.summary ?? "abstract text.",
    summary_zh: overrides.summary_zh ?? "abstract text.",
    abstract_zh: overrides.abstract_zh ?? overrides.summary_zh ?? "abstract text.",
    authors: overrides.authors ?? [],
    tags: overrides.tags ?? ["PCSEL"],
    published_at: overrides.published_at,
    score: overrides.score ?? 1,
    priority: overrides.priority ?? "deep-read",
    action: overrides.action ?? "read",
    relevance: overrides.relevance ?? "relevant",
    why_relevant: overrides.why_relevant ?? "why relevant",
    why_this_matters:
      overrides.why_this_matters ?? overrides.why_relevant ?? "why relevant",
    matched_terms: overrides.matched_terms ?? ["pcsel"],
  };
}

const repeatedOld = paper({
  id: "https://doi.org/10.1000/repeated-old",
  title: "Repeated high-score PCSEL core paper",
  url: "https://doi.org/10.1000/repeated-old",
  score: 20,
  priority: "must-read",
  published_at: "2024-01-01T00:00:00.000Z",
});
const freshLowerScore = paper({
  id: "https://doi.org/10.1000/fresh-lower-score",
  title: "Fresh lower-score nanophotonic inverse design paper",
  url: "https://doi.org/10.1000/fresh-lower-score",
  score: 8,
  priority: "deep-read",
  published_at: "2026-05-29T00:00:00.000Z",
});
const rotationRadar: AcademicRadarSection = {
  generated_at: "2026-05-30T00:00:00.000Z",
  profile: "test",
  items: [repeatedOld, freshLowerScore],
  deep_read_candidates: [repeatedOld, freshLowerScore],
  source_notes: [],
  risk_caveat: "test",
};
const rotationPrevious = createEmptyAcademicSeenState("2026-05-29T00:00:00.000Z");
rotationPrevious.papers[repeatedOld.id] = {
  id: repeatedOld.id,
  title: repeatedOld.title,
  url: repeatedOld.url,
  first_seen_date: "2026-05-20",
  last_seen_date: "2026-05-29",
  seen_count: 9,
};
const rotated = markAcademicFreshness(rotationRadar, rotationPrevious, "2026-05-30");
assert(rotated.radar.items.some((item) => item.id === freshLowerScore.id));
assert(rotated.radar.items.some((item) => item.id === repeatedOld.id));
assert.deepEqual(
  rotated.radar.items.map((item) => item.paper_no),
  ["P1", "P2"],
);

console.log("PASS academic freshness");
