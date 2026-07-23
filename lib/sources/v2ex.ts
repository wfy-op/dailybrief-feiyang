import Parser from "rss-parser";

import { curlFetch } from "./curl-fetch";
import type { RawArticle } from "./types";

/**
 * V2EX 「最热门技术帖子」抓取。
 *
 * 实现选择：用 /api/topics/show.json?node_name=X 拉每个**技术节点**的 topics，
 * 然后按 replies 字段排序取 top N。这是 V2EX 公开 API 里**唯一**能拿到
 * 「回复数」（= 真实热度）的端点：
 *   - /api/topics/hot.json：全站热议，但 80% 是 promotions / taste / life
 *     节点的非技术帖（实测过），过滤完剩不下几条。
 *   - 各节点的 atom feed (/feed/<node>.xml)：是按发布时间序，不含 replies
 *     字段，所以无法按热度排序，会混进很多 0 回复的新帖。
 *
 * 因此选择「节点级 show.json + 按 replies 排序 + 丢掉 0 回复」这个组合，
 * 同时具备：节点天然过滤掉非技术内容 + replies 排序对齐"最热门"语义。
 *
 * 共享 V2EX_OFF_TOPIC_RE 作为标题级兜底（lib/sources/linuxdo.ts 也用）。
 */

const TECH_NODES = [
  "programmer", // 程序员（最活跃的综合技术节点）
  "dev", // 开发
  "python",
  "golang",
  "linux",
  "apple", // macOS 开发
  "rust",
  "ai", // AI 相关讨论
];

/**
 * 标题层面的兜底过滤 — 即使来自技术节点，部分帖子仍是生活/感情/广告/吐槽。
 * 命中即丢弃。同时被 lib/sources/linuxdo.ts 和 lib/output/render.ts 引用。
 *
 * 命名保留 V2EX_ 前缀仅出于历史原因 — 实际是中文社区通用过滤规则。
 */
export const V2EX_OFF_TOPIC_RE =
  /(足浴|按摩|捏\s*jio|相亲|对象|男友|女友|分手|婆|岳|家暴|出轨|彩礼|9\.9\s*元|抽奖|薅羊毛|代理\s*IP|住宅\s*IP|跨境\s*(卖家|IP|电商)|辣椒\s*HTTP|买房|买车|装修|房贷|养老|退休|结婚|生娃|带娃|养娃|减肥|健身|租房|搬家|签证|移民|岛主|离职|裸辞|老赖|存款|新人报道|无聊|发小|废了|工资|加班吐槽|找工作|失业|找对象)/i;

interface V2exTopic {
  id: number;
  title: string;
  url: string;
  content?: string;
  replies: number;
  created: number;
  last_touched?: number;
  node?: { name: string; title?: string };
}

export const V2EX_RSSHUB_FALLBACK_URLS = [
  "https://rsshub.rssforever.com/v2ex/topics/hot",
  "https://rsshub.liumingye.cn/v2ex/topics/hot",
  "https://rsshub.ktachibana.party/v2ex/topics/hot",
  "https://rsshub.woodland.cafe/v2ex/topics/hot",
  "https://rsshub.rssforever.com/v2ex/tab/tech",
  "https://rsshub.liumingye.cn/v2ex/tab/tech",
  "https://rsshub.ktachibana.party/v2ex/tab/tech",
  "https://rsshub.woodland.cafe/v2ex/tab/tech",
  "https://rsshub.rssforever.com/v2ex/topics/latest",
  "https://rsshub.liumingye.cn/v2ex/topics/latest",
] as const;

const JSON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; DailyBriefBot/1.0)",
  Accept: "application/json",
} as const;

const RSS_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

const V2EX_RSS_OFF_TOPIC_RE =
  /(婆媳|相亲|对象|男友|女友|分手|结婚|礼金|归乡|家暴|买房|买车|房贷|装修|贷款|低佣|开户|抽奖|返佣|招聘|求职|睡眠|焦虑|疾病|医院|交通问题|屏蔽短信)/i;

