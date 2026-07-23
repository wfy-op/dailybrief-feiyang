# 📰 daily-brief · 10 分钟拥有你自己的 AI 每日简报

**[中文](./)** · [English](README.en.md)

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6.svg)](https://www.typescriptlang.org/)
[![LLM: pluggable](https://img.shields.io/badge/LLM-pluggable%20(6%20backends)-orange.svg)](#-llm-后端配置)
[![Deploy: GH Actions](https://img.shields.io/badge/deploy-GitHub%20Actions-2088ff.svg)](#a-github-actions--pages零基础设施推荐)
[![Demo: live](https://img.shields.io/badge/demo-leiting--eric.github.io%2FDailyBrief-brightgreen.svg)](https://leiting-eric.github.io/DailyBrief)
[![Stars](https://img.shields.io/github/stars/leiting-eric/DailyBrief?style=social)](https://github.com/leiting-eric/DailyBrief)

> **你的私人 AI 每日简报，跑在你自己掌控的基础设施上。** 47 个启用信源配置 · LLM 摘要 · 21 个股票/加密标的**技术指标 + AI 交易点评** · 中英双语 · 6 个 LLM 后端可选。
>
> **三种部署任选**：[**🚀 5 分钟 Fork 到 GitHub Actions**](#a-github-actions--pages零基础设施推荐) · [**💻 本地一键装**](#b-本地一键装) · [**🤖 一句话让 AI Agent 帮你装**](#c-给-ai-agent-一句话装)。

**🌐 Live demos** —
[📰 leiting-eric.github.io/DailyBrief](https://leiting-eric.github.io/DailyBrief)（A 方式 · GitHub Actions + Pages）
·
[📰 daily.leiting.tech](https://daily.leiting.tech)（B 方式 · 本地服务器部署）

---

## ✨ 核心特性

- **🌍 全网多源聚合**：47 个启用信源配置覆盖硅谷科技、AI 前沿、全球财经、国际时政、中文社区，一份报告通吃
- **📈 21 个标的实时行情**：美股 / 加密 / 港股 / 商品外汇 / 宏观信号，附 SMA / RSI / MACD 技术指标 + LLM 每日交易点评
- **🤖 6 个 LLM 后端可插拔**：Claude CLI / Codex CLI / Anthropic / OpenAI / DeepSeek / MiniMax，一个环境变量切换，不绑死任何家
- **🌐 中英双语**：`REPORT_LOCALE=en` 一切——数据源、prompt、UI 文案、Bullish/Bearish stance 全套切英文
- **🚀 部署灵活**：GitHub Actions（零基础设施）/ 本地系统调度器 / 自托管服务器三选一，互不冲突可并存
- **🆓 数据源零 API key**：所有源走免费公开端点（RSS / 公开 JSON），不需要付费订阅
- **🔒 不绑定第三方阅读服务**：Feedly / Inoreader / Pocket 那些都不沾，你看了什么是你自己的事
- **📁 单文件 HTML**：CSS + JS 全内联，无外部依赖，scp 上服务器直接当首页

---

## 📚 信源图谱

46 个中文模式信源配置 / 37 个英文模式信源配置，分布如下：

### 🧑‍💻 技术动态

<p align="center"><img src="docs/screenshots/tech.png" alt="技术动态 — GitHub Trending / X 推文 / AI 媒体" width="720"></p>

- **GitHub Trending** · 热榜每日刷新
- **AI 媒体**（merged）：OpenAI / DeepMind / Hugging Face Blog / TLDR AI / Smol AI / Latent Space / MIT Tech Review
- **X 推文**（attentionvc-ai）：精选 AI 圈大佬动态

### 📈 市场行情（非新闻源，21 个标的）

<p align="center"><img src="docs/screenshots/trading.png" alt="市场行情 — 21 ticker 技术指标 + AI 中文点评" width="720"></p>

- **美股 / ETF**：SPY / QQQ / AAPL / MSFT / NVDA / GOOGL / TSLA / META
- **加密**：BTC / ETH / SOL（附 alt.me 加密恐慌贪婪指数 + CoinGecko 总览）
- **中港**：BABA / PDD / JD / 0700.HK
- **商品外汇**：GC=F（黄金）/ CL=F（WTI 原油）/ USDCNY=X
- **宏观信号**：^VIX / ^TNX（10Y 美债）/ DXY（美元指数）

### 🌍 时政观察

<p align="center"><img src="docs/screenshots/politics.png" alt="时政观察 — BBC / Guardian / NYT 等国际要闻" width="720"></p>

**BBC / Guardian / NYT / NPR / DW 中文 / Al Jazeera / The Diplomat** — 7 家主流国际媒体的 World 频道

### 💰 财经要点

<p align="center"><img src="docs/screenshots/finance.png" alt="财经要点 — Bloomberg / WSJ / FT 全球财经" width="720"></p>

**Bloomberg / WSJ / FT / BBC Business / Economist** — 5 家全球财经主力

### 💬 社区讨论
- **zh 模式**：V2EX 热榜 / LinuxDo 热帖
- **en 模式**：Hacker News / Reddit r/stocks（自动替换上面两个）

> 完整列表 + 启用状态：`npm run sources` 查看；改源 → 编辑 [`sources.config.json`](sources.config.json)。

---

## 🚀 三种部署方式选一种

| 方式 | 适合谁 | 你需要 | 几分钟搞定 |
|---|---|---|---|
| **A. GitHub Actions + Pages** | 没服务器、不想常开电脑 | GitHub 账号；默认无需单独 API key | ~5 分钟（推荐） |
| **B. 本地一键装** | 有常开的电脑/服务器、想极致便宜 | Node 20+，可选 Claude Code 登录 | ~3 分钟 |
| **C. 给 AI Agent 一句话** | 懒、想让 Cursor / Codex / Claude Code 帮你装 | 同上 | 一句话 |

### A. GitHub Actions + Pages（零基础设施，推荐）

1. **Fork 这个 repo**（GitHub 右上角 Fork 按钮）。
2. 进 Fork → **Settings → Actions → General → Workflow permissions**，允许工作流写入仓库。
3. **Actions → Daily Brief Cloud → Run workflow**，先手动运行一次。
4. 首次成功后，在 **Settings → Pages** 选择 `gh-pages` 分支和 `/ (root)`。

默认云端流程无需单独的 LLM API key：工作流使用 GitHub 自动签发的短期
`GITHUB_TOKEN` 调用 GitHub Models 的 `openai/gpt-4o-mini`，并仅申请
`models: read` 与 `contents: write`。如果模型临时限流或不可用，日报会保留来源
摘要并切换到确定性简报，仍需通过发布质量门才会上线。

个性化生产计划固定为 Asia/Shanghai 08:07 主运行，10:07 和 14:07 做幂等补跑。
补跑在 `gh-pages` 已包含当天 HTML 时会在模型调用前退出。需要改时间时直接编辑
`.github/workflows/daily.yml` 的 cron，并同步修改三次触发。

跑完后报告位于 `https://<你的用户名>.github.io/<repo-名字>/`。本项目的生产实例是
[`https://wfy-op.github.io/dailybrief-feiyang/`](https://wfy-op.github.io/dailybrief-feiyang/)。

> GitHub Models 免费推理有速率限制，适合这类低频个人自动化；代码中的确定性降级
> 是必保底。需要更高配额时可配置 `OPENAI_API_KEY`，并把 `OPENAI_BASE_URL` 和
> `LLM_MODEL` 一并切换到对应服务。

#### 🐛 A 方式常见坑

- **"Upgrade or make this repository public to enable Pages"** —— GitHub Pages 在 Free 账户的 Private repo 上不可用。Settings → General → Danger Zone → Change visibility 改 Public。Actions Secrets 在 Public repo 里依然加密保护，对其他人不可见
- **Variable name 报 "alphanumeric only"** —— 输入 `LLM_BACKEND` 时下划线被中文输入法替换成了全角 `＿`（U+FF3F）。切到英文输入法 Shift+`-` 重打
- **第一次跑完才能选 Pages source** —— Pages 设置页要求选已存在的分支，但 `gh-pages` 是首次 workflow 跑成功后才创建出来。顺序：配 secret → 触发 workflow → 跑完 → 回 Settings → Pages 选 `gh-pages`
- **Action 红 X 怎么看具体原因** —— 点失败的 build → 左边列出每个 step → 找有红 X 的那步点开看 log。最常见两类：`401/402` = API key 拼错或没余额；`403` = workflow permissions 没设成 Read and write
- **生成步骤失败** —— 先看 `Generate report`，再看确定性 fallback 是否触发；只有后续确定性校验失败才应阻止发布

### B. 本地一键装

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node

# Windows PowerShell
irm https://raw.githubusercontent.com/leiting-eric/DailyBrief/main/bootstrap.mjs | node -
```

这条命令会自动：
1. 检查 Node / git / claude CLI 是否就位（没装 claude CLI 只发警告，可继续走 API 后端）
2. `git clone` 到 `~/daily-brief`（Windows: `%USERPROFILE%\daily-brief`）
3. `npm install`
4. 注册系统定时（Windows Task Scheduler / macOS launchd / Linux cron，默认 16:00 本地时间）
5. 写 `~/.daily-brief-config` 记录项目路径
6. 在 `~/.claude/` 建符号链接让 Claude Code 的 skill 和 slash command 全局可用
7. 跑一次 `npm run dry-run` 烟测

**🎁 Claude Code 用户额外福利**：装完后任意目录都能 `/run-daily`、`/check-daily`，描述问题（"日报又挂了"）也能触发 `daily-brief` skill 自动加载。**其他 agent**（Cursor / Codex）没有 skill 加载机制，但定时任务跑得起来。手动触发用：

| 平台 | 手动触发 |
|---|---|
| Windows | `Start-ScheduledTask -TaskName DailyBrief` |
| macOS | `launchctl start com.daily-brief` |
| Linux | `node scripts/run-daily.mjs`（cron 不支持手动触发） |

自定义路径 / 触发时间：

```bash
node bootstrap.mjs --target /custom/path --at 07:30
```

**LLM 后端**：默认走本地 `claude` CLI（首次需在浏览器登录一次：`echo "hi" | claude --print --model sonnet`，登录后永久生效）。不用 Claude Code 就跳过它，复制 `.env.example` 到 `.env.local` 把 `LLM_BACKEND` 切到 OpenAI / Anthropic / DeepSeek / MiniMax —— 见 [LLM 后端配置](#-llm-后端配置)。

### C. 给 AI Agent 一句话装

无论你用哪个 AI Agent（Claude Code / Cursor / Codex / Continue.dev / OpenClaw 等），把下面这段发给它：

> 帮我装这个开源项目，按 README 的"本地一键装"流程跑 bootstrap，完成后告诉我下次自动触发的时间：
> https://github.com/leiting-eric/DailyBrief

项目里有 [`AGENTS.md`](AGENTS.md)（通用 agent 协议）+ [`.claude/skills/daily-brief/SKILL.md`](.claude/skills/daily-brief/SKILL.md)（Claude Code 专属，更详细），Agent 装完后能直接帮你诊断"今天报告没出来"、"加个新数据源"这类问题。

---

## 📋 前置要求

- **Node.js 20+** + **npm** + **git**（B/C 方式本地需要；A 方式不需要——GH Actions 容器自带）
- **一个能跑的 LLM**：云端默认使用 GitHub Models，无需单独 key；本地可用 Claude/Codex CLI 或任一 API backend
- 平台：Windows 10/11、macOS 12+、Linux（任一平台都支持，定时机制自动适配）

---

## 🔧 手动安装

```bash
# 1. clone + 依赖
git clone https://github.com/leiting-eric/DailyBrief.git
cd DailyBrief
npm install

# 2. 配置 LLM 后端
#    默认 claude CLI（如果没登录会引导你登录）：
echo "say hi in Chinese" | claude --print --model sonnet
#    或用其他 backend：cp .env.example .env.local 编辑 LLM_BACKEND 和对应 API key

# 3. 注册定时 + 启用全局 skill
node scripts/install.mjs --global
# 也可指定时间：node scripts/install.mjs --at 07:30 --global

# 4. 立即触发一次测试
# Windows:  Start-ScheduledTask -TaskName DailyBrief
# macOS:    launchctl start com.daily-brief
# Linux:    node scripts/run-daily.mjs
```

下次触发时机：
- **🪟 Windows** — 系统会自动唤醒电脑（如在睡眠），跑完再回睡
- **🍎 macOS** — launchd 不会主动唤醒，电脑睡着的话跳过这次（需要 `pmset wake schedule` 配合）
- **🐧 Linux** — cron 同理，挂起期间不跑

---

## 🛠️ 日常命令

| 命令 | 用途 | 耗时 |
|---|---|---|
| `npm run daily` | 手动完整跑一次 | 5-8 min |
| `npm run dry-run` | 只抓取不调 LLM，验证数据源 | ~30s |
| `npm run render [date]` | 改了 CSS/排版后重渲染 | <1s |
| `npm run regen-trading [date]` | 重做交易部分 | ~2 min |
| `npm run regen-enrich <cat:sub> [date]` | 补缺失的中文摘要 | ~30s |
| `npm run open` | 在 Chrome 打开今日报告 | 即时 |
| `npm run quota-report` | 看各 LLM backend 用量统计 | 即时 |
| `npm run sources` | 列出所有数据源（按 locale 标注启用/过滤状态）| 即时 |
| `npm run sources:check` | 仅校验 `sources.config.json` schema（适合 CI / pre-commit）| 即时 |

生产定时发布由 [`.github/workflows/daily.yml`](.github/workflows/daily.yml) 负责；模型认证、幂等补跑、质量门和运维命令见 [`docs/github-actions.md`](docs/github-actions.md)。本机 PowerShell 控制脚本只保留为手动应急路径。

---

## 📊 数据源配置

数据源以 JSON 数组形式集中存储在项目根的 [`sources.config.json`](sources.config.json) —— **唯一配置入口**，不需要改 TypeScript 代码即可加/禁/调整源。每条记录的字段：

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | ✓ | 全局唯一短标识（dispatch.ts 用 id 路由到对应 fetcher）|
| `name` | ✓ | UI 显示名 |
| `type` | ✓ | `rss` / `api` / `scrape` |
| `url` | ✓ | RSS feed 或 API endpoint |
| `category` | ✓ | `tech` / `finance` / `politics`，决定 L1 tab |
| `subcategory` |   | `tech` 下的 L2 分组（`github-trending` / `ai-news` / `x-viral` / `cn-community`）；`finance` 下统一 `news` |
| `enabled` |   | 默认 `true`，设 `false` 跳过抓取（保留记录便于回滚）|
| `useCurl` |   | 若该源被 Cloudflare TLS-fingerprint 拦了 Node undici，设 `true` 让 rss.ts 走 curl 子进程 |
| `lang` |   | `zh` 表示源内容是中文 — enrich 阶段会跳过它（无需把中文翻译成中文）|
| `locales` |   | 数组，标明该源出现在哪些 report locale 下。默认 `["zh", "en"]` |
| `notes` |   | 任意备注（如"被废弃因为 feed 死了"），运行时忽略 |

### 加一个 RSS 源

1. 编辑 `sources.config.json`，追加一条记录
2. 跑 `npm run sources:check` 校验 schema
3. `npm run dry-run` 抓一次验证拉取正常
4. 下次 `npm run daily` 自动包含

### 🌐 Locale 模式（zh / en）

通过 `REPORT_LOCALE` 环境变量切换：

```bash
# .env.local
REPORT_LOCALE=zh    # 默认 — 中文 mode，含 V2EX / LinuxDo / DW 中文等中文源
# REPORT_LOCALE=en  # 英文 mode — 自动过滤掉 zh-only 源，挂上 en-only 源
```

每个源在 JSON 里的 `locales` 字段决定它在哪些模式下出现：

- `["zh"]` — **仅中文 mode**（V2EX / LinuxDo / DW 中文）。英文用户读不懂，英文 mode 自动 drop
- `["en"]` — **仅英文 mode**（Hacker News / r/stocks 英文社区源，替代中文社区源）。zh mode 不显示
- `["zh", "en"]`（默认）— 两 mode 都参与（BBC / Bloomberg / WSJ / NYT 全球英文源 + AI 资讯源）

当前启用源（`enabled: true`）按 locale 分布：

| Locale | 启用源数 | 主要构成 |
|---|---|---|
| `zh` | 23 | 20 个全球英文源（附中文摘要）+ 3 个中文专属（V2EX / LinuxDo / DW 中文）|
| `en` | 22 | 20 个全球英文源 + 2 个英文社区（Hacker News + r/stocks）|

英文 mode 完整切换：HTML UI 文案、enrichment / digest / trading-commentary 三套 prompt、stance 词（"偏上行/偏下行/中性" → Bullish/Bearish/Neutral）、日期格式（zh-CN → en-GB）、Markdown 输出 —— 全部跟着 `REPORT_LOCALE` 切。**中文社区源在英文 mode 下被自动过滤掉**。

---

## 🤖 LLM 后端配置

项目通过 `LLM_BACKEND` 环境变量切换后端。**默认 `claude-cli`** —— 直接复用 Claude Code 已登录的认证，不需要额外配 API key。不用 Claude Code、或想走自己的 API key，按下表切换。

把 `.env.example` 复制成 `.env.local`（gitignored），按 backend 解开对应几行：

| backend | API key 环境变量 | 默认 model | base URL |
|---|---|---|---|
| 🎯 `claude-cli` （默认）| 不需要，复用 Claude Code OAuth | `sonnet` | — |
| 🧩 `codex-cli` | 不需要，复用本机 Codex 登录 | `gpt-5.6-sol` | — |
| 🟣 `anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | `api.anthropic.com` |
| 🟢 `openai` | `OPENAI_API_KEY` | `gpt-4o-mini` | `api.openai.com/v1` |
| 🐋 `deepseek` | `DEEPSEEK_API_KEY` | `deepseek-v4-flash` | `api.deepseek.com/v1` |
| 🔵 `minimax` | `MINIMAX_API_KEY` | `MiniMax-M2.7` | `api.minimax.io/v1` <sup>1</sup> |

<sup>1</sup> 中国大陆访问设 `MINIMAX_BASE_URL=https://api.minimaxi.com/v1`。

**通用覆盖项**：
- `LLM_MODEL=<id>` —— 任意 backend 的 model 都能用这个变量覆盖默认（如 `LLM_MODEL=gpt-4o` 走 openai 的更大模型）
- `<BACKEND>_BASE_URL` —— 走自托管代理 / 兼容服务（如 LM Studio / Ollama 跑 OpenAI 兼容接口 → `LLM_BACKEND=openai` + `OPENAI_BASE_URL=http://localhost:1234/v1`）

### 怎么选

| 你的情况 | 推荐 backend |
|---|---|
| 已经在用 Claude Code（任意订阅等级）| `claude-cli` — 零配置，按你订阅的等级走 |
| 不用 Claude Code，只想低成本跑日报 | `openai` 配 `gpt-4o-mini`、或 `deepseek` 配 `deepseek-v4-flash`（更便宜）|
| 中文摘要质量优先，预算可放宽 | `anthropic` 配 `claude-sonnet-4-6` |
| 国内网络访问，要规避 GFW | `deepseek` 或 `minimax`（都是国内厂商）|

**切 backend 不需要改代码**：所有 prompt 都在 `lib/ai/prompts.ts` 抽离，跟 backend 无关；JSON 错误兜底（`jsonrepair`）也是 backend-agnostic。切完后跑一次 `npm run daily`，进 `logs/llm-calls.jsonl` 看新 backend 的调用记录。

---

## 🌐 自托管部署（可选）

每次 `npm run daily` 跑完，自动把新 HTML 推到自己的服务器，访客打开 `https://your-domain/` 就能看到当天最新报告。**默认不启用**，环境变量不设就跳过。

### 一次性服务器准备

假设服务器跑 Ubuntu + nginx + 已申请域名，登录用户有 sudo NOPASSWD：

```bash
# 服务器上
sudo mkdir -p /var/www/your-domain && sudo chown -R www-data:www-data /var/www/your-domain
```

`/etc/nginx/sites-available/your-domain.conf`：

```nginx
server {
    listen 80;
    server_name your-domain;
    root /var/www/your-domain;
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

启用 + 自动签 SSL：

```bash
sudo ln -s /etc/nginx/sites-available/your-domain.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain --agree-tos --redirect
```

### 本地启用 auto-deploy

`.env.local`（gitignored）加两行：

```
DEPLOY_HOST=user@your-server-ip
DEPLOY_PATH=/var/www/your-domain
```

之后：
- ✅ 每次 `npm run daily` 跑完，自动 scp 当天 HTML 到服务器 + 刷新 `index.html`
- ✅ `npm run deploy [YYYY-MM-DD]` 手动推任意一天
- ✅ 部署失败不阻断 daily 本身（HTML 已经在本地 `daily_reports/` 落盘，可重跑 `npm run deploy` 补推）

---

## 💡 Claude Code 集成

装好后**任意目录**（不必 cd 进项目）打开 Claude Code 都可用：

| 触发 | 行为 |
|---|---|
| `/run-daily` | 立即触发 daily 并后台监听到完成。从任意目录都行 |
| `/check-daily` | 查任务状态 + 报告文件 + 配额 |
| 描述问题（"日报又挂了"、"X 推文为啥没更新"等）| `daily-brief` skill 的关键词触发自动加载，让 Claude 直接懂这个项目 |

**实现机制**：`scripts/install.mjs --global` 在 `~/.claude/` 下建符号链接，指向项目内的 [`.claude/skills/daily-brief/SKILL.md`](.claude/skills/daily-brief/SKILL.md) 和 [`.claude/commands/`](.claude/commands/) 文件——**单一源**，编辑项目文件等于编辑用户级 skill。当 symlink 因权限受限失败时（如 Windows 无开发者模式），自动 fallback 到 copy。`~/.daily-brief-config` 记录项目实际路径，让 slash command 在任意 cwd 都能找到项目。

---

## 📁 项目结构

```
daily-brief/
├── lib/
│   ├── sources/        # RSS / API / curl 抓取器；新加源在这里
│   ├── ai/             # 可插拔 LLM 后端 + 提示词（lib/ai/backends/ 下每个 backend）
│   ├── trading/        # Yahoo Finance + 技术指标
│   ├── financial-analysis/ # A股 / 美股市场分析
│   ├── academic-radar/ # 论文发现、摘要质量、去重与编号
│   ├── output/         # 渲染层 (HTML / Markdown)
│   └── utils.ts        # 小工具（todayKey / getReportTz）
├── scripts/
│   ├── _env.ts         # dotenv 预加载（被所有入口脚本第一个 import）
│   ├── daily.ts        # 主管线
│   ├── dry-run.ts      # 只抓取不调 LLM，验证数据源
│   ├── render.ts       # 重渲染
│   ├── regen-*.ts      # 局部重跑（trading / enrich）
│   ├── quota-report.ts # LLM 用量统计
│   ├── sources.ts      # `npm run sources` — 列源 + 校验 JSON
│   ├── run-daily.mjs   # OS 调度器调用的包装（含自动 deploy + open）
│   ├── open-report.mjs # 打开最新报告（跨平台）
│   ├── build-site.mjs  # 生成 GH Pages 静态站 (index + archive)
│   ├── validate-publish.mjs # 发布前确定性验收
│   ├── deploy-cloudflare-pages.mjs # 白名单上传 + 线上哈希核验
│   ├── run-and-archive.ps1 # 本机定时任务唯一控制入口
│   ├── deploy.mjs      # scp 到远端 nginx 服务器（可选）
│   ├── install.mjs     # 注册定时任务（Win/Mac/Linux 自适应）
│   └── uninstall.mjs   # 卸载
├── sources.config.json # 数据源唯一配置入口
├── daily_reports/      # 输出 (gitignored)
│   └── 2026-05-15/     # 每日一个子目录，内含 .html (主) / .json (缓存) / -articles.json (缓存)
│                       #   .md 默认不生成，可在 .env.local 设 OUTPUT_MARKDOWN=true 开启
├── public-dist/        # 仅包含可公开的 HTML / feed；GitHub Pages 发布白名单
├── cloudflare-redirect/ # 旧 pages.dev 地址到 GitHub Pages 的永久跳转
├── logs/               # 运行日志 (gitignored)
├── .github/workflows/  # GitHub Actions 工作流（A 方式部署）
└── .claude/
    ├── skills/         # Claude Code 操作 skill
    └── commands/       # slash commands
```

---

## 🗑️ 卸载

```bash
node scripts/uninstall.mjs
# 移除：定时任务 (Task Scheduler / launchd / cron) + ~/.claude/ 下的链接 + ~/.daily-brief-config
# 不动：项目文件、daily_reports/、logs/、power plan 设置
# 想彻底清理就 rm -rf 整个项目目录
```

---

## 🛠️ 自定义 / Fork

改源、改时间、改排版、加新栏目 —— 见 [FORKING.md](FORKING.md)。

## 📝 License

MIT
