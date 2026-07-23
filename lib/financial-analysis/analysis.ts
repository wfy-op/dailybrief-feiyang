import { last, rsi as rsiFn } from "../trading/indicators";
import { fetchTickerData, type TickerRawData } from "../trading/yahoo";
import { FINANCIAL_INSTRUMENTS } from "./instruments";
import { fetchFallbackQuote } from "./quotes";
import type {
  FinancialAnalysisSection,
  FinancialBucket,
  FinancialInstrumentDef,
  FinancialInstrumentSnapshot,
} from "./types";

export async function fetchFinancialSnapshots(
  instruments: FinancialInstrumentDef[] = FINANCIAL_INSTRUMENTS,
): Promise<FinancialInstrumentSnapshot[]> {
  const results = await Promise.all(
    instruments.map(async (def) => {
      const fallback = await fetchFallbackQuote(def);
      if (fallback) return fallback;
      for (const symbol of def.symbols) {
        try {
          const raw = await fetchTickerData(symbol);
          if (!raw || raw.candles.length < 2) continue;
          return snapshotFromRaw(def, symbol, raw);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.warn(`[financial-analysis] ${symbol} failed: ${msg}`);
        }
      }
      console.warn(
        `[financial-analysis] ${def.displayName} returned no usable data`,
      );
      return null;
    }),
  );
  return results.filter((x): x is FinancialInstrumentSnapshot => x !== null);
}

export function snapshotFromRaw(
  def: FinancialInstrumentDef,
  symbol: string,
  raw: TickerRawData,
): FinancialInstrumentSnapshot {
  const candles = raw.candles;
  const latest = candles[candles.length - 1];
  const closes = candles.map((c) => c.close);
  const price = raw.regularMarketPrice || latest.close;
  const prev1 = candles[candles.length - 2]?.close;
  const prev5 = candles[candles.length - 6]?.close;
  const pct1Day = prev1 ? ((price - prev1) / prev1) * 100 : 0;
  const pct5Day = prev5 ? ((price - prev5) / prev5) * 100 : pct1Day;
  const rsi14 = last(rsiFn(closes, 14)) ?? null;
  const trend = classifyTrend(pct1Day, pct5Day);
  return {
    id: def.id,
    symbol: raw.symbol || symbol,
    displayName: def.displayName,
    bucket: def.bucket,
    price,
    currency: raw.currency,
    exchangeName: raw.exchangeName,
    marketDate: latest.date.toISOString().slice(0, 10),
    pct1Day,
    pct5Day,
    trend,
    rsi14,
    signals: buildSignals(pct1Day, pct5Day, rsi14),
  };
}

export function buildFinancialAnalysis(input: {
  generatedAt?: string;
  instruments: FinancialInstrumentSnapshot[];
}): FinancialAnalysisSection {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const instruments = [...input.instruments];
  const aIndices = byBucket(instruments, "a-index");
  const aSectors = sortByMove(byBucket(instruments, "a-sector"));
  const usIndices = byBucket(instruments, "us-index");
  const usMegacaps = sortByMove(byBucket(instruments, "us-megacap"));
  const macro = byBucket(instruments, "macro");
  const marketDate = formatMarketDates(aIndices, aSectors, usIndices, usMegacaps, macro);

  const strongestSectors = aSectors.slice(0, 3);
  const weakestSectors = [...aSectors].reverse().slice(0, 3);
  const leadingMegacaps = usMegacaps.slice(0, 4);
  const laggingMegacaps = [...usMegacaps].reverse().slice(0, 4);

  const aOverview = describeAShares(aIndices, aSectors);
  const usOverview = describeUSMarket(usIndices, usMegacaps, macro);
  const crossMarket = buildCrossMarketNotes(aSectors, usMegacaps, macro);
  const trendSummary = buildTrendSummary(aIndices, aSectors, usIndices, usMegacaps, macro);
  const outlook = buildOutlook(aIndices, aSectors, usIndices, usMegacaps, macro);

  return {
    generated_at: generatedAt,
    market_date: marketDate,
    overview: [
      `昨日/最近交易日的金融分析显示，A股${directionText(aIndices)}，${aOverview}`,
      `美股${directionText(usIndices)}，${usOverview}`,
    ].join(" "),
    trend_summary: trendSummary,
    a_share: {
      overview: aOverview,
      indices: aIndices,
      sectors: aSectors,
      strongest_sectors: strongestSectors,
      weakest_sectors: weakestSectors,
    },
    us_market: {
      overview: usOverview,
      indices: usIndices,
      megacaps: usMegacaps,
      leading_megacaps: leadingMegacaps,
      lagging_megacaps: laggingMegacaps,
    },
    cross_market: crossMarket,
    outlook,
    risk_caveat:
      "本板块基于公开行情数据、代表性指数/ETF/个股和技术指标做复盘，不构成投资建议；代表性板块口径可能与官方行业指数存在差异。",
    instruments,
  };
}

