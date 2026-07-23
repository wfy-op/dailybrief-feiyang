import fs from "node:fs";
import path from "node:path";

const DEFAULT_SITE_URL =
  process.env.DAILYBRIEF_PUBLIC_URL || "https://dailybrief-feiyang.pages.dev";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value) {
  return `<![CDATA[${String(value ?? "").replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

function absoluteUrl(siteUrl, href) {
  try {
    return new URL(href, siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`).toString();
  } catch {
    return href;
  }
}

function itemDate(item) {
  return (
    item.first_seen_date ||
    item.report_date ||
    (item.published_at ? String(item.published_at).slice(0, 10) : "")
  );
}

function pubDate(item) {
  const d = itemDate(item);
  const parsed = d ? new Date(`${d}T00:00:00Z`) : new Date();
  return Number.isFinite(parsed.getTime())
    ? parsed.toUTCString()
    : new Date().toUTCString();
}

function reportUrl(siteUrl, item) {
  const date = item.report_date || itemDate(item);
  return date
    ? absoluteUrl(siteUrl, `${date}/${date}.html`)
    : absoluteUrl(siteUrl, "index.html");
}

function paperNo(index) {
  return `P${index + 1}`;
}

function titleEn(item) {
  return item.title_en || item.title || "";
}

function abstractEn(item) {
  return item.abstract_en || item.summary || "";
}

function abstractZh(item) {
  return item.abstract_zh || item.summary_zh || abstractEn(item);
}

function whyThisMatters(item) {
  return item.why_this_matters || item.why_relevant || item.relevance || "";
}

function normalizeFeedItem(item, globalPaperNo) {
  const normalizedTitleEn = titleEn(item);
  const normalizedAbstractEn = abstractEn(item);
  const normalizedAbstractZh = abstractZh(item);
  const normalizedWhy = whyThisMatters(item);
  return {
    ...item,
    paper_no: globalPaperNo,
    title: normalizedTitleEn,
    title_en: normalizedTitleEn,
    title_zh: item.title_zh || normalizedTitleEn,
    summary: normalizedAbstractEn,
    abstract_en: normalizedAbstractEn,
    summary_zh: normalizedAbstractZh,
    abstract_zh: normalizedAbstractZh,
    why_relevant: normalizedWhy,
    why_this_matters: normalizedWhy,
  };
}

function feedItemJson(siteUrl, item) {
  return {
    id: item.id,
    paper_no: item.paper_no,
    title: item.title,
    title_en: item.title_en,
    title_zh: item.title_zh,
    url: item.url,
    source: item.source,
    abstract_en: item.abstract_en,
    abstract_zh: item.abstract_zh,
    summary_zh: item.summary_zh,
    summary: item.summary,
    why_this_matters: item.why_this_matters,
    why_relevant: item.why_relevant,
    priority: item.priority,
    score: item.score,
    is_new: item.is_new === true,
    first_seen_date: item.first_seen_date,
    published_at: item.published_at,
    report_date: item.report_date,
    report_url: reportUrl(siteUrl, item),
    feed_url: absoluteUrl(siteUrl, "academic-feed.xml"),
  };
}

function rssItem(siteUrl, item) {
  const title = `${item.paper_no ? `[${item.paper_no}] ` : ""}${item.is_new ? "[NEW] " : ""}${item.title_zh || item.title_en || item.title}`;
  const link = reportUrl(siteUrl, item);
  const description = [
    item.paper_no ? `<p><strong>日报编号：</strong>${escapeXml(item.paper_no)}</p>` : "",
    `<p><strong>中文摘要：</strong>${escapeXml(item.abstract_zh || item.summary_zh || "")}</p>`,
    item.abstract_en || item.summary
      ? `<p><strong>英文摘要：</strong>${escapeXml(item.abstract_en || item.summary)}</p>`
      : "",
    item.why_this_matters || item.why_relevant
      ? `<p><strong>为什么与你有关：</strong><br>${escapeXml(item.why_this_matters || item.why_relevant).replace(/\n/g, "<br>")}</p>`
      : "",
    `<p><a href="${escapeXml(item.url)}">论文链接</a></p>`,
  ]
    .filter(Boolean)
    .join("");

  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(item.id || item.url || title)}</guid>
      <pubDate>${escapeXml(pubDate(item))}</pubDate>
      <source>${escapeXml(item.source || "DailyBrief Academic Radar")}</source>
      <description>${cdata(description)}</description>
    </item>`;
}

export function buildAcademicFeedDocuments({
  siteUrl = DEFAULT_SITE_URL,
  generatedAt = new Date().toISOString(),
  items,
}) {
  const normalizedSiteUrl = siteUrl.replace(/\/$/, "");
  const feedUrl = absoluteUrl(normalizedSiteUrl, "academic-feed.xml");
  const sortedItems = [...items]
    .sort((a, b) => {
      if ((b.is_new === true) !== (a.is_new === true)) {
        return b.is_new === true ? 1 : -1;
      }
      return itemDate(b).localeCompare(itemDate(a));
    })
    .slice(0, 50);
  const numberedItems = sortedItems.map((item, index) =>
    normalizeFeedItem(item, paperNo(index)),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>DailyBrief Academic Radar</title>
    <link>${escapeXml(normalizedSiteUrl)}</link>
    <description>Latest PCSEL, nanophotonics, simulation, and AI-for-photonics papers detected by DailyBrief.</description>
    <language>zh-CN</language>
    <lastBuildDate>${escapeXml(new Date(generatedAt).toUTCString())}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>
${numberedItems.map((item) => rssItem(normalizedSiteUrl, item)).join("\n")}
  </channel>
</rss>
`;

  const json = JSON.stringify(
    {
      version: 1,
      title: "DailyBrief Academic Radar",
      generated_at: generatedAt,
      site_url: normalizedSiteUrl,
      feed_url: feedUrl,
      items: numberedItems.map((item) => feedItemJson(normalizedSiteUrl, item)),
    },
    null,
    2,
  );

  return { xml, json };
}

export function collectAcademicFeedItems(root) {
  const dates = fs
    .readdirSync(root)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .filter((d) => fs.existsSync(path.join(root, d, `${d}.json`)))
    .sort((a, b) => b.localeCompare(a));

  const seen = new Set();
  const out = [];
  for (const date of dates) {
    const reportPath = path.join(root, date, `${date}.json`);
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      const items = report?.academic_radar?.items ?? [];
      for (const [index, item] of items.entries()) {
        const key = String(item.id || item.url || item.title || "").toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const { paper_no: _dailyPaperNo, ...rest } = item;
        out.push({ ...rest, report_date: date });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[academic-feed] skipped ${reportPath}: ${msg}`);
    }
  }
  return out;
}

export function writeAcademicFeeds(
  sourceRoot,
  siteUrl = DEFAULT_SITE_URL,
  outputRoot = sourceRoot,
) {
  const items = collectAcademicFeedItems(sourceRoot);
  const docs = buildAcademicFeedDocuments({
    siteUrl,
    generatedAt: new Date().toISOString(),
    items,
  });
  fs.mkdirSync(outputRoot, { recursive: true });
  fs.writeFileSync(path.join(outputRoot, "academic-feed.xml"), docs.xml, "utf8");
  fs.writeFileSync(path.join(outputRoot, "academic-feed.json"), docs.json, "utf8");
  console.log(`[academic-feed] academic-feed.{xml,json} (${items.length} papers)`);
  return { count: items.length };
}
