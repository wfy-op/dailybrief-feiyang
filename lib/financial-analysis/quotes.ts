import type {
  FinancialInstrumentDef,
  FinancialInstrumentSnapshot,
} from "./types";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://finance.sina.com.cn/",
} as const;

export async function fetchFallbackQuote(
  def: FinancialInstrumentDef,
): Promise<FinancialInstrumentSnapshot | null> {
  for (const code of def.sinaSymbols ?? []) {
    const kline = await tryFallbackQuote(def, code, "Sina KLine", () =>
      fetchSinaKlineQuote(def, code),
    );
    if (kline) return kline;
    const quote = await tryFallbackQuote(def, code, "Sina quote", () =>
      fetchSinaQuote(def, code),
    );
    if (quote) return quote;
  }
  for (const code of def.cnbcSymbols ?? []) {
    const quote = await tryFallbackQuote(def, code, "CNBC", () =>
      fetchCnbcQuote(def, code),
    );
    if (quote) return quote;
  }
  for (const code of def.stooqSymbols ?? []) {
    const quote = await tryFallbackQuote(def, code, "Stooq", () =>
      fetchStooqQuote(def, code),
    );
    if (quote) return quote;
  }
  if (def.fredSeries) {
    const quote = await tryFallbackQuote(def, def.fredSeries, "FRED", () =>
      fetchFredSeries(def),
    );
    if (quote) return quote;
  }
  return null;
}

async function tryFallbackQuote(
  def: FinancialInstrumentDef,
  code: string,
  source: string,
  load: () => Promise<FinancialInstrumentSnapshot | null>,
): Promise<FinancialInstrumentSnapshot | null> {
  try {
    return await load();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[financial-analysis] ${def.displayName} ${source} ${code} failed: ${msg}`);
    return null;
  }
}

export async function fetchSinaKlineQuote(
  def: FinancialInstrumentDef,
  code: string,
): Promise<FinancialInstrumentSnapshot | null> {
  const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketDataService.getKLineData?symbol=${encodeURIComponent(code)}&scale=240&ma=no&datalen=20`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return parseSinaKlineJson(def, code, await res.text());
}

export function parseSinaKlineJson(
  def: FinancialInstrumentDef,
  code: string,
  json: string,
): FinancialInstrumentSnapshot | null {
  let rows: Array<{ day?: string; close?: string }> = [];
  try {
    rows = JSON.parse(json) as Array<{ day?: string; close?: string }>;
  } catch {
    return null;
  }
  const closes = rows
    .map((row) => ({
      day: row.day ?? "",
      close: num(row.close),
    }))
    .filter((row) => row.day && row.close > 0);
  if (closes.length < 2) return null;
  const latest = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  const fiveBack = closes[Math.max(0, closes.length - 6)];
  const pct1Day = ((latest.close - prev.close) / prev.close) * 100;
  const pct5Day = ((latest.close - fiveBack.close) / fiveBack.close) * 100;
  return {
    id: def.id,
    symbol: code,
    displayName: def.displayName,
    bucket: def.bucket,
    price: latest.close,
    currency: "CNY",
    exchangeName: code.startsWith("sh") ? "SSE/Sina KLine" : "SZSE/Sina KLine",
    marketDate: latest.day,
    pct1Day,
    pct5Day,
    trend: classifyTrend(pct1Day),
    rsi14: null,
    signals: buildSignals(pct1Day),
  };
}

export async function fetchSinaQuote(
  def: FinancialInstrumentDef,
  code: string,
): Promise<FinancialInstrumentSnapshot | null> {
  const url = `https://hq.sinajs.cn/list=${encodeURIComponent(code)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  const body = new TextDecoder("gb18030").decode(await res.arrayBuffer());
  return parseSinaQuoteLine(def, code, body);
}

export function parseSinaQuoteLine(
  def: FinancialInstrumentDef,
  code: string,
  line: string,
): FinancialInstrumentSnapshot | null {
  const m = line.match(/="([^"]*)"/);
  if (!m) return null;
  const parts = m[1].split(",");
  if (parts.length < 32 || !parts[0]) return null;
  const prevClose = num(parts[2]);
  const close = num(parts[3]);
  if (!prevClose || !close) return null;
  const pct1Day = ((close - prevClose) / prevClose) * 100;
  const date = parts[30] || new Date().toISOString().slice(0, 10);
  return {
    id: def.id,
    symbol: code,
    displayName: def.displayName,
    bucket: def.bucket,
    price: close,
    currency: "CNY",
    exchangeName: code.startsWith("sh") ? "SSE/Sina" : "SZSE/Sina",
    marketDate: date,
    pct1Day,
    pct5Day: pct1Day,
    trend: classifyTrend(pct1Day),
    rsi14: null,
    signals: buildSignals(pct1Day),
  };
}

export async function fetchStooqQuote(
  def: FinancialInstrumentDef,
  code: string,
): Promise<FinancialInstrumentSnapshot | null> {
  const url = `https://stooq.com/q/l/?s=${encodeURIComponent(code)}&f=sd2t2ohlcvp&h&e=csv`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return parseStooqQuoteCsv(def, code, await res.text());
}

export async function fetchCnbcQuote(
  def: FinancialInstrumentDef,
  code: string,
): Promise<FinancialInstrumentSnapshot | null> {
  const url = `https://quote.cnbc.com/quote-html-webservice/quote.htm?symbols=${encodeURIComponent(code)}&requestMethod=quick&noform=1&partnerId=2&fund=1&exthrs=0&output=json`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return parseCnbcQuoteJson(def, code, await res.text());
}

export function parseCnbcQuoteJson(
  def: FinancialInstrumentDef,
  code: string,
  json: string,
): FinancialInstrumentSnapshot | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  const quote = extractCnbcQuote(data, code);
  if (!quote) return null;

  const price = num(quote.last) || num(quote.todays_closing);
  const prevClose = num(quote.previous_day_closing) || num(quote.prev_prev_closing);
  const pct = num(quote.change_pct);
  if (!price || (!pct && !prevClose)) return null;
  const pct1Day = pct || ((price - prevClose) / prevClose) * 100;
  const date = (quote.reg_last_time || quote.last_time || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return {
    id: def.id,
    symbol: quote.symbol || code,
    displayName: def.displayName,
    bucket: def.bucket,
    price,
    currency: quote.currencyCode || "USD",
    exchangeName: quote.exchange ? `CNBC/${quote.exchange}` : "CNBC",
    marketDate: date,
    pct1Day,
    pct5Day: pct1Day,
    trend: classifyTrend(pct1Day),
    rsi14: null,
    signals: buildSignals(pct1Day),
  };
}

export function parseStooqQuoteCsv(
  def: FinancialInstrumentDef,
  code: string,
  csv: string,
): FinancialInstrumentSnapshot | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2 || /N\/D/.test(lines[1])) return null;
  const parts = lines[1].split(",");
  if (parts.length < 9) return null;
  const symbol = parts[0] || code;
  const date = parts[1] || new Date().toISOString().slice(0, 10);
  const close = num(parts[6]);
  const prevClose = num(parts[8]);
  if (!close || !prevClose) return null;
  const pct1Day = ((close - prevClose) / prevClose) * 100;
  return {
    id: def.id,
    symbol,
    displayName: def.displayName,
    bucket: def.bucket,
    price: close,
    currency: "USD",
    exchangeName: "Stooq",
    marketDate: date,
    pct1Day,
    pct5Day: pct1Day,
    trend: classifyTrend(pct1Day),
    rsi14: null,
    signals: buildSignals(pct1Day),
  };
}

