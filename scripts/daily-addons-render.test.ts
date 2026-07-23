import assert from "node:assert/strict";

import type { DailyReport } from "../lib/ai/pipeline";
import { renderHtml } from "../lib/output/render";

const report: DailyReport = {
  hero_headline: "DailyBrief addon render test",
  daily_overview: "Overview",
  tech_briefs: [],
  finance_briefs: [],
  politics_briefs: [],
  editor_note: "note",
  keywords: [],
  top_reads: [
    {
      rank: 1,
      category: "finance",
      title: "金融分析：A股风险偏好回升",
      source: "Macro Is Dead",
      url: "",
      reason: "A股放量上涨，AI/算力和半导体领涨。",
      score: 10,
    },
    {
      rank: 2,
      category: "academic",
      title: "P1 光子晶体激光器逆向设计",
      source: "arXiv",
      url: "https://example.com/paper",
      reason: "可转成 PCSEL / FDTD 验证 case。",
      score: 9,
    },
  ],
  finance_topics: [
    {
      id: "cpo-photonics",
      title: "CPO/光通信与硅光",
      count: 2,
      sources: ["Macro Is Dead"],
      tickers: ["AAOI", "SIVE"],
      signal:
        "观点信号集中在 CPO、CW 激光器和高速光模块需求，适合放入观察池。",
      risk:
        "这是财经博主观点聚合，不构成投资建议；需要用公司公告和财报验证。",
      items: [
        {
          title: "Macro Is Dead 讨论CPO激光链条风险",
          url: "https://x.com/aleabitoreddit/status/1",
          source: "Macro Is Dead",
          summary: "SIVE可能在CPO和CW激光器链条中形成瓶颈。",
          tickers: ["SIVE"],
        },
      ],
    },
  ],
  source_health: {
    generated_at: "2026-06-05T00:00:00.000Z",
    summary: {
      total: 3,
      ok: 2,
      empty: 1,
      failed: 0,
      articles: 20,
    },
    items: [
      {
        id: "weibo-hot",
        name: "微博热搜",
        category: "tech",
        subcategory: "cn-community",
        status: "ok",
        count: 10,
      },
      {
        id: "zhihu-hot",
        name: "知乎热榜",
        category: "tech",
        subcategory: "cn-community",
        status: "ok",
        count: 10,
      },
      {
        id: "linuxdo",
        name: "LinuxDo",
        category: "tech",
        subcategory: "cn-community",
        status: "empty",
        count: 0,
      },
    ],
  },
};

const html = renderHtml(report, { tech: [], finance: [], politics: [] }, "2026-06-05");

assert.match(html, /data-tab="top-reads"/);
assert.match(html, /今日必读/);
assert.match(html, /金融分析：A股风险偏好回升/);
assert.match(html, /data-sub="finance-topics"/);
assert.match(html, /观点聚类/);
assert.match(html, /CPO\/光通信与硅光/);
assert.match(html, /源健康/);
assert.match(html, /LinuxDo/);
assert.match(html, /空源/);

console.log("PASS daily addons render");
