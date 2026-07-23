import assert from "node:assert/strict";

import type { DailyReport } from "../lib/ai/pipeline";
import {
  buildAcademicRadar,
  dedupeAcademicCandidates,
  isAcademicArxivEnabled,
} from "../lib/academic-radar";
import {
  applyAcademicTranslations,
  validateAcademicTranslations,
} from "../lib/ai/academic-translation";
import { renderHtml, renderMarkdown } from "../lib/output/render";

assert.equal(isAcademicArxivEnabled(undefined), true);
assert.equal(isAcademicArxivEnabled("true"), true);
assert.equal(isAcademicArxivEnabled("false"), false);

const now = new Date("2026-05-29T00:00:00.000+08:00");

const radar = buildAcademicRadar(
  [
    {
      id: "pcsel-direct",
      title:
        "Photonic crystal surface-emitting laser design with coupled-wave and finite-element validation",
      url: "https://arxiv.org/abs/2605.00001",
      source: "arXiv",
      summary:
        "We study PCSEL structures using coupled-wave theory, FEM validation, far-field divergence, quantum-well gain, and III-V material parameters.",
      authors: ["A. Researcher", "B. Photonics"],
      tags: ["PCSEL / photonic crystal laser"],
      publishedAt: new Date("2026-05-28T00:00:00.000Z"),
    },
    {
      id: "ai-photonics",
      title: "Transformer surrogate models for inverse design of nanophotonic cavities",
      url: "https://arxiv.org/abs/2605.00002",
      source: "arXiv",
      summary:
        "A machine learning surrogate model accelerates inverse design for nanophotonic cavities and predicts Q factor and mode volume.",
      authors: ["C. Model"],
      tags: ["AI for photonics"],
      publishedAt: new Date("2026-05-27T00:00:00.000Z"),
    },
    {
      id: "general-llm",
      title: "Large language models for generic software code completion",
      url: "https://arxiv.org/abs/2605.00003",
      source: "arXiv",
      summary:
        "This paper evaluates agentic coding workflows for broad software engineering tasks without photonics or simulation content.",
      authors: ["D. General"],
      tags: ["research agents for science"],
      publishedAt: new Date("2026-05-27T00:00:00.000Z"),
    },
  ],
  now,
);

assert.equal(radar.items[0].id, "pcsel-direct");
assert.equal(radar.items[0].paper_no, "P1");
assert.equal(
  radar.items[0].title_en,
  "Photonic crystal surface-emitting laser design with coupled-wave and finite-element validation",
);
assert.match(radar.items[0].abstract_en, /We study PCSEL structures/);
assert.equal(radar.items[0].abstract_zh, radar.items[0].summary_zh);
assert.equal(radar.items[0].why_this_matters, radar.items[0].why_relevant);
assert.equal(radar.items[0].priority, "must-read");
assert.match(radar.items[0].title_zh, /光子晶体/);
assert.match(radar.items[0].why_relevant, /为什么与你有关/);
assert.match(radar.items[0].why_relevant, /PCSEL|CWT|FDTD|FEM|COMSOL|Lumerical/);
assert(radar.items.length <= 8);
assert(radar.deep_read_candidates.some((item) => item.id === "ai-photonics"));
assert(
  (radar.items.find((item) => item.id === "general-llm")?.score ?? 0) <
    radar.items[0].score,
);

const mixedRadar = buildAcademicRadar(
  [
    {
      id: "old-core",
      title:
        "PCSEL photonic crystal surface-emitting laser coupled-wave FEM FDTD COMSOL Lumerical far field quantum well gain spectrum",
      url: "https://doi.org/10.1000/old-core",
      source: "Crossref",
      summary:
        "A very high relevance PCSEL paper using coupled-wave theory, FEM, FDTD, COMSOL, Lumerical, far field, quantum well, and gain spectrum validation.",
      publishedAt: new Date("2023-01-01T00:00:00.000Z"),
    },
    {
      id: "fresh-method",
      title: "Nanophotonic inverse design with neural surrogate models",
      url: "https://arxiv.org/abs/2605.00004",
      source: "arXiv",
      summary:
        "A recent nanophotonic inverse design method using machine learning surrogate models for photonic crystal devices.",
      publishedAt: new Date("2026-05-29T00:00:00.000Z"),
    },
  ],
  now,
);
assert(mixedRadar.items.some((item) => item.id === "old-core"));
assert(mixedRadar.items.some((item) => item.id === "fresh-method"));

