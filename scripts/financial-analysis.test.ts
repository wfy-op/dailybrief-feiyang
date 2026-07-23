import assert from "node:assert/strict";

import {
  FINANCIAL_INSTRUMENTS,
  buildFinancialAnalysis,
} from "../lib/financial-analysis";
import {
  parseSinaKlineJson,
  fetchFallbackQuote,
  parseCnbcQuoteJson,
  parseFredCsv,
  parseSinaQuoteLine,
  parseStooqQuoteCsv,
} from "../lib/financial-analysis/quotes";
import type { FinancialInstrumentSnapshot } from "../lib/financial-analysis/types";

const bucketNames = (bucket: string) =>
  FINANCIAL_INSTRUMENTS.filter((it) => it.bucket === bucket).map(
    (it) => it.displayName,
  );

assert.deepEqual(bucketNames("a-sector"), [
  "半导体",
  "AI / 算力",
  "大消费",
  "光通信",
  "机器人",
  "有色",
  "银行",
]);

assert(bucketNames("us-megacap").includes("Nvidia"));
assert(bucketNames("us-megacap").includes("Microsoft"));
assert(bucketNames("us-megacap").includes("Apple"));

const snapshot = (
  id: string,
  displayName: string,
  bucket: FinancialInstrumentSnapshot["bucket"],
  pct1Day: number,
  pct5Day = pct1Day,
): FinancialInstrumentSnapshot => ({
  id,
  symbol: id,
  displayName,
  bucket,
  price: 100,
  currency: "CNY",
  exchangeName: "TEST",
  marketDate: "2026-05-25",
  pct1Day,
  pct5Day,
  trend: pct1Day >= 0 ? "bullish" : "bearish",
  rsi14: 55,
  signals: [],
});

const analysis = buildFinancialAnalysis({
  generatedAt: "2026-05-26T00:00:00.000Z",
  instruments: [
    snapshot("000001.SS", "上证指数", "a-index", 0.6),
    snapshot("399006.SZ", "创业板指", "a-index", -0.8),
    snapshot("semi", "半导体", "a-sector", 2.1),
    snapshot("bank", "银行", "a-sector", -1.2),
    snapshot("SPY", "S&P 500 ETF", "us-index", 0.4),
    snapshot("QQQ", "Nasdaq 100 ETF", "us-index", 1.0),
    snapshot("NVDA", "Nvidia", "us-megacap", 3.2),
    snapshot("TSLA", "Tesla", "us-megacap", -2.5),
    snapshot("^VIX", "VIX", "macro", -4.0),
  ],
});

assert.equal(analysis.a_share.indices.length, 2);
assert.equal(analysis.a_share.sectors[0].displayName, "半导体");
assert.equal(analysis.a_share.sectors.at(-1)?.displayName, "银行");
assert.equal(analysis.us_market.megacaps[0].displayName, "Nvidia");
assert.match(analysis.overview, /A股/);
assert.match(analysis.overview, /美股/);
assert(analysis.cross_market.length >= 2);
assert.match(analysis.trend_summary, /昨日/);
assert.match(analysis.outlook.a_share, /后续/);
assert.match(analysis.outlook.us_market, /后续/);
assert.match(analysis.outlook.key_sectors, /半导体/);
assert.match(analysis.outlook.megacaps, /Nvidia/);
assert(analysis.outlook.scenarios.length >= 3);
assert(analysis.outlook.scenarios.some((s) => /基准/.test(s)));

const sina = parseSinaQuoteLine(
  {
    id: "shanghai-composite",
    displayName: "上证指数",
    bucket: "a-index",
    symbols: ["000001.SS"],
  },
  "sh000001",
  'var hq_str_sh000001="上证指数,4137.3196,4152.5686,4121.2548,4140.4975,4108.0115,0,0,418806215,951556426483,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2026-05-26,11:24:14,00,";',
);
assert(sina);
assert.equal(sina.displayName, "上证指数");
assert.equal(sina.marketDate, "2026-05-26");
assert.equal(Number(sina.pct1Day.toFixed(2)), -0.75);

const sinaKline = parseSinaKlineJson(
  {
    id: "shanghai-composite",
    displayName: "上证指数",
    bucket: "a-index",
    symbols: ["000001.SS"],
    sinaSymbols: ["sh000001"],
  },
  "sh000001",
  JSON.stringify([
    { day: "2026-05-19", close: "4169.538" },
    { day: "2026-05-20", close: "4162.185" },
    { day: "2026-05-21", close: "4077.277" },
    { day: "2026-05-22", close: "4112.900" },
    { day: "2026-05-25", close: "4152.569" },
  ]),
);
assert(sinaKline);
assert.equal(sinaKline.marketDate, "2026-05-25");
assert.equal(Number(sinaKline.pct1Day.toFixed(2)), 0.96);
assert.equal(Number(sinaKline.pct5Day.toFixed(2)), -0.41);

const stooq = parseStooqQuoteCsv(
  {
    id: "sp500",
    displayName: "S&P 500 ETF",
    bucket: "us-index",
    symbols: ["SPY"],
  },
  "spy.us",
  [
    "Symbol,Date,Time,Open,High,Low,Close,Volume,Prev",
    "SPY.US,2026-05-22,22:00:21,746.24,748.94,744.48,745.64,41762006,742.72",
  ].join("\n"),
);
assert(stooq);
assert.equal(stooq.symbol, "SPY.US");
assert.equal(stooq.marketDate, "2026-05-22");
assert.equal(Number(stooq.pct1Day.toFixed(2)), 0.39);

const cnbc = parseCnbcQuoteJson(
  {
    id: "sp500",
    displayName: "S&P 500 ETF",
    bucket: "us-index",
    symbols: ["SPY"],
    cnbcSymbols: ["SPY"],
  },
  "SPY",
  JSON.stringify({
    QuickQuoteResult: {
      QuickQuote: [
        {
          symbol: "SPY",
          last: "737.55",
          change_pct: "-2.5809",
          previous_day_closing: "757.09",
          last_time: "2026-06-05T16:10:00.000-0400",
          exchange: "NYSE Arca",
          currencyCode: "USD",
        },
      ],
    },
  }),
);
assert(cnbc);
assert.equal(cnbc.symbol, "SPY");
assert.equal(cnbc.marketDate, "2026-06-05");
assert.equal(cnbc.exchangeName, "CNBC/NYSE Arca");
assert.equal(Number(cnbc.pct1Day.toFixed(2)), -2.58);
assert.deepEqual(cnbc.signals, ["单日明显回落"]);

const fred = parseFredCsv(
  {
    id: "us10y",
    displayName: "10Y 美债收益率",
    bucket: "macro",
    symbols: ["^TNX"],
    fredSeries: "DGS10",
  },
  ["observation_date,DGS10", "2026-05-20,4.57", "2026-05-21,4.61"].join("\n"),
);
assert(fred);
assert.equal(fred.marketDate, "2026-05-21");
assert.equal(fred.price, 4.61);
assert.equal(Number(fred.pct1Day.toFixed(2)), 0.88);

async function testFallbackNetworkErrorsAreNonFatal() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  try {
    const fallback = await fetchFallbackQuote({
      id: "network-failure",
      displayName: "Network Failure",
      bucket: "a-index",
      symbols: ["000001.SS"],
      sinaSymbols: ["sh000001"],
      stooqSymbols: ["spy.us"],
      fredSeries: "DGS10",
    });
    assert.equal(fallback, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function main() {
  await testFallbackNetworkErrorsAreNonFatal();
  console.log("PASS financial analysis");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
