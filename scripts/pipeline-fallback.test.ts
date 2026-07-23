import assert from "node:assert/strict";

import {
  buildDeterministicDailyReport,
  generateDailyReport,
  type ArticleInput,
} from "../lib/ai/pipeline";

const articles: ArticleInput[] = (["tech", "finance", "politics"] as const).flatMap(
  (category) => Array.from({ length: 5 }, (_, index) => ({
    sourceId: `${category}-source-${index % 2}`,
    source: `${category} source`,
    category,
    title: `${category} item ${index}`,
    url: `https://example.com/${category}/${index}`,
    excerpt: `${category} source excerpt ${index}.`,
  })),
);

const direct = buildDeterministicDailyReport(articles);
assert.equal(direct.tech_briefs.length, 5);
assert.equal(direct.finance_briefs.length, 5);
assert.equal(direct.politics_briefs.length, 3);
assert.equal(direct.tech_briefs[0].url, "https://example.com/tech/0");

async function main() {
  let attempts = 0;
  const result = await generateDailyReport(articles, {
    call: async () => {
      attempts += 1;
      throw new Error("simulated LLM outage");
    },
  });
  assert.equal(attempts, 2);
  assert.deepEqual(result.report, direct);
  console.log("PASS pipeline deterministic fallback");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
