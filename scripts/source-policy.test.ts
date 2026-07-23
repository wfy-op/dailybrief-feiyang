import assert from "node:assert/strict";

import { applySourceFetchLimit } from "../lib/sources/source-policy";
import type { RawArticle, SourceDef } from "../lib/sources/types";

function article(n: number): RawArticle {
  return {
    sourceId: "demo",
    title: `Article ${n}`,
    url: `https://example.com/${n}`,
    category: "tech",
  };
}

const cappedSource: SourceDef = {
  id: "demo",
  name: "Demo",
  type: "rss",
  url: "https://example.com/feed.xml",
  category: "tech",
  fetchLimit: 2,
};

const uncappedSource: SourceDef = {
  ...cappedSource,
  fetchLimit: undefined,
};

const items = [article(1), article(2), article(3)];

assert.deepEqual(
  applySourceFetchLimit(cappedSource, items).map((a) => a.title),
  ["Article 1", "Article 2"],
);
assert.equal(applySourceFetchLimit(uncappedSource, items).length, 3);

const financeCreatorSource: SourceDef = {
  id: "capital-flows",
  name: "Capital Flows Research",
  type: "rss",
  url: "https://www.capitalflowsresearch.com/feed",
  category: "finance",
  subcategory: "creator",
  fetchLimit: 2,
};

const creatorItems = applySourceFetchLimit(financeCreatorSource, [
  {
    ...article(1),
    sourceId: "capital-flows",
    category: "finance",
    title: "US money market funds hit a record",
  },
  {
    ...article(2),
    sourceId: "capital-flows",
    category: "finance",
    title: "Inflation pressure is mounting",
  },
  {
    ...article(3),
    sourceId: "capital-flows",
    category: "finance",
    title: "Crypto liquidations accelerate",
  },
]);

assert.equal(creatorItems.length, 2);
assert.match(creatorItems[0].meta ?? "", /opinion\/NFA/);
assert.match(creatorItems[0].meta ?? "", /public RSS/);
assert.match(creatorItems[0].excerpt ?? "", /观点\/NFA/);

console.log("PASS source policy");
