import type {
  AcademicPaperCandidate,
  AcademicPaperItem,
  AcademicPriority,
  AcademicRadarSection,
} from "./types";
import { finalizeAcademicRadarDisplay } from "./display";
import {
  pcselWorkflowRelevanceScore,
  pcselWorkflowVenueScore,
} from "./pcsel-profile";

type TermWeight = {
  term: string;
  tag: string;
  weight: number;
};

const PROFILE =
  "PCSEL / nanophotonics / CWT-FEM-FDTD modeling first; AI for photonics, research agents, and inverse design second.";

const PRIMARY_TERMS: TermWeight[] = [
  { term: "pcsel", tag: "PCSEL", weight: 10 },
  { term: "photonic", tag: "photonics", weight: 2 },
  { term: "photonics", tag: "photonics", weight: 2 },
  {
    term: "photonic crystal surface emitting laser",
    tag: "PCSEL",
    weight: 10,
  },
  {
    term: "photonic crystal surface-emitting laser",
    tag: "PCSEL",
    weight: 10,
  },
  { term: "photonic crystal laser", tag: "photonic crystal laser", weight: 7 },
  { term: "surface-emitting laser", tag: "surface-emitting laser", weight: 5 },
  { term: "photonic crystal", tag: "photonic crystal", weight: 4 },
  { term: "nanophotonic", tag: "nanophotonics", weight: 4 },
  { term: "nanophotonics", tag: "nanophotonics", weight: 4 },
  { term: "nanophotonic cavities", tag: "nanocavity", weight: 4 },
  { term: "nanocavity", tag: "nanocavity", weight: 4 },
  { term: "coupled-wave", tag: "CWT", weight: 5 },
  { term: "coupled wave", tag: "CWT", weight: 5 },
  { term: "plane wave expansion", tag: "PWEM", weight: 4 },
  { term: "pwem", tag: "PWEM", weight: 4 },
  { term: "fdtd", tag: "FDTD", weight: 4 },
  { term: "fem", tag: "FEM", weight: 3 },
  { term: "finite element", tag: "FEM", weight: 3 },
  { term: "comsol", tag: "COMSOL", weight: 3 },
  { term: "lumerical", tag: "Lumerical", weight: 3 },
  { term: "quality factor", tag: "Q factor", weight: 3 },
  { term: "q factor", tag: "Q factor", weight: 3 },
  { term: "mode volume", tag: "mode volume", weight: 3 },
  { term: "far field", tag: "far field", weight: 3 },
  { term: "divergence angle", tag: "far field", weight: 3 },
  { term: "quantum well", tag: "quantum well", weight: 3 },
  { term: "gain spectrum", tag: "gain", weight: 3 },
  { term: "gaas", tag: "III-V", weight: 2 },
  { term: "algaas", tag: "III-V", weight: 2 },
  { term: "ingaas", tag: "III-V", weight: 2 },
  { term: "inp", tag: "III-V", weight: 2 },
];

const PHOTONICS_ANCHORS = [
  "pcsel",
  "photonic",
  "nanophotonic",
  "nanocavity",
  "photonic crystal",
  "surface-emitting laser",
  "surface emitting laser",
];

const AI_TERMS: TermWeight[] = [
  { term: "machine learning", tag: "ML", weight: 4 },
  { term: "deep learning", tag: "deep learning", weight: 4 },
  { term: "reinforcement learning", tag: "RL", weight: 4 },
  { term: "inverse design", tag: "inverse design", weight: 5 },
  { term: "bayesian optimization", tag: "Bayesian optimization", weight: 4 },
  { term: "neural operator", tag: "neural operator", weight: 4 },
  { term: "transformer", tag: "Transformer", weight: 3 },
  { term: "vision transformer", tag: "ViT", weight: 3 },
  { term: "large language model", tag: "LLM", weight: 3 },
  { term: "research agent", tag: "research agent", weight: 3 },
  { term: "agentic", tag: "agent", weight: 2 },
  { term: "surrogate model", tag: "surrogate model", weight: 3 },
  { term: "simulation-to-reality", tag: "sim2real", weight: 3 },
  { term: "physics-informed", tag: "physics-informed", weight: 3 },
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[‐-‒–—]/g, "-");
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTerm(text: string, term: string): boolean {
  const pattern = term
    .trim()
    .split(/\s+/)
    .map(escapeRegExp)
    .join("[\\s-]+");
  return new RegExp(`(^|[^a-z0-9])${pattern}([^a-z0-9]|$)`, "i").test(text);
}

