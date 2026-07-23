import "./_env";

import fs from "node:fs";
import path from "node:path";

import type { ArticleInput, DailyReport } from "../lib/ai/pipeline";
import { groupRaw, renderHtml, renderMarkdown } from "../lib/output/render";
import { sources } from "../lib/sources/registry";
import { todayKey } from "../lib/utils";
import { finalizeAcademicRadarDisplay } from "../lib/academic-radar/display";
import {
  buildDailyAddons,
  type SourceHealthSection,
} from "../lib/daily-addons";

const OUTPUT_DIR = "daily_reports";

/**
 * Re-render HTML + Markdown from a previously-saved daily report.
 *
 * Use this for UI-only iteration (CSS / layout / labels) — no RSS fetch,
 * no LLM call, no Max quota consumed. Requires that `npm run daily` has
 * been run for the target date so the sidecar `<date>-articles.json`
 * exists.
 *
 * Usage:
 *   npm run render              # today
 *   npm run render -- 2026-05-15  # specific date
 */
function loadReport(date: string): DailyReport {
  const file = path.join(OUTPUT_DIR, date, `${date}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Report JSON not found: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8")) as DailyReport;
}

function loadSidecar(date: string): {
  articles: ArticleInput[];
  sourceHealth?: SourceHealthSection;
} {
  const file = path.join(OUTPUT_DIR, date, `${date}-articles.json`);
  if (!fs.existsSync(file)) {
    throw new Error(
      `Articles sidecar not found: ${file}\n` +
        `Run \`npm run daily\` for ${date} first (or any date >= when sidecar was introduced).`,
    );
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    articles: Array<
      Omit<ArticleInput, "publishedAt"> & { publishedAt?: string }
    >;
    sourceHealth?: SourceHealthSection;
  };
  return {
    articles: data.articles.map((a) => ({
      ...a,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : undefined,
    })),
    sourceHealth: data.sourceHealth,
  };
}

async function main() {
  const date = process.argv[2] || todayKey();
  console.log(`[render] re-rendering ${date} from cached data…`);

  const report = loadReport(date);
  if (report.academic_radar) {
    report.academic_radar = finalizeAcademicRadarDisplay(report.academic_radar);
  }
  const { articles, sourceHealth } = loadSidecar(date);
  console.log(`[render] loaded ${articles.length} articles + report`);
  const reportWithAddons = buildDailyAddons(report, articles, sources, sourceHealth);

  const raw = groupRaw(articles, sources);
  const dateDir = path.join(OUTPUT_DIR, date);
  fs.mkdirSync(dateDir, { recursive: true });
  const base = path.join(dateDir, date);
  fs.writeFileSync(
    `${base}.json`,
    JSON.stringify(reportWithAddons, null, 2),
    "utf8",
  );
  fs.writeFileSync(`${base}.html`, renderHtml(reportWithAddons, raw, date), "utf8");
  if (process.env.OUTPUT_MARKDOWN === "true") {
    fs.writeFileSync(`${base}.md`, renderMarkdown(reportWithAddons, date), "utf8");
    console.log(`[render] wrote ${base}.{json,html,md}`);
  } else {
    console.log(`[render] wrote ${base}.{json,html}`);
  }
}

main().catch((e) => {
  console.error("[render] FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