function extractCnbcQuote(
  data: unknown,
  code: string,
): Record<string, string> | null {
  if (!data || typeof data !== "object") return null;
  const result = (data as { QuickQuoteResult?: { QuickQuote?: unknown } }).QuickQuoteResult?.QuickQuote;
  const quotes = Array.isArray(result) ? result : result ? [result] : [];
  for (const item of quotes) {
    if (!item || typeof item !== "object") continue;
    const quote = item as Record<string, string>;
    if (!quote.symbol || quote.symbol.toUpperCase() === code.toUpperCase()) return quote;
  }
  return null;
}

export async function fetchFredSeries(
  def: FinancialInstrumentDef,
): Promise<FinancialInstrumentSnapshot | null> {
  if (!def.fredSeries) return null;
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(def.fredSeries)}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) return null;
  return parseFredCsv(def, await res.text());
}

export function parseFredCsv(
  def: FinancialInstrumentDef,
  csv: string,
): FinancialInstrumentSnapshot | null {
  const rows = csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.split(","))
    .filter((parts) => parts.length >= 2 && parts[1] !== ".");
  if (rows.length < 2) return null;
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const close = num(latest[1]);
  const prevClose = num(prev[1]);
  if (!close || !prevClose) return null;
  const pct1Day = ((close - prevClose) / prevClose) * 100;
  return {
    id: def.id,
    symbol: def.fredSeries ?? def.symbols[0] ?? def.id,
    displayName: def.displayName,
    bucket: def.bucket,
    price: close,
    currency: "%",
    exchangeName: "FRED",
    marketDate: latest[0],
    pct1Day,
    pct5Day: pct1Day,
    trend: classifyTrend(pct1Day),
    rsi14: null,
    signals: buildSignals(pct1Day),
  };
}

function num(s: string | undefined): number {
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function classifyTrend(
  pct1Day: number,
): FinancialInstrumentSnapshot["trend"] {
  if (pct1Day >= 0.3) return "bullish";
  if (pct1Day <= -0.3) return "bearish";
  return "neutral";
}

function buildSignals(pct1Day: number): string[] {
  if (pct1Day >= 2) return ["单日强势上涨"];
  if (pct1Day <= -2) return ["单日明显回落"];
  return [];
}
