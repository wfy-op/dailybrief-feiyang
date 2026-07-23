import assert from "node:assert/strict";

import {
  parseV2exRssFallbackXml,
  V2EX_RSSHUB_FALLBACK_URLS,
} from "../lib/sources/v2ex";

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>V2EX-tech</title>
    <item>
      <title>Vibe coding 了半年，最后发现最有效的手法是朴实无华的左移</title>
      <description><![CDATA[讨论 AI 编程工作流和工程质量。]]></description>
      <link>https://v2ex.com/t/1218949</link>
      <pubDate>Tue, 09 Jun 2026 03:00:00 GMT</pubDate>
      <author>fennu2333</author>
    </item>
    <item>
      <title>你们遇到婆媳矛盾处理过的最妥当的方式是怎样的</title>
      <description><![CDATA[生活话题，不应该进入技术社区摘要。]]></description>
      <link>https://v2ex.com/t/1218839</link>
      <pubDate>Tue, 09 Jun 2026 02:00:00 GMT</pubDate>
      <author>someone</author>
    </item>
  </channel>
</rss>`;

async function main(): Promise<void> {
  const items = await parseV2exRssFallbackXml("v2ex-hot", rss, 10);

  assert.equal(items.length, 1);
  assert.equal(
    items[0].title,
    "Vibe coding 了半年，最后发现最有效的手法是朴实无华的左移",
  );
  assert.equal(items[0].sourceId, "v2ex-hot");
  assert.equal(items[0].category, "tech");
  assert.match(items[0].excerpt ?? "", /RSSHub/);
  assert.ok(items[0].publishedAt instanceof Date);

  assert.ok(
    V2EX_RSSHUB_FALLBACK_URLS.some((url) =>
      url.startsWith("https://rsshub.rssforever.com/v2ex/tab/tech"),
    ),
    "本机已验证可用的 rsshub.rssforever.com V2EX 技术 tab 应作为首选 fallback",
  );

  console.log("PASS v2ex rss fallback");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
