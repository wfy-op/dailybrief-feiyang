import assert from "node:assert/strict";

import { buildAcademicRadar } from "../lib/academic-radar";
import { pcselWorkflowRelevanceScore } from "../lib/academic-radar/pcsel-profile";

assert(
  pcselWorkflowRelevanceScore(
    "High-power photonic-crystal surface-emitting laser array",
    "",
  ) >= 80,
);
assert(
  pcselWorkflowRelevanceScore(
    "Ultra-compact fiber-optic two-photon microscope for functional fluorescence imaging in vivo",
    "A photonic crystal fiber and femtosecond laser are used for microscopy.",
  ) < 45,
);

const radar = buildAcademicRadar(
  [
    {
      id: "noise",
      title:
        "Ultra-compact fiber-optic two-photon microscope for functional fluorescence imaging in vivo",
      url: "https://example.test/noise",
      source: "test",
      summary:
        "A photonic crystal fiber and femtosecond laser are used for microscopy.",
      publishedAt: new Date("2026-06-01T00:00:00Z"),
    },
    {
      id: "pcsel",
      title: "High-power photonic-crystal surface-emitting laser array",
      url: "https://example.test/pcsel",
      source: "test",
      summary:
        "A PCSEL paper on coherent high-power photonic crystal surface emitting laser arrays.",
      publishedAt: new Date("2026-06-01T00:00:00Z"),
    },
  ],
  new Date("2026-06-09T00:00:00Z"),
);

assert(radar.items.some((item) => item.id === "pcsel"));
assert(!radar.items.some((item) => item.id === "noise"));

console.log("PASS academic paper skill");
