import assert from "node:assert/strict";

import { candidateFromOpenAlexWork } from "../lib/academic-radar/openalex";

const candidate = candidateFromOpenAlexWork(
  {
    id: "https://openalex.org/W123",
    doi: "https://doi.org/10.1234/test",
    title: "Fresh nanophotonic inverse design for photonic crystal devices",
    publication_date: "2026-06-01",
    abstract_inverted_index: {
      This: [0],
      paper: [1],
      reports: [2],
      a: [3],
      nanophotonic: [4],
      inverse: [5],
      design: [6],
      method: [7],
      for: [8],
      photonic: [9],
      crystal: [10],
      devices: [11],
      using: [12],
      surrogate: [13],
      simulation: [14],
      models: [15],
      with: [16],
      finite: [17],
      element: [18],
      validation: [19],
      and: [20],
      optical: [21],
      metrics: [22],
      tracking: [23],
      "Q-factor": [24],
      changes: [25],
      ".": [26],
    },
    authorships: [
      { author: { display_name: "A. Researcher" } },
      { author: { display_name: "B. Photonics" } },
    ],
    primary_location: {
      source: { display_name: "Optics Express" },
      landing_page_url: "https://doi.org/10.1234/test",
    },
  },
  "nanophotonics test",
);

assert(candidate);
assert.equal(candidate.id, "https://doi.org/10.1234/test");
assert.equal(candidate.url, "https://doi.org/10.1234/test");
assert.equal(candidate.source, "OpenAlex · Optics Express");
assert.equal(candidate.publishedAt?.toISOString(), "2026-06-01T00:00:00.000Z");
assert.deepEqual(candidate.authors, ["A. Researcher", "B. Photonics"]);
assert.match(candidate.summary, /nanophotonic inverse design/);
assert.match(candidate.summary, /\.$/);

console.log("PASS academic OpenAlex");