function matchTerms(text: string, terms: TermWeight[]) {
  const matched = terms.filter((term) => matchesTerm(text, term.term));
  return {
    matched,
    score: matched.reduce((sum, term) => sum + term.weight, 0),
    tags: unique(matched.map((term) => term.tag)),
    terms: unique(matched.map((term) => term.term)),
  };
}

function recencyBoost(candidate: AcademicPaperCandidate, now: Date): number {
  if (!candidate.publishedAt) return 0;
  const ageDays =
    (now.getTime() - candidate.publishedAt.getTime()) / 86_400_000;
  if (ageDays <= 7) return 1.5;
  if (ageDays <= 21) return 0.9;
  if (ageDays <= 45) return 0.4;
  return 0;
}

function classifyPriority(
  score: number,
  primaryTags: string[],
  aiTags: string[],
  isPcselCore: boolean,
): AcademicPriority {
  if (isPcselCore || primaryTags.includes("PCSEL")) return "must-read";
  if (score >= 5 || (primaryTags.length > 0 && aiTags.length > 0)) {
    return "deep-read";
  }
  return "watch";
}

function actionFor(priority: AcademicPriority): string {
  if (priority === "must-read") {
    return "今日必看：优先判断是否进入 PCSEL / CWT / 仿真建模文献库。";
  }
  if (priority === "deep-read") {
    return "周末深读：适合作为方法储备，关注能否迁移到光子晶体器件设计。";
  }
  return "观察即可：保留趋势信号，暂不占用当天精读时间。";
}