const deduped = dedupeAcademicCandidates([
  {
    id: "https://doi.org/10.1234/ABC.5",
    title: "PCSEL paper",
    url: "https://doi.org/10.1234/ABC.5",
    source: "Crossref",
    summary: "short",
  },
  {
    id: "doi:10.1234/abc.5",
    title: "PCSEL paper",
    url: "https://dx.doi.org/10.1234/abc.5?via=ihub",
    source: "OpenAlex",
    summary: "A complete photonic crystal surface-emitting laser abstract.",
    abstractSource: "OpenAlex",
  },
]);
assert.equal(deduped.length, 1, "DOI aliases must collapse to one candidate");

assert.throws(
  () => validateAcademicTranslations(["a", "b"], [
    { id: "a", title_zh: "标题", summary_zh: "摘要。" },
  ]),
  /missing ids: b/,
);

const translatedRadar = applyAcademicTranslations(radar, [
  {
    id: "pcsel-direct",
    title_zh: "基于耦合波与有限元验证的光子晶体面发射激光器设计",
    summary_zh:
      "我们使用耦合波理论、有限元验证、远场发散、量子阱增益和 III-V 材料参数来研究 PCSEL 结构。",
  },
  {
    id: "ai-photonics",
    title_zh: "用于纳米光子腔逆向设计的 Transformer 代理模型",
    summary_zh:
      "一种机器学习代理模型加速了纳米光子腔的逆向设计，并预测 Q 因子和模式体积。",
  },
]);
assert.equal(
  translatedRadar.items[0].summary_zh,
  "我们使用耦合波理论、有限元验证、远场发散、量子阱增益和 III-V 材料参数来研究 PCSEL 结构。",
);
assert.equal(
  translatedRadar.items[0].abstract_zh,
  "我们使用耦合波理论、有限元验证、远场发散、量子阱增益和 III-V 材料参数来研究 PCSEL 结构。",
);
assert.doesNotMatch(translatedRadar.items[0].summary_zh, /命中的关键词|为什么与你有关/);
assert.match(translatedRadar.items[0].why_relevant, /为什么与你有关/);

const report: DailyReport = {
  hero_headline: "Academic radar test",
  daily_overview: "A test report with an academic radar section.",
  tech_briefs: [],
  finance_briefs: [],
  politics_briefs: [],
  editor_note: "Test note",
  keywords: ["PCSEL", "nanophotonics"],
  academic_radar: translatedRadar,
};

const html = renderHtml(report, { tech: [], finance: [], politics: [] }, "2026-05-29");
assert.match(html, /academic/);
assert.match(html, /class="academic-paper-no">P1</);
assert.match(html, /class="academic-paper-no">P2</);
assert.match(html, /中文标题/);
assert.match(html, /中文摘要/);
assert.match(html, /为什么与你有关/);
assert.match(html, /Photonic crystal surface-emitting laser/);
assert.match(html, /我们使用耦合波理论/);
assert.match(html, /Transformer surrogate models/);

const markdown = renderMarkdown(report, "2026-05-29");
assert.match(markdown, /### P1 - \[/);
assert.match(markdown, /### P2 - \[/);
assert.match(markdown, /中文标题/);
assert.match(markdown, /中文摘要/);
assert.match(markdown, /为什么与你有关/);
assert.match(markdown, /Photonic crystal surface-emitting laser/);
assert.match(markdown, /我们使用耦合波理论/);
assert.match(markdown, /Transformer surrogate models/);

console.log("PASS academic radar");