const rssParser = new Parser({
  timeout: 15000,
  headers: RSS_HEADERS,
});

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeV2exUrl(url: string): string {
  return url.replace(/^https:\/\/v2ex\.com/i, "https://www.v2ex.com");
}

function isOffTopicTitle(title: string): boolean {
  return V2EX_OFF_TOPIC_RE.test(title) || V2EX_RSS_OFF_TOPIC_RE.test(title);
}

async function fetchNode(node: string): Promise<V2exTopic[]> {
  try {
    const r = await fetch(
      `https://www.v2ex.com/api/topics/show.json?node_name=${node}`,
      {
        headers: JSON_HEADERS,
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!r.ok) return [];
    return (await r.json()) as V2exTopic[];
  } catch {
    return [];
  }
}

export async function parseV2exRssFallbackXml(
  sourceId: string,
  xml: string,
  limit = 25,
): Promise<RawArticle[]> {
  const feed = await rssParser.parseString(xml);
  const seen = new Set<string>();

  return (feed.items ?? [])
    .map((item) => {
      const title = (item.title ?? "").trim();
      const url = normalizeV2exUrl((item.link ?? item.guid ?? "").trim());
      const excerpt = stripHtml(
        item.contentSnippet ?? item.content ?? item.summary ?? "",
      ).slice(0, 300);
      return {
        sourceId,
        title,
        url,
        excerpt: excerpt ? `RSSHub 技术社区 fallback · ${excerpt}` : "RSSHub 技术社区 fallback",
        publishedAt: item.isoDate ? new Date(item.isoDate) : undefined,
        category: "tech" as const,
      };
    })
    .filter((item) => {
      if (!item.title || !item.url) return false;
      if (seen.has(item.url)) return false;
      if (isOffTopicTitle(item.title)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, limit);
}

async function fetchV2exRssFallback(
  sourceId: string,
  limit: number,
): Promise<RawArticle[]> {
  for (const url of V2EX_RSSHUB_FALLBACK_URLS) {
    try {
      const xml = await curlFetch(url, RSS_HEADERS, 15);
      const items = await parseV2exRssFallbackXml(sourceId, xml, limit);
      if (items.length > 0) return items;
    } catch {
      // Try the next public RSSHub instance. Source health will report empty
      // if all fallbacks fail, matching other fragile community sources.
    }
  }
  return [];
}

export async function fetchV2ex(
  sourceId: string,
  limit = 25,
): Promise<RawArticle[]> {
  const lists = await Promise.all(TECH_NODES.map(fetchNode));

  const seen = new Set<string>();
  const candidates: Array<{ topic: V2exTopic; nodeTitle: string }> = [];

  for (const list of lists) {
    for (const t of list) {
      if (!t.url || !t.title) continue;
      if (seen.has(t.url)) continue;
      if (isOffTopicTitle(t.title)) continue;
      // Drop 0-reply posts: user-stated requirement is "最热门 10 个"
      // — a 0-reply post is by definition not hot, no matter how recent.
      if ((t.replies ?? 0) === 0) continue;
      seen.add(t.url);
      candidates.push({
        topic: t,
        nodeTitle: t.node?.title ?? t.node?.name ?? "?",
      });
    }
  }

  // Sort by reply count desc — closest available proxy for "hot"
  candidates.sort((a, b) => b.topic.replies - a.topic.replies);

  const apiItems = candidates.slice(0, limit).map(({ topic, nodeTitle }) => ({
    sourceId,
    title: topic.title,
    url: topic.url,
    excerpt: `${topic.replies} 回复 · ${nodeTitle} 节点`,
    publishedAt: topic.created ? new Date(topic.created * 1000) : undefined,
    category: "tech" as const,
  }));

  if (apiItems.length > 0) return apiItems;
  return fetchV2exRssFallback(sourceId, limit);
}
