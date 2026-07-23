import type { FinancialInstrumentDef } from "./types";

export const FINANCIAL_INSTRUMENTS: FinancialInstrumentDef[] = [
  // A-share broad market
  {
    id: "shanghai-composite",
    displayName: "上证指数",
    bucket: "a-index",
    symbols: ["000001.SS"],
    sinaSymbols: ["sh000001"],
  },
  {
    id: "shenzhen-component",
    displayName: "深证成指",
    bucket: "a-index",
    symbols: ["399001.SZ"],
    sinaSymbols: ["sz399001"],
  },
  {
    id: "chinext",
    displayName: "创业板指",
    bucket: "a-index",
    symbols: ["399006.SZ"],
    sinaSymbols: ["sz399006"],
  },
  {
    id: "csi-300",
    displayName: "沪深300",
    bucket: "a-index",
    symbols: ["000300.SS", "510300.SS"],
    sinaSymbols: ["sh000300", "sh510300"],
  },
  {
    id: "star-50",
    displayName: "科创50",
    bucket: "a-index",
    symbols: ["000688.SS", "588000.SS"],
    sinaSymbols: ["sh000688", "sh588000"],
  },

  // A-share sector proxies. These are representative ETFs/indices, not
  // official sector baskets; fallbacks keep the daily job robust if one
  // Yahoo symbol is temporarily unavailable.
  {
    id: "a-semiconductor",
    displayName: "半导体",
    bucket: "a-sector",
    symbols: ["512480.SS", "159995.SZ"],
    sinaSymbols: ["sh512480", "sz159995"],
  },
  {
    id: "a-ai-compute",
    displayName: "AI / 算力",
    bucket: "a-sector",
    symbols: ["159819.SZ", "515070.SS"],
    sinaSymbols: ["sz159819", "sh515070"],
  },
  {
    id: "a-consumption",
    displayName: "大消费",
    bucket: "a-sector",
    symbols: ["159928.SZ", "510630.SS"],
    sinaSymbols: ["sz159928", "sh510630"],
  },
  {
    id: "a-optical-communication",
    displayName: "光通信",
    bucket: "a-sector",
    symbols: ["515050.SS", "159994.SZ"],
    sinaSymbols: ["sh515050", "sz159994"],
  },
  {
    id: "a-robotics",
    displayName: "机器人",
    bucket: "a-sector",
    symbols: ["159770.SZ", "562500.SS"],
    sinaSymbols: ["sz159770", "sh562500"],
  },
  {
    id: "a-nonferrous",
    displayName: "有色",
    bucket: "a-sector",
    symbols: ["512400.SS", "159871.SZ"],
    sinaSymbols: ["sh512400", "sz159871"],
  },
  {
    id: "a-banks",
    displayName: "银行",
    bucket: "a-sector",
    symbols: ["512800.SS", "515290.SS"],
    sinaSymbols: ["sh512800", "sh515290"],
  },

  // US broad market + macro context
  {
    id: "sp500",
    displayName: "S&P 500 ETF",
    bucket: "us-index",
    symbols: ["SPY"],
    cnbcSymbols: ["SPY"],
    stooqSymbols: ["spy.us"],
  },
  {
    id: "nasdaq100",
    displayName: "Nasdaq 100 ETF",
    bucket: "us-index",
    symbols: ["QQQ"],
    cnbcSymbols: ["QQQ"],
    stooqSymbols: ["qqq.us"],
  },
  {
    id: "dow",
    displayName: "Dow Jones",
    bucket: "us-index",
    symbols: ["DIA", "^DJI"],
    cnbcSymbols: ["DIA"],
    stooqSymbols: ["dia.us"],
  },
  {
    id: "russell2000",
    displayName: "Russell 2000 ETF",
    bucket: "us-index",
    symbols: ["IWM"],
    cnbcSymbols: ["IWM"],
    stooqSymbols: ["iwm.us"],
  },
  {
    id: "vix",
    displayName: "VIXY 波动率ETF",
    bucket: "macro",
    symbols: ["^VIX"],
    stooqSymbols: ["vixy.us"],
  },
  {
    id: "us10y",
    displayName: "10Y 美债收益率",
    bucket: "macro",
    symbols: ["^TNX"],
    fredSeries: "DGS10",
  },
  {
    id: "dxy",
    displayName: "美元指数",
    bucket: "macro",
    symbols: ["DX-Y.NYB"],
    stooqSymbols: ["dx.f"],
  },

  // US mega-cap and AI infrastructure names
  { id: "nvda", displayName: "Nvidia", bucket: "us-megacap", symbols: ["NVDA"], cnbcSymbols: ["NVDA"], stooqSymbols: ["nvda.us"] },
  { id: "msft", displayName: "Microsoft", bucket: "us-megacap", symbols: ["MSFT"], cnbcSymbols: ["MSFT"], stooqSymbols: ["msft.us"] },
  { id: "aapl", displayName: "Apple", bucket: "us-megacap", symbols: ["AAPL"], cnbcSymbols: ["AAPL"], stooqSymbols: ["aapl.us"] },
  { id: "googl", displayName: "Alphabet", bucket: "us-megacap", symbols: ["GOOGL"], cnbcSymbols: ["GOOGL"], stooqSymbols: ["googl.us"] },
  { id: "meta", displayName: "Meta", bucket: "us-megacap", symbols: ["META"], cnbcSymbols: ["META"], stooqSymbols: ["meta.us"] },
  { id: "amzn", displayName: "Amazon", bucket: "us-megacap", symbols: ["AMZN"], cnbcSymbols: ["AMZN"], stooqSymbols: ["amzn.us"] },
  { id: "tsla", displayName: "Tesla", bucket: "us-megacap", symbols: ["TSLA"], cnbcSymbols: ["TSLA"], stooqSymbols: ["tsla.us"] },
  { id: "avgo", displayName: "Broadcom", bucket: "us-megacap", symbols: ["AVGO"], cnbcSymbols: ["AVGO"], stooqSymbols: ["avgo.us"] },
  { id: "amd", displayName: "AMD", bucket: "us-megacap", symbols: ["AMD"], cnbcSymbols: ["AMD"], stooqSymbols: ["amd.us"] },
  { id: "smci", displayName: "Super Micro", bucket: "us-megacap", symbols: ["SMCI"], cnbcSymbols: ["SMCI"], stooqSymbols: ["smci.us"] },
  { id: "tsm", displayName: "TSMC", bucket: "us-megacap", symbols: ["TSM"], cnbcSymbols: ["TSM"], stooqSymbols: ["tsm.us"] },
  { id: "asml", displayName: "ASML", bucket: "us-megacap", symbols: ["ASML"], cnbcSymbols: ["ASML"], stooqSymbols: ["asml.us"] },
];
