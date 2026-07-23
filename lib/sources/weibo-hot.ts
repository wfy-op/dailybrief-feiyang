import type { RawArticle } from "./types";

const URL = "https://weibo.com/ajax/side/hotSearch";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://weibo.com/",
} as const;

interface WeiboHotItem {
  word?: string;
  word_scheme?: string;
  note?: string;
  num?: number;
  raw_hot?: number;
  flag_desc?: string;
  icon_desc?: string;
  url?: string;
}

interface WeiboHotResponse {
  data?: {
    hotgov?: WeiboHotItem;
    realtime?: WeiboHotItem[];
  };
}

function titleOf(item: WeiboHotItem): string {
  return (item.word_scheme ?? item.word ?? item.note ?? "").trim();
}

function hotOf(item: WeiboHotItem): number | undefined {
  return item.num ?? item.raw_hot;
}

function urlOf(item: WeiboHotItem): string {
  if (item.url?.startsWith("http")) return item.url;
  const word = item.word ?? item.word_scheme ?? item.note ?? "";
  return `https://s.weibo.com/weibo?q=${encodeURIComponent(word)}&Refer=top`;
}

export function parseWeiboHotSearch(
  text: string,
  sourceId: string,
  limit = 20,
): RawArticle[] {
  const parsed = JSON.parse(text) as WeiboHotResponse;
  const rawItems = [
    parsed.data?.hotgov,
    ...(parsed.data?.realtime ?? []),
  ].filter((item): item is WeiboHotItem => Boolean(item));

  const seen = new Set<string>();
  const out: RawArticle[] = [];
  for (const item of rawItems) {
    const title = titleOf(item);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    const hot = hotOf(item);
    const tag = item.flag_desc ?? item.icon_desc;
    out.push({
      sourceId,
      title,
      url: urlOf(item),
      excerpt: [
        `热度${hot !== undefined ? ` ${hot.toLocaleString("zh-CN")}` : ""}`,
        tag,
      ]
        .filter(Boolean)
        .join(" · "),
      publishedAt: new Date(),
      category: "tech",
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function fetchWeiboHot(
  sourceId: string,
  limit = 20,
): Promise<RawArticle[]> {
  const response = await fetch(URL, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) return [];
  return parseWeiboHotSearch(await response.text(), sourceId, limit);
}
