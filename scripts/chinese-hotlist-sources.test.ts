import assert from "node:assert/strict";

import { parseWeiboHotSearch } from "../lib/sources/weibo-hot";
import { parseZhihuTopHubHotList } from "../lib/sources/zhihu-hot";

const weiboItems = parseWeiboHotSearch(
  JSON.stringify({
    ok: 1,
    data: {
      hotgov: {
        word: "#\u7ea2\u8272\u57fa\u56e0\u85aa\u706b\u76f8\u4f20#",
        note: "#\u7ea2\u8272\u57fa\u56e0\u85aa\u706b\u76f8\u4f20#",
        flag: 2,
        num: 100000,
        url: "https://weibo.com/example",
      },
      realtime: [
        {
          word: "\u4eba\u5de5\u667a\u80fd\u65b0\u8fdb\u5c55",
          note: "\u4eba\u5de5\u667a\u80fd\u65b0\u8fdb\u5c55",
          num: 1234567,
          flag_desc: "\u70ed",
        },
        {
          word: "\u534a\u5bfc\u4f53\u4ea7\u4e1a\u94fe",
          note: "\u534a\u5bfc\u4f53\u4ea7\u4e1a\u94fe",
          raw_hot: 456789,
        },
      ],
    },
  }),
  "weibo-hot",
  3,
);

assert.equal(weiboItems.length, 3);
assert.equal(weiboItems[0].title, "#\u7ea2\u8272\u57fa\u56e0\u85aa\u706b\u76f8\u4f20#");
assert.equal(weiboItems[0].sourceId, "weibo-hot");
assert.equal(weiboItems[0].category, "tech");
assert.match(weiboItems[1].url, /s\.weibo\.com\/weibo/);
assert.match(weiboItems[1].excerpt ?? "", /\u70ed\u5ea6/);

const zhihuItems = parseZhihuTopHubHotList(
  `
  <html><body>
    <a href="/n/mproPpoq6O">\u77e5\u4e4e \u2037 \u70ed\u699c</a>
    <a href="https://www.zhihu.com/question/2044792103595770822">\u5982\u4f55\u8bc4\u4ef7 NVIDIA RTX Spark\uff1f</a>
    <a href="https://www.zhihu.com/question/2044792103595770822">\ue612</a>
    <a href="https://www.zhihu.com/question/2044859839910827099">\u6bd4\u4e9a\u8fea 5 \u6708\u6c7d\u8f66\u9500\u91cf\u8fbe 38.3 \u4e07\u8f86\u5e74\u5185\u9996\u6b21\u589e\u957f\uff0c\u8fd9\u610f\u5473\u7740\u4ec0\u4e48\uff1f</a>
  </body></html>
  `,
  "zhihu-hot",
  2,
);

assert.equal(zhihuItems.length, 2);
assert.equal(zhihuItems[0].title, "\u5982\u4f55\u8bc4\u4ef7 NVIDIA RTX Spark\uff1f");
assert.match(zhihuItems[1].title, /\u6bd4\u4e9a\u8fea/);
assert.equal(zhihuItems[0].sourceId, "zhihu-hot");
assert.equal(zhihuItems[0].category, "tech");
assert.match(zhihuItems[0].excerpt ?? "", /\u77e5\u4e4e\u70ed\u699c/);

console.log("PASS Chinese hotlist sources");