function relevanceFor(primaryTags: string[], aiTags: string[]): string {
  if (primaryTags.includes("PCSEL")) {
    return "与当前 PCSEL 主线直接相关，可优先检查模型、结构参数或验证口径是否可复用。";
  }
  if (primaryTags.length > 0 && aiTags.length > 0) {
    return "同时命中纳米光子学与 AI 方法，适合作为 AI-for-photonics / 代理建模的候选参考。";
  }
  if (primaryTags.length > 0) {
    return "命中光子晶体、纳米腔或电磁仿真关键词，可作为器件物理和数值方法的外围补充。";
  }
  if (aiTags.length > 0) {
    return "属于 AI / agent / inverse-design 方法线索，只有在后续和光子学任务发生交叉时才需要深入。";
  }
  return "相关性较弱，仅作为背景趋势记录。";
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

function localizedTitle(title: string): string {
  const text = normalizeText(title);
  if (
    text.includes("photonic crystal surface-emitting laser design") &&
    text.includes("coupled-wave") &&
    text.includes("finite-element")
  ) {
    return "基于耦合波与有限元验证的光子晶体面发射激光器设计";
  }
  if (
    text.includes("laterally coupled photonic crystal surface emitting laser arrays")
  ) {
    return "横向耦合光子晶体面发射激光器阵列";
  }
  if (
    text.includes("compact coherent photonic crystal surface-emitting laser arrays")
  ) {
    return "紧凑相干光子晶体面发射激光器阵列";
  }
  if (
    text.includes("pcsel modeling and design tool") &&
    text.includes("photonic crystal surface-emitting lasers")
  ) {
    return "面向光子晶体面发射激光器的 PCSEL 建模与设计工具";
  }
  if (text.includes("superradiant photonic crystal surface emitting laser")) {
    return "超辐射光子晶体面发射激光器";
  }
  if (text.includes("machine-learning-empowered fdtd/fem simulations")) {
    return "机器学习增强的 FDTD/FEM 仿真：用于等离激元超材料纳米腔阵列的吸收预测";
  }
  if (
    text.includes("transformer surrogate models") &&
    text.includes("inverse design") &&
    text.includes("nanophotonic cavities")
  ) {
    return "用于纳米光子腔逆向设计的 Transformer 代理模型";
  }

  const topic = text.includes("pcsel")
    ? "PCSEL"
    : text.includes("photonic crystal surface")
      ? "光子晶体面发射激光器"
      : text.includes("photonic crystal")
        ? "光子晶体"
        : text.includes("nanocavity")
          ? "纳米腔"
          : text.includes("nanophotonic")
            ? "纳米光子学"
            : "光子学";
  const methodParts: string[] = [];
  if (hasAny(text, ["coupled-wave", "coupled wave"])) methodParts.push("耦合波");
  if (hasAny(text, ["fdtd"])) methodParts.push("FDTD");
  if (hasAny(text, ["fem", "finite element"])) methodParts.push("有限元");
  if (hasAny(text, ["inverse design"])) methodParts.push("逆向设计");
  if (hasAny(text, ["machine learning", "deep learning", "transformer"])) {
    methodParts.push("机器学习");
  }
  const method = methodParts.length > 0 ? `：${methodParts.join(" / ")} 方法` : "相关研究";
  return `${topic}${method}`;
}

function localizedSummary(
  candidate: AcademicPaperCandidate,
  primaryTags: string[],
  aiTags: string[],
  matchedTerms: string[],
): string {
  const text = normalizeText([candidate.title, candidate.summary].join(" "));
  const topic = primaryTags.includes("PCSEL")
    ? "PCSEL / 光子晶体面发射激光器"
    : primaryTags.includes("nanocavity")
      ? "纳米光子腔"
      : primaryTags.includes("photonic crystal")
        ? "光子晶体器件"
        : "纳米光子学器件";

  const methods: string[] = [];
  if (hasAny(text, ["coupled-wave", "coupled wave"])) methods.push("耦合波理论");
  if (hasAny(text, ["fdtd"])) methods.push("FDTD");
  if (hasAny(text, ["fem", "finite element"])) methods.push("有限元/FEM");
  if (hasAny(text, ["comsol"])) methods.push("COMSOL");
  if (hasAny(text, ["lumerical"])) methods.push("Lumerical");
  if (hasAny(text, ["machine learning", "deep learning", "transformer", "surrogate model"])) {
    methods.push("机器学习/代理模型");
  }
  if (hasAny(text, ["inverse design"])) methods.push("逆向设计");

  const metrics: string[] = [];
  if (hasAny(text, ["q factor", "quality factor"])) metrics.push("Q 因子");
  if (hasAny(text, ["mode volume"])) metrics.push("模式体积");
  if (hasAny(text, ["far field", "divergence"])) metrics.push("远场/发散角");
  if (hasAny(text, ["quantum well", "gain"])) metrics.push("量子阱增益");
  if (hasAny(text, ["iii-v", "gaas", "algaas", "ingaas", "inp"])) {
    metrics.push("III-V 材料参数");
  }

  const methodText =
    methods.length > 0 ? `主要方法涉及${methods.join("、")}。` : "摘要未给出足够的方法细节，需要点开原文确认。";
  const metricText =
    metrics.length > 0
      ? `可优先留意${metrics.join("、")}这些指标或参数。`
      : "可先检查结构设定、边界条件和实验/仿真验证口径。";
  const matchedText =
    matchedTerms.length > 0 ? `命中的关键词包括 ${matchedTerms.slice(0, 6).join("、")}。` : "";

  return `本文围绕${topic}展开。${methodText}${metricText}${matchedText}`;
}

function whyRelevantFor(
  primaryTags: string[],
  aiTags: string[],
  matchedTerms: string[],
): string {
  const lines: string[] = ["为什么与你有关："];
  if (primaryTags.includes("PCSEL")) {
    lines.push("- 主线关联：直接服务 PCSEL 方向，优先看结构参数、耦合机制、出光/远场和验证口径。");
  } else if (primaryTags.length > 0) {
    lines.push(
      `- 主线关联：更偏${primaryTags.slice(0, 3).join(" / ")}，可作为 PCSEL 周边器件物理或数值方法补充。`,
    );
  } else {
    lines.push("- 主线关联：不直接命中 PCSEL，但可作为 AI-for-photonics 方法背景观察。");
  }

  const toolLines: string[] = [];
  if (matchedTerms.some((term) => ["coupled-wave", "coupled wave"].includes(term))) {
    toolLines.push("CWT");
  }
  if (matchedTerms.includes("fdtd")) toolLines.push("FDTD");
  if (matchedTerms.some((term) => ["fem", "finite element"].includes(term))) {
    toolLines.push("FEM");
  }
  if (matchedTerms.includes("comsol")) toolLines.push("COMSOL");
  if (matchedTerms.includes("lumerical")) toolLines.push("Lumerical");
  if (aiTags.length > 0) toolLines.push("AI 代理模型/逆向设计");
  lines.push(
    `- 可用线索：${toolLines.length > 0 ? toolLines.join(" / ") : "先看是否能抽出结构参数、指标定义或仿真设置"}。`,
  );

  const reusableMetrics = matchedTerms.filter((term) =>
    [
      "quality factor",
      "q factor",
      "mode volume",
      "far field",
      "divergence angle",
      "quantum well",
      "gain spectrum",
    ].includes(term),
  );
  if (reusableMetrics.length > 0) {
    lines.push(
      `- 可转化内容：适合沉淀成验证指标或参数先验，尤其是 ${reusableMetrics.slice(0, 4).join(" / ")}。`,
    );
  } else {
    lines.push("- 可转化内容：先判断能否变成一个仿真 case、baseline、验证指标或参数先验。");
  }
  return lines.join("\n");
}

function cleanSummary(summary: string): string {
  return summary.replace(/\s+/g, " ").trim();
}

function itemKey(item: AcademicPaperItem): string {
  return (item.id || item.url || item.title).trim().toLowerCase();
}

function publishedTime(item: AcademicPaperItem): number {
  const time = item.published_at ? Date.parse(item.published_at) : NaN;
  return Number.isFinite(time) ? time : 0;
}

function isRecentItem(
  item: AcademicPaperItem,
  now: Date,
  days: number,
): boolean {
  const time = publishedTime(item);
  if (!time) return false;
  return now.getTime() - time <= days * 86_400_000;
}

function mixRecentWithRanked(
  ranked: AcademicPaperItem[],
  now: Date,
  limit: number,
  recentTarget: number,
): AcademicPaperItem[] {
  const seen = new Set<string>();
  const out: AcademicPaperItem[] = [];
  const add = (item: AcademicPaperItem): void => {
    const key = itemKey(item);
    if (seen.has(key) || out.length >= limit) return;
    seen.add(key);
    out.push(item);
  };

  ranked
    .filter(
      (item) =>
        isRecentItem(item, now, 730) &&
        (item.priority !== "watch" || item.score >= 5),
    )
    .sort((a, b) => {
      const dateDiff = publishedTime(b) - publishedTime(a);
      if (dateDiff !== 0) return dateDiff;
      return b.score - a.score;
    })
    .slice(0, recentTarget)
    .forEach(add);

  ranked.forEach(add);
  return out;
}

function assignReportPaperNumbers(
  groups: AcademicPaperItem[][],
): AcademicPaperItem[][] {
  const byKey = new Map<string, string>();
  const numberFor = (item: AcademicPaperItem): string => {
    const key = itemKey(item);
    const existing = byKey.get(key);
    if (existing) return existing;
    const next = `P${byKey.size + 1}`;
    byKey.set(key, next);
    return next;
  };

  return groups.map((items) =>
    items.map((item) => ({ ...item, paper_no: numberFor(item) })),
  );
}

function toRankedItem(
  candidate: AcademicPaperCandidate,
  now: Date,
): AcademicPaperItem | null {
  const text = normalizeText(
    [candidate.title, candidate.summary].join(" "),
  );
  const hasPhotonicsAnchor = PHOTONICS_ANCHORS.some((term) =>
    text.includes(term),
  );
  if (!hasPhotonicsAnchor) return null;

  const primary = matchTerms(text, PRIMARY_TERMS);
  const ai = matchTerms(text, AI_TERMS);
  const workflowRelevance = pcselWorkflowRelevanceScore(
    candidate.title,
    candidate.summary,
  );
  const simulationHit =
    primary.terms.some((term) =>
      [
        "fdtd",
        "fem",
        "finite element",
        "coupled-wave",
        "coupled wave",
        "comsol",
        "lumerical",
        "quality factor",
        "q factor",
        "mode volume",
      ].includes(term),
    );
  const aiDesignHit = ai.terms.some((term) =>
    [
      "inverse design",
      "bayesian optimization",
      "neural operator",
      "surrogate model",
      "physics-informed",
    ].includes(term),
  );
  const isPcselCore = workflowRelevance >= 45;
  if (!isPcselCore && !(primary.score >= 7 && (simulationHit || aiDesignHit))) {
    return null;
  }
  if (primary.score === 0 && ai.score === 0) return null;

  const sourceBoost = /semantic scholar|openalex/i.test(candidate.source)
    ? 0.6
    : /arxiv/i.test(candidate.source)
      ? 0.3
      : 0;
  const crossDomainBoost = primary.score > 0 && ai.score > 0 ? 1.2 : 0;
  const genericAiPenalty = primary.score === 0 ? 0.45 : 1;
  const workflowBoost = isPcselCore ? workflowRelevance / 10 : 0;
  const venueBoost = Math.min(
    pcselWorkflowVenueScore(candidate.venue ?? candidate.source) / 30,
    3,
  );
  const citationBoost =
    Math.min(candidate.citationCount ?? 0, 200) / 100 +
    Math.min(candidate.influentialCitationCount ?? 0, 50) / 25;
  const score =
    (primary.score * 0.7 + ai.score * 0.3 + crossDomainBoost) *
      genericAiPenalty +
    workflowBoost +
    venueBoost +
    citationBoost +
    recencyBoost(candidate, now) +
    sourceBoost;

  if (score < 1.2) return null;

  const primaryTags = primary.tags;
  const aiTags = ai.tags;
  const matchedTerms = unique([...primary.terms, ...ai.terms]);
  const priority = classifyPriority(score, primaryTags, aiTags, isPcselCore);
  const tags = unique([
    ...(candidate.tags ?? []),
    ...(isPcselCore ? ["PCSEL"] : []),
    ...primaryTags,
    ...aiTags,
  ]).slice(0, 8);
  const abstractEn = cleanSummary(candidate.summary);
  const abstractZh = localizedSummary(candidate, primaryTags, aiTags, matchedTerms);
  const whyThisMatters = whyRelevantFor(primaryTags, aiTags, matchedTerms);

  return {
    id: candidate.id,
    title: candidate.title,
    title_en: candidate.title,
    title_zh: localizedTitle(candidate.title),
    url: candidate.url,
    source: candidate.source,
    summary: abstractEn,
    abstract_en: abstractEn,
    summary_zh: abstractZh,
    abstract_zh: abstractZh,
    abstract_source: candidate.abstractSource,
    authors: candidate.authors ?? [],
    tags,
    published_at: candidate.publishedAt?.toISOString(),
    score: Number(score.toFixed(2)),
    priority,
    action: actionFor(priority),
    relevance: relevanceFor(primaryTags, aiTags),
    why_relevant: whyThisMatters,
    why_this_matters: whyThisMatters,
    matched_terms: matchedTerms,
  };
}

export function buildAcademicRadar(
  candidates: AcademicPaperCandidate[],
  now = new Date(),
  itemLimit = 8,
): AcademicRadarSection {
  const ranked = candidates
    .map((candidate) => toRankedItem(candidate, now))
    .filter((item): item is AcademicPaperItem => item !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.published_at ?? "").localeCompare(a.published_at ?? "");
    });

  const items = mixRecentWithRanked(
    ranked,
    now,
    itemLimit,
    Math.min(12, Math.max(4, Math.ceil(itemLimit / 2))),
  );
  const deepRead = mixRecentWithRanked(
    ranked.filter((item) => item.priority !== "watch"),
    now,
    Math.min(12, itemLimit),
    Math.min(6, Math.max(3, Math.ceil(itemLimit / 3))),
  );
  const [numberedItems, numberedDeepRead] = assignReportPaperNumbers([
    items,
    deepRead,
  ]);

  return finalizeAcademicRadarDisplay({
    generated_at: now.toISOString(),
    profile: PROFILE,
    items: numberedItems,
    deep_read_candidates: numberedDeepRead,
    source_notes: [
      "Source set: Semantic Scholar, OpenAlex, and Crossref metadata search, plus arXiv best-effort preprint search when not explicitly disabled.",
      "Ranking uses local keyword weighting, then mixes recent papers into the daily list so high-relevance old papers do not permanently hide new candidates.",
    ],
    risk_caveat:
      "Academic radar is a discovery filter, not a literature review. It may miss papers not indexed by arXiv/Crossref yet and should be followed by manual reading before citation.",
  }, itemLimit);
}
