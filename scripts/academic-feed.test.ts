import assert from "node:assert/strict";

// @ts-ignore JS build helper is intentionally consumed by the Node site builder.
import { buildAcademicFeedDocuments } from "./academic-feed.mjs";

const item = {
  id: "https://doi.org/10.1000/new",
  title: "Laterally coupled photonic crystal surface emitting laser arrays",
  title_zh: "横向耦合的光子晶体表面发射激光器阵列",
  url: "https://doi.org/10.1000/new",
  source: "Crossref · Applied Physics Letters",
  summary: "We propose laterally coupled PCSEL arrays.",
  summary_zh: "我们提出横向耦合的 PCSEL 阵列。",
  authors: ["A. Researcher"],
  tags: ["PCSEL"],
  published_at: "2026-05-28T00:00:00.000Z",
  score: 12.4,
  priority: "must-read",
  action: "今日必看",
  relevance: "与当前 PCSEL 主线直接相关。",
  why_relevant: "为什么与你有关：\n- 可转化内容：适合变成仿真 case。",
  matched_terms: ["pcsel"],
  is_new: true,
  first_seen_date: "2026-05-29",
  report_date: "2026-05-29",
};

const docs = buildAcademicFeedDocuments({
  siteUrl: "https://dailybrief-feiyang.pages.dev",
  generatedAt: "2026-05-29T10:00:00.000Z",
  items: [item],
});

assert.match(docs.xml, /<rss/);
assert.match(docs.xml, /\[P1\]/);
assert.match(docs.xml, /\[NEW\] 横向耦合/);
assert.match(docs.xml, /我们提出横向耦合的 PCSEL 阵列/);
assert.match(docs.xml, /为什么与你有关/);
assert.match(docs.xml, /https:\/\/dailybrief-feiyang\.pages\.dev\/2026-05-29\/2026-05-29\.html/);

const parsed = JSON.parse(docs.json);
assert.equal(parsed.items.length, 1);
assert.equal(parsed.items[0].paper_no, "P1");
assert.equal(
  parsed.items[0].title_en,
  "Laterally coupled photonic crystal surface emitting laser arrays",
);
assert.equal(parsed.items[0].abstract_en, "We propose laterally coupled PCSEL arrays.");
assert.equal(parsed.items[0].abstract_zh, "我们提出横向耦合的 PCSEL 阵列。");
assert.match(parsed.items[0].why_this_matters, /为什么与你有关/);
assert.equal(parsed.items[0].is_new, true);
assert.equal(parsed.items[0].feed_url, "https://dailybrief-feiyang.pages.dev/academic-feed.xml");

const historicalDocs = buildAcademicFeedDocuments({
  siteUrl: "https://dailybrief-feiyang.pages.dev",
  generatedAt: "2026-05-31T10:00:00.000Z",
  items: [
    {
      ...item,
      id: "paper-a",
      paper_no: "P1",
      title: "A paper",
      title_zh: "A 论文",
      first_seen_date: "2026-05-31",
      report_date: "2026-05-31",
    },
    {
      ...item,
      id: "paper-b",
      paper_no: "P1",
      title: "B paper",
      title_zh: "B 论文",
      first_seen_date: "2026-05-30",
      report_date: "2026-05-30",
    },
  ],
});
const historicalParsed = JSON.parse(historicalDocs.json);
assert.deepEqual(
  historicalParsed.items.map((feedItem: { paper_no: string }) => feedItem.paper_no),
  ["P1", "P2"],
);
assert.match(historicalDocs.xml, /\[P1\]/);
assert.match(historicalDocs.xml, /\[P2\]/);

console.log("PASS academic feed");
