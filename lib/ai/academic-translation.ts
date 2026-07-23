import { jsonrepair } from "jsonrepair";

import type {
  AcademicPaperItem,
  AcademicRadarSection,
} from "../academic-radar";
import { extractJson } from "./json-util";
import { runLlm } from "./llm";

export type AcademicTranslation = {
  id: string;
  title_zh: string;
  summary_zh: string;
};

type TranslationResponse =
  | AcademicTranslation[]
  | { translations?: AcademicTranslation[] };

const SYSTEM_PROMPT = `你是严谨的英文学术论文标题与摘要中文翻译助手。

任务：把输入论文的英文 title 和英文 summary 直接翻译成简体中文。

严格规则：
1. summary_zh 必须是英文 summary 的忠实中文翻译，不要写成综述、点评、关联性分析或关键词总结。
2. 不要加入“为什么与你有关”“命中的关键词”“本文围绕”等额外解释，除非英文原文确实这么写。
3. 保留必要英文术语或缩写，例如 PCSEL、CWT、FDTD、FEM、COMSOL、Lumerical、Q factor、III-V、Transformer。
4. 如果英文 summary 为空、明显只是期刊名或没有摘要信息，summary_zh 写：“原始摘要缺失；需点开原文查看。”
5. 输出必须是单个合法 JSON 对象，不要 markdown，不要代码块，不要解释。

输出格式：
{
  "translations": [
    { "id": "<copy id>", "title_zh": "<中文标题>", "summary_zh": "<中文摘要直译>" }
  ]
}`;

function cloneRadar(radar: AcademicRadarSection): AcademicRadarSection {
  return {
    ...radar,
    items: radar.items.map((item) => ({ ...item })),
    deep_read_candidates: radar.deep_read_candidates.map((item) => ({
      ...item,
    })),
  };
}

function normalizeTranslations(
  parsed: TranslationResponse,
): AcademicTranslation[] {
  const raw = Array.isArray(parsed) ? parsed : parsed.translations;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is AcademicTranslation =>
      item !== null &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.title_zh === "string" &&
      typeof item.summary_zh === "string",
  );
}

export function validateAcademicTranslations(
  expectedIds: string[],
  translations: AcademicTranslation[],
): AcademicTranslation[] {
  const expected = new Set(expectedIds);
  const seen = new Set<string>();
  for (const translation of translations) {
    if (!expected.has(translation.id)) {
      throw new Error(`academic translation returned unknown id: ${translation.id}`);
    }
    if (seen.has(translation.id)) {
      throw new Error(`academic translation returned duplicate id: ${translation.id}`);
    }
    if (!translation.title_zh.trim() || !translation.summary_zh.trim()) {
      throw new Error(`academic translation is incomplete for id: ${translation.id}`);
    }
    seen.add(translation.id);
  }
  const missing = expectedIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new Error(`academic translation missing ids: ${missing.join(", ")}`);
  }
  return translations;
}

function applyToItem(
  item: AcademicPaperItem,
  translations: Map<string, AcademicTranslation>,
): AcademicPaperItem {
  const translation = translations.get(item.id);
  if (!translation) return item;
  return {
    ...item,
    title_zh: translation.title_zh.trim() || item.title_zh,
    summary_zh: translation.summary_zh.trim() || item.summary_zh,
    abstract_zh: translation.summary_zh.trim() || item.abstract_zh,
  };
}

export function applyAcademicTranslations(
  radar: AcademicRadarSection,
  translations: AcademicTranslation[],
): AcademicRadarSection {
  const byId = new Map(
    translations
      .filter((translation) => translation.id)
      .map((translation) => [translation.id, translation]),
  );
  const out = cloneRadar(radar);
  out.items = out.items.map((item) => applyToItem(item, byId));
  out.deep_read_candidates = out.deep_read_candidates.map((item) =>
    applyToItem(item, byId),
  );
  return out;
}

export function buildAcademicTranslationPayload(items: AcademicPaperItem[]) {
  return items.map((item) => ({
    id: item.id,
    title: item.title_en || item.title,
    // The abstract-quality gate already rejects incomplete source text. Keep
    // it whole: slicing by characters can create a mid-sentence translation.
    summary: (item.abstract_en || item.summary)?.trim() || "",
  }));
}

export async function translateAcademicRadar(
  radar: AcademicRadarSection,
): Promise<AcademicRadarSection> {
  if (radar.items.length === 0) return radar;
  const uniqueItems = [
    ...new Map(
      [...radar.items, ...radar.deep_read_candidates].map((item) => [item.id, item]),
    ).values(),
  ];
  const payload = buildAcademicTranslationPayload(uniqueItems);
  const { text } = await runLlm({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: [
      "请把下面 JSON 数组中的 title 和 summary 逐条直译成简体中文，只返回指定 JSON 对象。",
      "",
      JSON.stringify(payload),
    ].join("\n"),
    timeoutMs: 180_000,
  });

  let parsed: TranslationResponse;
  const cleaned = extractJson(text);
  try {
    parsed = JSON.parse(cleaned) as TranslationResponse;
  } catch (strictErr) {
    try {
      parsed = JSON.parse(jsonrepair(cleaned)) as TranslationResponse;
      console.warn("[academic-translation] JSON.parse failed but jsonrepair recovered");
    } catch {
      try {
        const fs = await import("node:fs");
        fs.mkdirSync("logs", { recursive: true });
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        fs.writeFileSync(`logs/academic-translation-raw-${ts}.txt`, text, "utf8");
        fs.writeFileSync(
          `logs/academic-translation-cleaned-${ts}.txt`,
          cleaned,
          "utf8",
        );
        console.warn(
          `[academic-translation] parse failed; raw at logs/academic-translation-raw-${ts}.txt`,
        );
      } catch {
        // best-effort logging only
      }
      throw strictErr;
    }
  }

  const translations = validateAcademicTranslations(
    payload.map((item) => item.id),
    normalizeTranslations(parsed),
  );
  return applyAcademicTranslations(radar, translations);
}
