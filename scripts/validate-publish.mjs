#!/usr/bin/env node
/** Deterministic fail-closed gate for DailyBrief publishing. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PLACEHOLDER_RE =
  /(原始摘要缺失|需点开原文|缺失摘要|missing abstract|abstract unresolved|\bdropped\b)/i;
const SENTENCE_END_RE = /[.!?。！？)”’'"\]\)]$/;
const REQUIRED_HTML_MARKERS = [
  "今日必读",
  "观点聚类",
  "源健康",
  "金融分析",
  "社区讨论",
  "学术雷达",
];
const REQUIRED_A_SHARE_SECTORS = [
  "半导体",
  "AI / 算力",
  "大消费",
  "光通信",
  "机器人",
  "有色",
  "银行",
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function completeAbstract(value, language) {
  if (!nonEmpty(value) || PLACEHOLDER_RE.test(value)) return false;
  const text = value.trim();
  const minimum = language === "zh" ? 20 : 90;
  return text.length >= minimum && SENTENCE_END_RE.test(text);
}

function validateAcademic(report, html, errors) {
  const items = report.academic_radar?.items;
  requireCondition(Array.isArray(items), "academic_radar.items is missing", errors);
  if (!Array.isArray(items) || items.length === 0) return;

  const paperNumbers = new Set();
  for (const [index, item] of items.entries()) {
    const label = item.paper_no || `item ${index + 1}`;
    for (const field of [
      "paper_no",
      "title_en",
      "title_zh",
      "abstract_en",
      "abstract_zh",
      "why_this_matters",
    ]) {
      requireCondition(nonEmpty(item[field]), `${label} missing ${field}`, errors);
    }
    requireCondition(
      completeAbstract(item.abstract_en, "en"),
      `${label} has an incomplete English abstract`,
      errors,
    );
    requireCondition(
      completeAbstract(item.abstract_zh, "zh"),
      `${label} has an incomplete Chinese abstract`,
      errors,
    );
    requireCondition(
      !paperNumbers.has(item.paper_no),
      `duplicate academic paper number: ${item.paper_no}`,
      errors,
    );
    paperNumbers.add(item.paper_no);
    requireCondition(
      item.paper_no === `P${index + 1}`,
      `JSON academic numbering is not consecutive at ${item.paper_no}`,
      errors,
    );
  }

  const visibleNumbers = [...html.matchAll(/academic-paper-no">(P\d+)</g)].map(
    (match) => match[1],
  );
  requireCondition(
    visibleNumbers.length === items.length,
    `HTML academic count ${visibleNumbers.length} != JSON count ${items.length}`,
    errors,
  );
  visibleNumbers.forEach((paperNo, index) =>
    requireCondition(
      paperNo === `P${index + 1}`,
      `HTML academic numbering is not consecutive at ${paperNo}`,
      errors,
    ),
  );
}

function validateSources(root, report, html, sidecar, errors) {
  const health = report.source_health;
  requireCondition(health && Array.isArray(health.items), "source_health is missing", errors);
  if (!health || !Array.isArray(health.items)) return;

  const validStatuses = new Set(["ok", "empty", "failed"]);
  const byId = new Map(health.items.map((item) => [item.id, item]));
  for (const item of health.items) {
    requireCondition(validStatuses.has(item.status), `invalid source status: ${item.id}`, errors);
  }
  requireCondition(
    health.summary?.total === health.items.length,
    "source_health summary total does not match items",
    errors,
  );

  const locale = process.env.REPORT_LOCALE || "zh";
  const configured = readJson(path.join(root, "sources.config.json"));
  const expected = configured.filter(
    (source) =>
      source.enabled === true &&
      (!Array.isArray(source.locales) || source.locales.includes(locale)),
  );
  for (const source of expected) {
    requireCondition(byId.has(source.id), `enabled source missing from health: ${source.id}`, errors);
  }

  const articles = Array.isArray(sidecar?.articles) ? sidecar.articles : [];
  for (const source of ["weibo-hot", "zhihu-hot"]) {
    if (articles.some((article) => article.sourceId === source)) {
      const visibleName = source === "weibo-hot" ? "微博热搜" : "知乎热榜";
      requireCondition(html.includes(visibleName), `${visibleName} is missing from HTML`, errors);
    }
  }

  const serenity = articles.filter((article) => article.sourceId === "serenity-x");
  for (const item of serenity) {
    requireCondition(
      /^https:\/\/x\.com\/aleabitoreddit\/status\/\d+/.test(item.url || ""),
      `Serenity item is not an original status URL: ${item.url || "<missing>"}`,
      errors,
    );
  }
  if (serenity.length > 0) {
    requireCondition(/opinion|NFA/i.test(html), "Serenity safety label is missing", errors);
  }
}

function validateFinance(report, html, errors) {
  const finance = report.financial_analysis;
  requireCondition(finance && typeof finance === "object", "financial_analysis is missing", errors);
  if (!finance || typeof finance !== "object") return;

  requireCondition(nonEmpty(finance.trend_summary), "financial trend_summary is missing", errors);
  requireCondition(nonEmpty(finance.risk_caveat), "financial risk_caveat is missing", errors);
  requireCondition(
    Array.isArray(finance.a_share?.indices) && finance.a_share.indices.length > 0,
    "A-share indices are missing",
    errors,
  );
  const sectorNames = new Set(
    (finance.a_share?.sectors || []).map((item) => item.displayName),
  );
  for (const sector of REQUIRED_A_SHARE_SECTORS) {
    requireCondition(sectorNames.has(sector), `A-share sector is missing: ${sector}`, errors);
  }
  const usIndices = finance.us_market?.indices || [];
  const megacaps = finance.us_market?.megacaps || [];
  if (megacaps.length > 0) {
    requireCondition(usIndices.length > 0, "US megacaps exist but US indices are empty", errors);
  }
  if (usIndices.length > 0) {
    requireCondition(
      html.includes("S&P 500 ETF") || html.includes("Nasdaq 100 ETF"),
      "US broad-market labels are missing from HTML",
      errors,
    );
  }
}

function validateReportStage(root, date, errors) {
  requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(date), `invalid report date: ${date}`, errors);
  const dateDir = path.join(root, "daily_reports", date);
  const reportJson = path.join(dateDir, `${date}.json`);
  const reportHtml = path.join(dateDir, `${date}.html`);
  const sidecarJson = path.join(dateDir, `${date}-articles.json`);
  for (const file of [reportJson, reportHtml, sidecarJson]) {
    requireCondition(fs.existsSync(file), `required report artifact is missing: ${file}`, errors);
  }
  if (errors.length > 0) return null;

  const report = readJson(reportJson);
  const sidecar = readJson(sidecarJson);
  const html = fs.readFileSync(reportHtml, "utf8");
  requireCondition(html.includes(date), `HTML does not contain expected date ${date}`, errors);
  for (const marker of REQUIRED_HTML_MARKERS) {
    requireCondition(html.includes(marker), `HTML marker is missing: ${marker}`, errors);
  }
  requireCondition(
    Array.isArray(report.top_reads) && report.top_reads.length >= 1 && report.top_reads.length <= 7,
    "top_reads must contain 1-7 items",
    errors,
  );
  requireCondition(Array.isArray(report.finance_topics), "finance_topics is missing", errors);
  for (const topic of report.finance_topics || []) {
    requireCondition(nonEmpty(topic.signal), `finance topic ${topic.id} missing signal`, errors);
    requireCondition(nonEmpty(topic.risk), `finance topic ${topic.id} missing risk`, errors);
    requireCondition(Array.isArray(topic.items), `finance topic ${topic.id} missing items`, errors);
  }
  validateSources(root, report, html, sidecar, errors);
  validateFinance(report, html, errors);
  validateAcademic(report, html, errors);
  return { report, html, reportJson, reportHtml, sidecarJson };
}

function validateSiteStage(root, date, reportStage, errors) {
  const publishRoot = path.join(root, "public-dist");
  const files = [
    "index.html",
    "archive.html",
    "academic-feed.xml",
    "academic-feed.json",
    ".nojekyll",
    "_headers",
  ];
  for (const name of files) {
    requireCondition(
      fs.existsSync(path.join(publishRoot, name)),
      `publish artifact is missing: ${name}`,
      errors,
    );
  }
  if (errors.length > 0) return;

  const forbidden = [];
  for (const entry of fs.readdirSync(publishRoot, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const fullPath = path.join(entry.parentPath || entry.path, entry.name);
    const relative = path.relative(publishRoot, fullPath).replaceAll("\\", "/");
    if (/\/(?:\d{4}-\d{2}-\d{2})(?:-articles)?\.json$/.test(`/${relative}`)) {
      forbidden.push(relative);
    }
  }
  requireCondition(
    forbidden.length === 0,
    `private report artifacts leaked into public bundle: ${forbidden.join(", ")}`,
    errors,
  );

  const index = fs.readFileSync(path.join(publishRoot, "index.html"), "utf8");
  requireCondition(index.includes(date), `index.html is not current for ${date}`, errors);
  requireCondition(
    index === reportStage.html,
    "index.html is not an exact copy of the validated dated report",
    errors,
  );
  const feed = readJson(path.join(publishRoot, "academic-feed.json"));
  requireCondition(Array.isArray(feed.items), "academic-feed.json items are missing", errors);
  for (const item of feed.items || []) {
    requireCondition(nonEmpty(item.paper_no), "academic feed item missing paper_no", errors);
    requireCondition(!PLACEHOLDER_RE.test(JSON.stringify(item)), "academic feed contains placeholder text", errors);
  }
  const feedXml = fs.readFileSync(path.join(publishRoot, "academic-feed.xml"), "utf8");
  requireCondition(!PLACEHOLDER_RE.test(feedXml), "academic-feed.xml contains placeholder text", errors);
}

export function validatePublish({ root = process.cwd(), date, stage = "site" }) {
  const resolvedRoot = path.resolve(root);
  const errors = [];
  const reportStage = validateReportStage(resolvedRoot, date, errors);
  if (stage === "site" && reportStage) {
    validateSiteStage(resolvedRoot, date, reportStage, errors);
  }
  return { ok: errors.length === 0, date, stage, errors };
}

function parseArgs(argv) {
  const out = { root: process.cwd(), date: "", stage: "site" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root") out.root = argv[++i];
    else if (argv[i] === "--date") out.date = argv[++i];
    else if (argv[i] === "--stage") out.stage = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (!out.date) throw new Error("--date YYYY-MM-DD is required");
  if (!new Set(["report", "site"]).has(out.stage)) {
    throw new Error("--stage must be report or site");
  }
  return out;
}

const isDirect =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isDirect) {
  try {
    const result = validatePublish(parseArgs(process.argv.slice(2)));
    if (!result.ok) {
      console.error(`[publish-validation] FAILED (${result.stage}, ${result.date})`);
      result.errors.forEach((error) => console.error(`- ${error}`));
      process.exit(1);
    }
    console.log(`[publish-validation] OK (${result.stage}, ${result.date})`);
  } catch (error) {
    console.error(`[publish-validation] FAILED: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
