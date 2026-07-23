import assert from "node:assert/strict";

import {
  ensureAcademicAbstracts,
  ensureAcademicRadarAbstracts,
  extractAbstractFromHtml,
  isUsableAcademicAbstract,
} from "../lib/academic-radar/abstracts";
import type { AcademicPaperCandidate } from "../lib/academic-radar";
import { buildAcademicTranslationPayload } from "../lib/ai/academic-translation";

assert.equal(isUsableAcademicAbstract("Physics and Simulation of Optoelectronic Devices XXXIII"), false);
assert.equal(isUsableAcademicAbstract("原始摘要缺失；需点开原文查看。"), false);
assert.equal(
  isUsableAcademicAbstract(
    "We demonstrate 29-W continuous-wave operation of a photonic-crystal surface-emitting laser with a double lattice structure and a circular resonator diameter of",
  ),
  false,
);
assert.equal(
  isUsableAcademicAbstract(
    "We propose and investigate a novel coherent laser array design based on laterally coupled photonic crystal surface-emitting lasers (PCSELs). As a new type of semiconductor laser technology, PCSELs have field confinement in a planar cavity and laser beam emission in the surface normal direction. By engineering lateral couplings between PCSELs with heterostructure photonic crystal designs, we can achieve coherent operations from an array of PCSELs. In this paper, we demonstrate coherent operation from a passively coupled PCSEL array design. We fabricated PCSEL array devices on a GaAs-based quantum well heterostructure at a target wavelength of 1040 nm. Experimental results show that the 2-by-2 PCSEL arrays have spectral linewidth of 0.14-0.22 nm. Beam combining performance was characterized by self-interference experiments. Similar coherency between the PCSEL array and single PCSEL device",
  ),
  false,
);
assert.equal(
  isUsableAcademicAbstract(
    "We propose and investigate a coherent PCSEL array based on laterally coupled photonic crystal surface-emitting lasers, and characterize beam combining performance experimentally.",
  ),
  true,
);

const metaHtml = `<html><head>
<meta name="citation_abstract" content="We propose a PCSEL modeling and design workflow for photonic crystal surface-emitting lasers with coupled-wave analysis and electromagnetic validation.">
</head><body></body></html>`;
assert.match(extractAbstractFromHtml(metaHtml) ?? "", /PCSEL modeling/);

const sectionHtml = `<section class="abstract"><h2>Abstract</h2><p>A finite-difference time-domain model is used to study a photonic crystal surface emitting laser and validate the far-field pattern.</p></section>`;
assert.match(extractAbstractFromHtml(sectionHtml) ?? "", /finite-difference time-domain/);

const candidates: AcademicPaperCandidate[] = [
  {
    id: "doi:old",
    title: "Existing abstract",
    url: "https://doi.org/10.1/existing",
    source: "Crossref",
    summary:
      "We propose and investigate a coherent PCSEL array based on laterally coupled photonic crystal surface-emitting lasers.",
  },
  {
    id: "doi:missing",
    title: "Missing abstract",
    url: "https://doi.org/10.1/missing",
    source: "Crossref",
    summary: "Physics and Simulation of Optoelectronic Devices XXXIII",
  },
  {
    id: "doi:dropped",
    title: "Still missing",
    url: "https://doi.org/10.1/dropped",
    source: "Crossref",
    summary: "",
  },
];

async function main() {
  const ensured = await ensureAcademicAbstracts(candidates, {
    resolve: async (candidate) => {
      if (candidate.id === "doi:missing") {
        return {
          abstract:
            "This original paper abstract describes a PCSEL modeling tool for photonic crystal surface-emitting lasers and validates the design workflow.",
          source: "test original page",
        };
      }
      return null;
    },
  });

  assert.equal(ensured.candidates.length, 2);
  assert.equal(
    ensured.candidates[1].summary,
    "This original paper abstract describes a PCSEL modeling tool for photonic crystal surface-emitting lasers and validates the design workflow.",
  );
  assert.equal(ensured.candidates[1].abstractSource, "test original page");
  assert(ensured.sourceNotes.some((note) => /dropped/.test(note)));

  const longCompleteAbstract = `${"A complete academic abstract sentence. ".repeat(70)}Final sentence.`;
  const resolvedRadar = await ensureAcademicRadarAbstracts(
    {
      generated_at: "2026-07-21T00:00:00.000Z",
      profile: "test",
      items: [
        {
          id: "doi:radar",
          paper_no: "P1",
          title: "Resolved radar abstract",
          title_en: "Resolved radar abstract",
          title_zh: "雷达摘要",
          url: "https://doi.org/10.1/radar",
          source: "test",
          summary: "truncated abstract with no sentence ending",
          abstract_en: "truncated abstract with no sentence ending",
          summary_zh: "",
          abstract_zh: "",
          authors: [],
          tags: ["PCSEL"],
          score: 10,
          priority: "must-read",
          action: "read",
          relevance: "test",
          why_relevant: "test",
          why_this_matters: "test",
          matched_terms: ["pcsel"],
        },
      ],
      deep_read_candidates: [],
      source_notes: [],
      risk_caveat: "test",
    },
    {
      resolve: async () => ({
        abstract: longCompleteAbstract,
        source: "test resolver",
      }),
    },
  );
  assert.equal(resolvedRadar.radar.items[0].summary, longCompleteAbstract);
  assert.equal(resolvedRadar.radar.items[0].abstract_en, longCompleteAbstract);
  assert.equal(resolvedRadar.radar.items[0].paper_no, "P1");
  assert.equal(
    buildAcademicTranslationPayload(resolvedRadar.radar.items)[0].summary,
    longCompleteAbstract,
  );

  console.log("PASS academic abstracts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
