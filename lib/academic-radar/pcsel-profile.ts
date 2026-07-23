export const PCSEL_SEARCH_QUERIES = [
  "photonic crystal surface emitting laser PCSEL",
  '"photonic-crystal surface-emitting laser"',
  '"photonic crystal surface-emitting laser"',
  '"PCSEL" laser',
  '"photonic crystal laser" "surface emitting"',
  '"coherent photonic crystal surface emitting laser"',
  '"high-power" "photonic-crystal" "surface-emitting" laser',
  '"beam steering" "photonic-crystal" laser',
  '"PCSEL"',
  '"photonic-crystal surface-emitting lasers" review',
  '"photonic crystal surface emitting lasers" GaN',
  '"photonic crystal surface emitting lasers" quantum dot',
  '"photonic crystal vertical cavity surface emitting laser"',
];

export function normalizeAcademicSearchText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function canonicalAcademicDoi(value: string | undefined): string {
  const raw = decodeURIComponent(value ?? "").trim();
  const withoutPrefix = raw.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
  const match = withoutPrefix.match(/10\.\d{4,9}\/[^\s"'<>]+/i);
  return match ? match[0].replace(/[.,;)]+$/, "").toLowerCase() : "";
}

export function pcselWorkflowRelevanceScore(
  title: string,
  abstract: string,
): number {
  const text = normalizeAcademicSearchText(`${title} ${abstract}`);
  let score = 0;
  const phraseHits = [
    "photonic crystal surface emitting laser",
    "photonic crystal surface emitting lasers",
    "photonic crystal surface emitter",
    "photonic crystal laser surface emitting",
    "pcsel",
    "pcsels",
  ];

  if (phraseHits.some((phrase) => text.includes(phrase))) {
    score += 90;
  } else if (
    text.includes("photonic crystal") &&
    text.includes("surface emitting") &&
    text.includes("laser")
  ) {
    score += 80;
  } else if (
    text.includes("photonic crystal") &&
    text.includes("laser") &&
    [
      "semiconductor",
      "high brightness",
      "high power",
      "narrow divergence",
      "beam quality",
      "beam steering",
      "double lattice",
      "flat band",
      "band edge",
      "large area",
      "coherent",
    ].some((token) => text.includes(token))
  ) {
    score += 68;
  } else if (text.includes("photonic crystal") && text.includes("laser")) {
    score += 35;
  }

  if (
    text.includes("beam steering") ||
    text.includes("high power") ||
    text.includes("coherent")
  ) {
    score += 8;
  }
  if (text.includes("surface plasmon") || text.includes("photovoltaic")) {
    score -= 25;
  }
  return Math.max(score, 0);
}

export function pcselWorkflowVenueScore(venue: string | undefined): number {
  const text = normalizeAcademicSearchText(venue ?? "");
  const weights: Array<[string, number]> = [
    ["nature photonics", 90],
    ["nature", 90],
    ["science", 90],
    ["physical review letters", 70],
    ["laser photonics reviews", 65],
    ["ieee journal of selected topics in quantum electronics", 55],
    ["optica", 55],
    ["optics express", 40],
    ["optics letters", 40],
    ["applied physics letters", 40],
    ["ieee photonics technology letters", 35],
    ["journal of lightwave technology", 35],
    ["semiconductor science and technology", 25],
  ];
  for (const [key, value] of weights) {
    if (text.includes(key)) return value;
  }
  return text ? 10 : 0;
}

export function isPcselWorkflowCandidate(title: string, abstract: string): boolean {
  return pcselWorkflowRelevanceScore(title, abstract) >= 45;
}
