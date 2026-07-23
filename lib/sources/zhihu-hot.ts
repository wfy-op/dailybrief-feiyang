import * as cheerio from "cheerio";
import type { RawArticle } from "./types";

const ZHIHU_API =
  "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=20&desktop=true";
const TOPHUB_ZHIHU = "https://tophub.today/n/mproPpoq6O";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/html, */*",
  Referer: "https://www.zhihu.com/hot",
} as const;

interface ZhihuHotTarget {
  title?: string;
  url?: string;
  id?: number | string;
  excerpt?: string;
  detail_text?: string;
  metrics_area?: { text?: string };
  title_area?: { text?: string };
}

interface ZhihuHotItem {
  target?: ZhihuHotTarget;
  detail_text?: string;
}

interface ZhihuHotResponse {
  data?: ZhihuHotItem[];
}

function normalizeZhihuUrl(url: string | undefined, id: number | string | undefined): string {
  if (url?.startsWith("http")) return url.replace("api.zhihu.com/questions", "www.zhihu.com/question");
  if (id !== undefined && id !== "") return `https://www.zhihu.com/question/${id}`;
  return "https://www.zhihu.com/hot";
}

function zhihuArticle(
  sourceId: string,
  title: string,
  url: string,
  rank: number,
  extra?: string,
): RawArticle {
  return {
    sourceId,
    title,
    url,
    excerpt: [`知乎热榜 #${rank}`, extra].filter(Boolean).join(" · "),
    publishedAt: new Date(),
    category: "tech",
  };
}

export function parseZhihuApiHotList(
  text: string,
  sourceId: string,
  limit = 20,
): RawArticle[] {
  const parsed = JSON.parse(text) as ZhihuHotResponse;
  const out: RawArticle[] = [];
  const seen = new Set<string>();
  for (const item of parsed.data ?? []) {
    const target = item.target ?? {};
    const title = (target.title_area?.text ?? target.title ?? "").trim();
    if (!title || seen.has(title)) continue;
    seen.add(title);
    out.push(
      zhihuArticle(
        sourceId,
        title,
        normalizeZhihuUrl(target.url, target.id),
        out.length + 1,
        target.metrics_area?.text ?? item.detail_text ?? target.detail_text,
      ),
    );
    if (out.length >= limit) break;
  }
  return out;
}

export function parseZhihuTopHubHotList(
  html: string,
  sourceId: string,
  limit = 20,
): RawArticle[] {
  const $ = cheerio.load(html);
  const out: RawArticle[] = [];
  const seenTitles = new Set<string>();
  const seenUrls = new Set<string>();

  $("a").each((_, el) => {
    if (out.length >= limit) return;
    const href = $(el).attr("href") ?? "";
    if (!/^https:\/\/www\.zhihu\.com\/(question|p)\//.test(href)) return;
    const title = $(el).text().replace(/\s+/g, " ").trim();
    if (
      title.length < 5 ||
      !/[\p{Script=Han}A-Za-z0-9]/u.test(title) ||
      seenTitles.has(title) ||
      seenUrls.has(href)
    )
      return;
    seenTitles.add(title);
    seenUrls.add(href);
    out.push(zhihuArticle(sourceId, title, href, out.length + 1));
  });

  return out;
}

export async function fetchZhihuHot(
  sourceId: string,
  limit = 20,
): Promise<RawArticle[]> {
  try {
    const api = await fetch(ZHIHU_API, {
      headers: HEADERS,
      signal: AbortSignal.timeout(20_000),
    });
    if (api.ok) {
      const items = parseZhihuApiHotList(await api.text(), sourceId, limit);
      if (items.length > 0) return items;
    }
  } catch {
    // Fall through to the public TopHub page. Zhihu's API often requires
    // browser-side anti-bot state even for the public hot list.
  }

  const page = await fetch(TOPHUB_ZHIHU, {
    headers: { ...HEADERS, Referer: "https://tophub.today/" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!page.ok) return [];
  return parseZhihuTopHubHotList(await page.text(), sourceId, limit);
}