function classifyTrend(
  pct1Day: number,
  pct5Day: number,
): FinancialInstrumentSnapshot["trend"] {
  if (pct1Day >= 0.3 && pct5Day >= -0.3) return "bullish";
  if (pct1Day <= -0.3 && pct5Day <= 0.3) return "bearish";
  return "neutral";
}

function buildSignals(
  pct1Day: number,
  pct5Day: number,
  rsi14: number | null,
): string[] {
  const signals: string[] = [];
  if (pct1Day >= 2) signals.push("单日强势上涨");
  if (pct1Day <= -2) signals.push("单日明显回落");
  if (pct5Day >= 5) signals.push("5日动量偏强");
  if (pct5Day <= -5) signals.push("5日动量偏弱");
  if (rsi14 != null && rsi14 >= 70) signals.push("RSI偏热");
  if (rsi14 != null && rsi14 <= 30) signals.push("RSI偏冷");
  return signals;
}

function byBucket(
  instruments: FinancialInstrumentSnapshot[],
  bucket: FinancialBucket,
): FinancialInstrumentSnapshot[] {
  return instruments.filter((it) => it.bucket === bucket);
}

function sortByMove(
  instruments: FinancialInstrumentSnapshot[],
): FinancialInstrumentSnapshot[] {
  return [...instruments].sort((a, b) => b.pct1Day - a.pct1Day);
}

function mostCommonDate(instruments: FinancialInstrumentSnapshot[]): string {
  const counts = new Map<string, number>();
  for (const it of instruments) counts.set(it.marketDate, (counts.get(it.marketDate) ?? 0) + 1);
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    new Date().toISOString().slice(0, 10)
  );
}

