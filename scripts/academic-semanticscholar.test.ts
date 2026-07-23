import assert from "node:assert/strict";

import { candidateFromSemanticScholarPaper } from "../lib/academic-radar/semanticscholar";

const candidate = candidateFromSemanticScholarPaper({
  title: "High-power photonic-crystal surface-emitting laser array",
  year: 2026,
  authors: [{ name: "A. Researcher" }, { name: "B. Photonics" }],
  venue: "Nature Photonics",
  citationCount: 42,
  influentialCitationCount: 3,
  externalIds: { DOI: "10.1234/example" },
  url: "https://www.semanticscholar.org/paper/example",
  openAccessPdf: { url: "https://example.test/paper.pdf" },
  abstract:
    "This paper reports a high-power photonic-crystal surface-emitting laser array with coherent emission, narrow divergence, and beam-quality analysis for PCSEL devices.",
});

assert(candidate);
assert.equal(candidate.id, "https://doi.org/10.1234/example");
assert.equal(candidate.url, "https://doi.org/10.1234/example");
assert.equal(candidate.source, "Semantic Scholar · Nature Photonics");
assert.equal(candidate.citationCount, 42);
assert.equal(candidate.influentialCitationCount, 3);
assert.deepEqual(candidate.pdfUrls, ["https://example.test/paper.pdf"]);
assert.match(candidate.summary, /high-power photonic-crystal/);

console.log("PASS academic Semantic Scholar");
