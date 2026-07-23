import assert from "node:assert/strict";

import type { ArticleInput, DailyReport } from "../lib/ai/pipeline";
import { groupRaw, renderHtml } from "../lib/output/render";
import { sources } from "../lib/sources/registry";
import type { SourceDef } from "../lib/sources/types";

const report: DailyReport = {
  hero_headline: "DailyBrief test",
  daily_overview: "DailyBrief test overview",
  tech_briefs: [],
  finance_briefs: [],
  politics_briefs: [],
  editor_note: "DailyBrief test note",
  keywords: [],
};

const zhPoliticsTitle = "\u4e2d\u4e1c\u505c\u706b\u8c08\u5224\u91cd\u542f";
const html = renderHtml(
  report,
  {
    tech: [],
    finance: [],
    politics: [
      {
        id: "world",
        name: "World",
        sources: [
          {
            sourceId: "_merged",
            sourceName: "World",
            merged: true,
            items: [
              {
                sourceId: "nyt-world",
                source: "NYT World",
                title: "Cease-fire talks resume in the Middle East",
                localizedTitle: zhPoliticsTitle,
                url: "https://example.com/world",
                excerpt: "English source excerpt",
                summary:
                  "\u8fd9\u662f\u4e00\u6bb5\u4e2d\u6587\u65f6\u653f\u6458\u8981\u3002",
                category: "politics",
              },
              {
                sourceId: "reuters-google-world",
                source: "Reuters",
                title: "European leaders agree on a new migration plan",
                url: "https://example.com/reuters",
                excerpt: "English source excerpt",
                summary:
                  "\u6b27\u6d32\u9886\u5bfc\u4eba\u5c31\u65b0\u79fb\u6c11\u8ba1\u5212\u8fbe\u6210\u4e00\u81f4\uff0c\u540e\u7eed\u5c06\u89c2\u5bdf\u6267\u884c\u7ec6\u5219\u3002",
                category: "politics",
              },
            ],
          },
        ],
      },
    ],
  },
  "2026-06-03",
);

assert.match(html, new RegExp(zhPoliticsTitle));
assert.match(html, /Cease-fire talks resume in the Middle East/);
assert.match(
  html,
  /<h3 class="article-title"><a[^>]*>\u6b27\u6d32\u9886\u5bfc\u4eba\u5c31\u65b0\u79fb\u6c11\u8ba1\u5212\u8fbe\u6210\u4e00\u81f4/,
);
assert.match(html, /European leaders agree on a new migration plan/);

const hackerNews = sources.find((source) => source.id === "hackernews");
assert.ok(hackerNews, "hackernews should be available as a zh community fallback");
assert.equal(hackerNews?.subcategory, "overseas-community");

for (const id of ["weibo-hot", "zhihu-hot"]) {
  const source = sources.find((candidate) => candidate.id === id);
  assert.ok(source, `${id} should be available in zh community sources`);
  assert.equal(source?.subcategory, "cn-community");
}

const hideWhenEmptySource: SourceDef = {
  id: "empty-community",
  name: "Empty Community",
  type: "api",
  url: "https://example.com/empty.json",
  category: "tech",
  subcategory: "cn-community",
  enabled: true,
  hideWhenEmpty: true,
};

const visibleWhenEmptySource: SourceDef = {
  ...hideWhenEmptySource,
  id: "visible-empty-community",
  name: "Visible Empty Community",
  hideWhenEmpty: false,
};

const groupedEmpty = groupRaw([], [hideWhenEmptySource, visibleWhenEmptySource]);
const emptyCommunitySources =
  groupedEmpty.tech.find((group) => group.id === "cn-community")?.sources ?? [];
assert.equal(
  emptyCommunitySources.some((source) => source.sourceId === "empty-community"),
  false,
  "hideWhenEmpty sources should not render an empty community tab",
);
assert.equal(
  emptyCommunitySources.some(
    (source) => source.sourceId === "visible-empty-community",
  ),
  true,
  "default sources should preserve existing empty-tab behavior",
);

const linuxDoArticle: ArticleInput = {
  sourceId: "empty-community",
  source: "Empty Community",
  title: "Linux Do discussion",
  url: "https://linux.do/t/example/1",
  category: "tech",
};
const groupedWithArticle = groupRaw([linuxDoArticle], [hideWhenEmptySource]);
const communitySourcesWithArticle =
  groupedWithArticle.tech.find((group) => group.id === "cn-community")?.sources ?? [];
assert.equal(
  communitySourcesWithArticle.some((source) => source.sourceId === "empty-community"),
  true,
  "hideWhenEmpty sources should render normally once they return content",
);

const linuxDo = sources.find((source) => source.id === "linuxdo");
assert.ok(linuxDo, "linuxdo should be configured as a zh community source");
assert.equal(linuxDo?.subcategory, "cn-community");
assert.equal(linuxDo?.enabled, true);
assert.equal(linuxDo?.hideWhenEmpty, true);

const v2ex = sources.find((source) => source.id === "v2ex-hot");
assert.ok(v2ex, "v2ex should remain configured as a zh community source");
assert.equal(v2ex?.subcategory, "cn-community");
assert.equal(v2ex?.hideWhenEmpty, true);

console.log("PASS community/politics render");
