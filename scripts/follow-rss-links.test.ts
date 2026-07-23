import assert from "node:assert/strict";

import { loadAllSources } from "../lib/sources/registry";
import { V2EX_RSSHUB_FALLBACK_URLS } from "../lib/sources/v2ex";

const sources = loadAllSources();
const byId = new Map(sources.map((source) => [source.id, source]));

function source(id: string) {
  const found = byId.get(id);
  assert.ok(found, `${id} should be configured`);
  assert.equal(found.enabled, true, `${id} should be enabled`);
  return found;
}

assert.equal(source("wsj-cn").url, "https://plink.anyfeeder.com/wsj/cn");
assert.equal(source("bbc-news-cn").url, "https://plink.anyfeeder.com/bbc/cn");
assert.equal(source("nytimes-cn").url, "https://plink.anyfeeder.com/nytimes/cn");
assert.equal(source("36kr").url, "https://36kr.com/feed");

for (const id of ["wsj-cn", "bbc-news-cn", "nytimes-cn", "36kr"]) {
  const configured = source(id);
  assert.equal(configured.type, "rss", `${id} should be a plain RSS source`);
  assert.ok(configured.fetchLimit && configured.fetchLimit <= 10, `${id} should be capped`);
  assert.deepEqual(configured.locales, ["zh"], `${id} should only participate in zh reports`);
}

assert.equal(source("wsj-cn").category, "finance");
assert.equal(source("36kr").category, "finance");
assert.equal(source("bbc-news-cn").category, "politics");
assert.equal(source("nytimes-cn").category, "politics");

assert.ok(
  V2EX_RSSHUB_FALLBACK_URLS.some((url) =>
    url.startsWith("https://rsshub.rssforever.com/v2ex/topics/hot"),
  ),
  "verified V2EX hot-topic RSSHub mirror should be in the fallback list",
);

assert.equal(
  sources.some((candidate) => candidate.url === "https://rsshub.app/zhihu/hotlist"),
  false,
  "currently unavailable Zhihu RSSHub hotlist should not be configured",
);
assert.equal(
  sources.some((candidate) => candidate.url === "https://plink.anyfeeder.com/weibo/search/hot"),
  false,
  "Weibo anyfeeder RSS intermittently returns RSSHub HTML and should not be configured",
);
assert.equal(source("weibo-hot").type, "api");
assert.equal(source("zhihu-hot").type, "api");

console.log("PASS follow rss links config");
