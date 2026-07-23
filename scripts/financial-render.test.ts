import assert from "node:assert/strict";

import type { DailyReport } from "../lib/ai/pipeline";
import { buildFinancialAnalysis } from "../lib/financial-analysis";
import type { FinancialInstrumentSnapshot } from "../lib/financial-analysis/types";
import { renderHtml, renderMarkdown } from "../lib/output/render";

const snapshot = (
  id: string,
  displayName: string,
  bucket: FinancialInstrumentSnapshot["bucket"],
  pct1Day: number,
): FinancialInstrumentSnapshot => ({
  id,
  symbol: id,
  displayName,
  bucket,
  price: 100,
  currency: "USD",
  exchangeName: "TEST",
  marketDate: "2026-05-25",
  pct1Day,
  pct5Day: pct1Day,
  trend: pct1Day >= 0 ? "bullish" : "bearish",
  rsi14: 55,
  signals: [],
});

const report: DailyReport = {
  hero_headline: "测试头条",
  daily_overview: "测试总览",
  tech_briefs: [],
  finance_briefs: [],
  politics_briefs: [],
  editor_note: "测试短评",
  keywords: ["金融分析"],
  financial_analysis: buildFinancialAnalysis({
    generatedAt: "2026-05-26T00:00:00.000Z",
    instruments: [
      snapshot("000001.SS", "上证指数", "a-index", 0.6),
      snapshot("semi", "半导体", "a-sector", 2.1),
      snapshot("bank", "银行", "a-sector", -1.2),
      snapshot("SPY", "S&P 500 ETF", "us-index", 0.4),
      snapshot("NVDA", "Nvidia", "us-megacap", 3.2),
      snapshot("^VIX", "VIX", "macro", -4.0),
    ],
  }),
};

const html = renderHtml(
  report,
  {
    tech: [],
    finance: [
      {
        id: "news",
        name: "财经新闻",
        sources: [
          {
            sourceId: "_merged",
            sourceName: "财经新闻",
            merged: true,
            items: [
              {
                sourceId: "finance-test",
                source: "Finance Test",
                title: "财经新闻测试",
                url: "https://example.com/finance",
                excerpt: "测试财经新闻摘要",
                category: "finance",
              },
            ],
          },
        ],
      },
    ],
    politics: [],
  },
  "2026-05-26",
);
assert.match(html, /金融分析/);
assert.match(html, /data-financial-column="a-share"/);
assert.match(html, /data-financial-column="us-market"/);
assert.match(html, /A股市场/);
assert.match(html, /美股市场/);
assert.match(html, /A股复盘/);
assert.match(html, /美股重点公司/);
assert.match(html, /走势总结/);
assert.match(html, /后续趋势/);
assert.match(html, /半导体/);
assert.match(html, /Nvidia/);
assert.doesNotMatch(html, /data-tab="financial"/);
assert.doesNotMatch(html, /data-panel="financial"/);
assert.match(html, /data-tab="finance"/);
assert.match(html, /data-panel="finance"/);
assert.match(html, /财经新闻测试/);
assert.ok(
  html.indexOf("金融分析") < html.indexOf("财经新闻测试"),
  "merged finance panel should render financial analysis before raw finance items",
);
assert.match(html, /data-sub="financial-analysis"/);
assert.ok(
  html.indexOf('data-sub="financial-analysis"') <
    html.indexOf("财经新闻测试"),
  "finance sub-tabs should render before raw finance articles",
);
assert.ok(
  html.indexOf('data-financial-column="a-share"') <
    html.indexOf('data-financial-column="us-market"'),
  "A-share column should render before US-market column",
);

const markdown = renderMarkdown(report, "2026-05-26");
assert.match(markdown, /金融分析/);
assert.match(markdown, /A股市场/);
assert.match(markdown, /美股市场/);
assert.match(markdown, /A股板块/);
assert.match(markdown, /美股重点公司/);
assert.match(markdown, /走势总结/);
assert.match(markdown, /后续趋势/);

console.log("PASS financial render");