function formatMarketDates(
  aIndices: FinancialInstrumentSnapshot[],
  aSectors: FinancialInstrumentSnapshot[],
  usIndices: FinancialInstrumentSnapshot[],
  usMegacaps: FinancialInstrumentSnapshot[],
  macro: FinancialInstrumentSnapshot[],
): string {
  const aDate = mostCommonDate([...aIndices, ...aSectors]);
  const usDate = mostCommonDate([...usIndices, ...usMegacaps]);
  const macroDate = mostCommonDate(macro);
  const parts = [
    aDate ? `A股 ${aDate}` : "",
    usDate ? `美股 ${usDate}` : "",
    macroDate ? `宏观 ${macroDate}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" / ") : new Date().toISOString().slice(0, 10);
}

function directionText(items: FinancialInstrumentSnapshot[]): string {
  if (items.length === 0) return "数据不足";
  const up = items.filter((it) => it.pct1Day > 0).length;
  const down = items.filter((it) => it.pct1Day < 0).length;
  const avg = avgPct(items);
  if (up > down) return `整体偏强，样本平均${fmtPct(avg)}`;
  if (down > up) return `整体偏弱，样本平均${fmtPct(avg)}`;
  return `涨跌分化，样本平均${fmtPct(avg)}`;
}

function describeAShares(
  indices: FinancialInstrumentSnapshot[],
  sectors: FinancialInstrumentSnapshot[],
): string {
  const main = indices.find((it) => it.displayName === "上证指数") ?? indices[0];
  const growth = indices.find((it) => it.displayName === "创业板指");
  const strong = sectors[0];
  const weak = sectors[sectors.length - 1];
  const parts: string[] = [];
  if (main) parts.push(`上证指数${fmtPct(main.pct1Day)}`);
  if (growth) parts.push(`创业板指${fmtPct(growth.pct1Day)}`);
  if (strong && weak) {
    parts.push(
      `板块上${strong.displayName}最强（${fmtPct(strong.pct1Day)}），${weak.displayName}相对落后（${fmtPct(weak.pct1Day)}）`,
    );
  }
  if (sectors.length > 0) {
    const positive = sectors.filter((it) => it.pct1Day > 0).length;
    parts.push(`重点板块中${positive}/${sectors.length}个收涨`);
  }
  return parts.length > 0 ? `${parts.join("；")}。` : "A股行情数据不足。";
}

function describeUSMarket(
  indices: FinancialInstrumentSnapshot[],
  megacaps: FinancialInstrumentSnapshot[],
  macro: FinancialInstrumentSnapshot[],
): string {
  const qqq = indices.find((it) => it.displayName.includes("Nasdaq")) ?? indices[0];
  const spy = indices.find((it) => it.displayName.includes("S&P"));
  const leader = megacaps[0];
  const laggard = megacaps[megacaps.length - 1];
  const vix = macro.find((it) => it.id === "vix");
  const us10y = macro.find((it) => it.id === "us10y");
  const parts: string[] = [];
  if (spy) parts.push(`S&P 500 ETF${fmtPct(spy.pct1Day)}`);
  if (qqq) parts.push(`Nasdaq 100 ETF${fmtPct(qqq.pct1Day)}`);
  if (leader && laggard) {
    parts.push(
      `大型科技股中${leader.displayName}领涨（${fmtPct(leader.pct1Day)}），${laggard.displayName}承压（${fmtPct(laggard.pct1Day)}）`,
    );
  }
  if (vix) parts.push(`VIX${fmtPct(vix.pct1Day)}`);
  if (us10y) parts.push(`10Y美债收益率${fmtPct(us10y.pct1Day)}`);
  return parts.length > 0 ? `${parts.join("；")}。` : "美股行情数据不足。";
}

function buildCrossMarketNotes(
  sectors: FinancialInstrumentSnapshot[],
  megacaps: FinancialInstrumentSnapshot[],
  macro: FinancialInstrumentSnapshot[],
): string[] {
  const notes: string[] = [];
  const vix = macro.find(
    (it) => it.id === "vix" || it.symbol === "^VIX" || it.displayName.includes("VIX"),
  );
  const dxy = macro.find(
    (it) => it.id === "dxy" || it.displayName.includes("美元"),
  );
  const us10y = macro.find(
    (it) => it.id === "us10y" || it.displayName.includes("10Y"),
  );
  const aiSector = sectors.find(
    (it) => it.id === "a-ai-compute" || it.displayName.includes("AI"),
  );
  const semiSector = sectors.find(
    (it) => it.id === "a-semiconductor" || it.displayName.includes("半导体"),
  );
  const nvda = megacaps.find((it) => it.id === "nvda");
  const growthNames = [nvda, megacaps.find((it) => it.id === "amd"), megacaps.find((it) => it.id === "avgo")].filter(
    (it): it is FinancialInstrumentSnapshot => Boolean(it),
  );
  const growthSample = growthNames.length > 0 ? growthNames : megacaps.slice(0, 3);
  if (vix) {
    notes.push(
      vix.pct1Day < 0
        ? `VIX回落${fmtPct(vix.pct1Day)}，说明风险偏好边际改善，对高弹性科技资产更友好。`
        : `VIX上行${fmtPct(vix.pct1Day)}，风险偏好收缩，科技和成长板块更容易承压。`,
    );
  }
  if (dxy) {
    notes.push(
      dxy.pct1Day < 0
        ? `美元指数走弱${fmtPct(dxy.pct1Day)}，通常有利于全球风险资产和有色/商品定价情绪。`
        : `美元指数走强${fmtPct(dxy.pct1Day)}，对非美资产和商品风险偏好形成约束。`,
    );
  }
  if (us10y) {
    notes.push(
      us10y.pct1Day > 0
        ? `10Y美债收益率上行${fmtPct(us10y.pct1Day)}，估值久期较长的AI和半导体资产需要关注折现率压力。`
        : `10Y美债收益率回落${fmtPct(us10y.pct1Day)}，对成长股估值压力有所缓和。`,
    );
  }
  if (aiSector && semiSector && growthSample.length > 0) {
    const usAvg = avgPct(growthSample);
    notes.push(
      `美股AI硬件链样本平均${fmtPct(usAvg)}，A股AI/算力${fmtPct(aiSector.pct1Day)}、半导体${fmtPct(semiSector.pct1Day)}，可作为跨市场科技风险偏好的参照。`,
    );
  } else if (semiSector && growthSample.length > 0) {
    const usAvg = avgPct(growthSample);
    notes.push(
      `美股AI硬件链样本平均${fmtPct(usAvg)}，A股半导体${fmtPct(semiSector.pct1Day)}，两者可作为科技成长风险偏好的简化参照。`,
    );
  }
  if (notes.length === 0) {
    notes.push("跨市场宏观数据不足，今日以A股和美股自身涨跌结构为主。");
  }
  return notes.slice(0, 4);
}

function buildTrendSummary(
  aIndices: FinancialInstrumentSnapshot[],
  sectors: FinancialInstrumentSnapshot[],
  usIndices: FinancialInstrumentSnapshot[],
  megacaps: FinancialInstrumentSnapshot[],
  macro: FinancialInstrumentSnapshot[],
): string {
  const aAvg = avgPct(aIndices);
  const sectorAvg = avgPct(sectors);
  const usAvg = avgPct(usIndices);
  const megaAvg = avgPct(megacaps);
  const vix = findByIdOrName(macro, "vix", "VIX");
  const dxy = findByIdOrName(macro, "dxy", "美元");
  const strongestSector = sectors[0];
  const weakestSector = sectors[sectors.length - 1];
  const leader = megacaps[0];
  const laggard = megacaps[megacaps.length - 1];
  return [
    `昨日走势上，A股大盘样本平均${fmtPct(aAvg)}，重点板块样本平均${fmtPct(sectorAvg)}，市场结构${sectorAvg >= aAvg ? "偏向题材/行业线索" : "偏向指数权重防守"}。`,
    strongestSector && weakestSector
      ? `板块内部强弱分化明显：${strongestSector.displayName}${fmtPct(strongestSector.pct1Day)}居前，${weakestSector.displayName}${fmtPct(weakestSector.pct1Day)}落后，说明资金并非全面扩散，而是在少数方向里做选择。`
      : "",
    `美股大盘样本平均${fmtPct(usAvg)}，重点公司样本平均${fmtPct(megaAvg)}，${leader && laggard ? `${leader.displayName}${fmtPct(leader.pct1Day)}强于同组，${laggard.displayName}${fmtPct(laggard.pct1Day)}拖累风险偏好。` : "大型科技股内部仍需看龙头扩散情况。"}`,
    vix || dxy
      ? `宏观风险代理方面，${[vix ? `${vix.displayName}${fmtPct(vix.pct1Day)}` : "", dxy ? `${dxy.displayName}${fmtPct(dxy.pct1Day)}` : ""].filter(Boolean).join("、")}，这会影响后续科技成长和周期资源方向的弹性。`
      : "",
  ]
    .filter(Boolean)
    .join("");
}

function buildOutlook(
  aIndices: FinancialInstrumentSnapshot[],
  sectors: FinancialInstrumentSnapshot[],
  usIndices: FinancialInstrumentSnapshot[],
  megacaps: FinancialInstrumentSnapshot[],
  macro: FinancialInstrumentSnapshot[],
): FinancialAnalysisSection["outlook"] {
  const strongSectors = sectors.slice(0, 2);
  const weakSectors = [...sectors].reverse().slice(0, 2);
  const leaders = megacaps.slice(0, 3);
  const laggards = [...megacaps].reverse().slice(0, 3);
  const aAvg = avgPct(aIndices);
  const usAvg = avgPct(usIndices);
  const sectorAvg = avgPct(sectors);
  const megaAvg = avgPct(megacaps);
  const vix = findByIdOrName(macro, "vix", "VIX");
  const dxy = findByIdOrName(macro, "dxy", "美元");
  const us10y = findByIdOrName(macro, "us10y", "10Y");
  const semi = sectors.find((it) => it.displayName.includes("半导体"));
  const ai = sectors.find((it) => it.displayName.includes("AI"));
  const bank = sectors.find((it) => it.displayName.includes("银行"));
  const nvda = megacaps.find((it) => it.displayName === "Nvidia");

  const aShare =
    aAvg >= 0
      ? `后续A股的基准判断是震荡偏强但需要成交和板块扩散确认。大盘指数已表现为${directionText(aIndices)}，如果强势板块能从${names(strongSectors)}扩散到消费、银行等低波动方向，反弹持续性会更好；如果仍只有少数题材上涨，则更像结构性轮动。`
      : `后续A股的基准判断是弱修复或震荡整理。大盘指数${directionText(aIndices)}，需要先观察上证/沪深300是否止跌，以及${names(strongSectors)}的相对强势能否延续；若${names(weakSectors)}继续拖累，市场大概率仍以防守和轮动为主。`;

  const usMarket =
    usAvg >= 0
      ? `后续美股的基准判断是风险偏好仍在，但上行动能取决于大型科技股是否继续扩散。指数样本${directionText(usIndices)}，若${names(leaders)}保持强势且VIX不再上行，科技权重仍可能支撑指数；若收益率或美元重新抬升，估值较高的成长股会先承压。`
      : `后续美股的基准判断是先看止跌和波动率回落。指数样本${directionText(usIndices)}，如果${names(laggards)}继续走弱，指数修复会受限；只有当龙头股重新企稳、VIX回落，风险偏好才更容易恢复。`;

  const keySectors = [
    semi ? `半导体当前${fmtPct(semi.pct1Day)}，后续要看是否跟随美股AI硬件链修复。` : "",
    ai ? `AI/算力当前${fmtPct(ai.pct1Day)}，如果Nvidia/AMD/AVGO保持强势，A股映射会更容易延续。` : "",
    bank ? `银行当前${fmtPct(bank.pct1Day)}，它更像防守和指数稳定器；若银行强、科技弱，市场风格会偏保守。` : "",
    `大消费、机器人、有色和光通信需要结合强弱排序看资金轮动，短期更关注能否从单日强势变成连续2-3日相对强势。`,
  ]
    .filter(Boolean)
    .join("");

  const megacapText =
    `美股重点公司后续主要看三条线：AI硬件链、平台型科技和高波动个股。${nvda ? `Nvidia当前${fmtPct(nvda.pct1Day)}，它仍是AI风险偏好的核心参照。` : ""}` +
    `若${names(leaders)}继续领涨，同时${names(laggards)}跌幅收敛，指数更容易走出健康轮动；反过来，如果强者补跌，说明资金可能从高估值科技撤出。`;

  const scenarios = [
    `基准情景：A股维持结构性轮动，美股科技权重保持分化但不系统性下跌；这种情况下日报后续应重点跟踪半导体、AI/算力、光通信和Nvidia/AVGO/AMD的联动。`,
    `偏强情景：VIX回落、美元或10Y美债不再上行，且A股强势板块扩散到消费/银行等方向；这会提高指数级反弹的可信度。`,
    `偏弱情景：${[vix ? `${vix.displayName}继续上行` : "波动率上行", dxy ? `${dxy.displayName}走强` : "美元走强", us10y ? `${us10y.displayName}上行` : "美债收益率上行"].join("、")}，同时美股AI龙头走弱；这会压制A股科技映射，市场可能回到防守轮动。`,
  ];

  return {
    a_share: aShare,
    us_market: usMarket,
    key_sectors: keySectors,
    megacaps: megacapText,
    scenarios,
  };
}

function findByIdOrName(
  items: FinancialInstrumentSnapshot[],
  id: string,
  namePart: string,
): FinancialInstrumentSnapshot | undefined {
  return items.find((it) => it.id === id || it.displayName.includes(namePart));
}

function names(items: FinancialInstrumentSnapshot[]): string {
  return items.length > 0
    ? items.map((it) => it.displayName).join("、")
    : "相关标的";
}

function avgPct(items: FinancialInstrumentSnapshot[]): number {
  if (items.length === 0) return 0;
  return items.reduce((sum, it) => sum + it.pct1Day, 0) / items.length;
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}
