export type FinancialBucket =
  | "a-index"
  | "a-sector"
  | "us-index"
  | "us-megacap"
  | "macro";

export interface FinancialInstrumentDef {
  id: string;
  displayName: string;
  bucket: FinancialBucket;
  /** Yahoo Finance symbols, tried in order until one returns usable data. */
  symbols: string[];
  /** Sina Finance symbols for mainland China instruments, e.g. sh000001. */
  sinaSymbols?: string[];
  /** Stooq quote symbols for US/global instruments, e.g. spy.us. */
  stooqSymbols?: string[];
  /** CNBC quote symbols for US equities/ETFs, e.g. SPY. */
  cnbcSymbols?: string[];
  /** FRED time-series id for macro series, e.g. DGS10. */
  fredSeries?: string;
  note?: string;
}

export interface FinancialInstrumentSnapshot {
  id: string;
  symbol: string;
  displayName: string;
  bucket: FinancialBucket;
  price: number;
  currency: string;
  exchangeName: string;
  marketDate: string;
  pct1Day: number;
  pct5Day: number;
  trend: "bullish" | "bearish" | "neutral";
  rsi14: number | null;
  signals: string[];
}

export interface FinancialAnalysisSection {
  generated_at: string;
  market_date: string;
  overview: string;
  trend_summary: string;
  a_share: {
    overview: string;
    indices: FinancialInstrumentSnapshot[];
    sectors: FinancialInstrumentSnapshot[];
    strongest_sectors: FinancialInstrumentSnapshot[];
    weakest_sectors: FinancialInstrumentSnapshot[];
  };
  us_market: {
    overview: string;
    indices: FinancialInstrumentSnapshot[];
    megacaps: FinancialInstrumentSnapshot[];
    leading_megacaps: FinancialInstrumentSnapshot[];
    lagging_megacaps: FinancialInstrumentSnapshot[];
  };
  cross_market: string[];
  outlook: {
    a_share: string;
    us_market: string;
    key_sectors: string;
    megacaps: string;
    scenarios: string[];
  };
  risk_caveat: string;
  instruments: FinancialInstrumentSnapshot[];
}
