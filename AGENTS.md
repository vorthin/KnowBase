# KnowBase 知识库 · 维护与交接手册

> 这份文件是给**后续接手的开发者 / AI 智能体**看的操作手册。
> 目标：读完这份文件，就能独立完成「加内容、维护题库、构建发布、排查故障」，并且**不破坏项目既有的隐私约束**。

---

## 0. 关于这份文件本身（重要）

- **放在仓库根目录 `D:\KnowBase\AGENTS.md`，不要移到 `docs/` 里面。**
  本项目 `srcDir` 是 `docs/`，只有 `docs/` 下的 `.md` 会被构建成网页。根目录的文件不会发布，这是它应该待的地方。
- 同理：**任何不想被公网看到的文档，都不要放 `docs/`**。放根目录，或者加进 `srcExclude`（见第 2 节）。
- 每次完成结构性改动（新增栏目、改构建流程、改题库格式），请回来更新这份文件。

---

## 1. 项目速览

| 项 | 内容 |
|---|---|
| 站点名 | KnowBase |
| 技术栈 | VitePress 1.6.4 + Vue 3，纯静态站点 |
| 内容目录 | `docs/`（配置在根目录 `.vitepress/`） |
| 源码托管 | GitHub 私有仓库 |
| 线上构建 | Cloudflare Pages 推送后自动构建 |
| Node 版本 | **22**（见 `.nvmrc`；`package.json` 要求 >= 18） |
| 包管理 | npm（`package-lock.json` 已锁定） |

### 目录结构

```
D:\KnowBase\
├── AGENTS.md                 ← 本文件（不发布）
├── package.json              ← 脚本入口
├── .gitignore
├── .nvmrc                    ← Node 22
├── .nojekyll
├── cail\                     ← 课件素材
│   ├── *.pdf                 ← 原始 PDF，**不入库**（.gitignore: cail/*.pdf）
│   └── txt\*.txt             ← 提取出的文本，**入库**
├── source\知识库归类2\        ← 中级经济师原始资料（PDF 提取整理后的 md），**不入库**
├── docs\                     ← 所有网页内容（srcDir）
│   ├── index.md              ← 首页（layout: home）
│   ├── guide\getting-started.md
│   ├── notes\writing.md      ← Markdown 写作指南
│   ├── notes\deploy.md       ← ⚠️ 部署笔记，已被 srcExclude 排除，不发布
│   ├── public\               ← 原样拷贝到站点根目录的静态资源（当前为空）
│   ├── quiz\index.md         ← 刷题页（<Quiz /> 组件）
│   ├── 人力资源\             ← 中级经济师 · 人力资源管理（19 章）
│   │   ├── index.md          ← 栏目首页：考情分值总表 + 教材结构 + 进度追踪
│   │   └── 第X章-章名.md     ← 各章笔记 + 题库
│   ├── 工商管理\             ← 中级经济师 · 工商管理（11 章）
│   │   ├── index.md          ← 栏目首页：考试概览 + 章权重表 + 复习优先级
│   │   ├── 第X章-章名.md     ← 第 1～11 章
│   │   ├── 2026年真题速攻考点归纳.md
│   │   └── 历年真题\         ← 2017—2025 每年一份真题考点 + index.md
│   ├── 财政税收\             ← 中级经济师 · 财政税收（12 章）
│   │   ├── index.md
│   │   └── 第X章-章名.md     ← 第 1～12 章
│   ├── 经济基础\             ← 中级经济师 · 经济基础知识（37 章，六部分）
│   │   ├── index.md
│   │   └── 第X章-章名.md     ← 第 1～37 章
│   └── 经济师备考\           ← 跨专业备考资料（4 份，工商/财税通用）
│       ├── index.md          ← 备考总览：考试安排、题型分值、三轮复习法、答题技巧
│       ├── 公式与计算手册.md
│       ├── 数字与比例速记手册.md
│       └── 易混易错对比手册.md
├── scripts\
│   ├── gen-quiz.mjs          ← 题库抽取器（构建前自动跑）
│   ├── pdf2txt.mjs           ← PDF → txt 提取器
│   └── _*.mjs                ← 调试脚本，不入库
└── .vitepress\
    ├── config.mjs            ← 站点配置（导航 / 侧边栏 / 搜索 / srcExclude）
    ├── quiz-data.json        ← ⚠️ 构建时自动生成，**不入库**
    └── theme\
        ├── index.js
        └── Quiz.vue          ← 刷题组件
```

### 现有栏目与章节

- **中级经济师 · 人力资源管理**（`docs/人力资源/`），共 19 章，分三部分：
  - 第一部分 人力资源与社会保险政策：第 1～6 章
  - 第二部分 人力资源管理专业理论：第 7～12 章
  - 第三部分 人力资源管理实务：第 13～19 章
- **中级经济师 · 工商管理**（`docs/工商管理/`），共 11 章（第 1～11 章，无分部；2026 新教材：第 6 章「质量管理与安全生产管理」为新增章，原「电子商务」章已删，原 6—9 章顺延为 7—10 章），另含：
  - `2026年真题速攻考点归纳.md`（310 道押题按章节归类）
  - `历年真题/`（2017—2025 共 9 份真题考点梳理 + 栏目页 `历年真题/index.md`）
- **中级经济师 · 财政税收**（`docs/财政税收/`），共 12 章（第 1～12 章，无分部；2026 新教材口径）
- **中级经济师 · 经济基础知识**（`docs/经济基础/`），共 37 章，分六部分：经济学基础（1～10）、财政（11～17）、货币与金融（18～22）、统计（23～27）、会计（28～32）、法律（33～37）
- **中级经济师 · 备考资料（跨专业）**（`docs/经济师备考/`）：备考总览 + 公式与计算手册 + 数字与比例速记手册 + 易混易错对比手册
- **知识库**：快速开始
- **笔记**：Markdown 写作指南
- **刷题练习**：题库由脚本自动汇总，无独立内容页

### 当前题库状态（2026-09-27 核查）

- 总题数 **1947**：`choice` 单选/多选 1909、`blank` 填空 25、`qa` 问答 13
- 大类分布：人力资源管理 19 章（750 题）+ 经济基础 37 章（728 题）+ 财政税收 12 章（260 题）+ 工商管理 11 章（209 题）
- 题库源文件：各栏目章节 md，题目写在各章末尾小节里（工商「六、真题练习」与「八、押题改编练习（进题库）」；经济基础/财税「九、原创练习题（进题库）」）的 `quiz` 块
- id 前缀按栏目区分，避免跨栏目撞号：人力 `c<两位章号>-q<三位序号>`、工商 `gs<两位章号>-q<三位序号>`、财税 `ft<两位章号>-q<三位序号>`、经济基础 `jc<两位章号>-q<三位序号>`

---

## 2. 🔴 红线：不得公开的信息

这是本项目**最重要的约束**。站点部署在公网，任何人都能访问。以下信息已经被刻意移除，**接手后不得以任何形式加回去**：

| 不得出现 | 现状 / 原因 |
|---|---|
| 架构图页面 `autoapi-architecture.html` | 已删除，导航和侧边栏入口已移除 |
| 部署笔记 `/notes/deploy` | `docs/notes/deploy.md` 仍在本地，但已被 `srcExclude` 排除 |
| Cloudflare / Cloudflare Pages 字样 | 页脚已改为「基于 VitePress 构建」 |
| `knowbase-6p1.pages.dev` 等线上地址 | 已从所有发布内容中清除 |
| GitHub 仓库地址 `Vveip/KnowBase` | 社交链接只保留图标，指向 `https://github.com` |
| 本地绝对路径 `D:\KnowBase\` | 已改为 `<项目根目录>/` |
| 第三方培训课件原文（`source\知识库归类2\`、`cail\*.pdf`） | 不入库也不发布；只把**整理后的笔记**放进 `docs/` |
| 「相关链接」下拉、「系统架构图」入口 | 已从导航/侧边栏/首页移除 |

### 落实这些约束的代码位置（改配置时务必保留）

`.vitepress/config.mjs`：

```js
srcDir: 'docs',

// 只留在本地、不对外发布的页面：不参与构建，线上无法访问，也不会进本地搜索索引
srcExclude: ['**/notes/deploy.md'],   // ← 想隐藏某个页面，加到这里
```

### 核心原则：**「删链接」≠「不公开」**

VitePress 会把 `docs/` 下**所有** `.md` 构建成页面并加入本地搜索索引，
**即使导航和侧边栏里没有任何链接指向它**，别人直接猜 URL 照样能打开。

所以想让一个页面不对外可见，只有两个正确做法：

1. 把它加进 `srcExclude`（推荐，文件保留在本地）；
2. 把它移出 `docs/` 目录。

只删导航链接是没用的 —— 这是本项目建设初期踩过的坑。

---

## 3. 环境与命令

```powershell
# 首次：安装依赖（Node 22）
npm install

# 本地开发（热更新，默认 http://localhost:5173）
npm run docs:dev

# 本地构建 + 验证
npm run docs:build

# 本地预览构建产物
npm run docs:preview
```

`package.json` 里的脚本：

| 脚本 | 实际执行 | 用途 |
|---|---|---|
| `docs:dev` | `node scripts/gen-quiz.mjs && vitepress dev` | 开发 |
| `docs:build` | `node scripts/gen-quiz.mjs && vitepress build` | **构建（发布验证）** |
| `docs:preview` | `vitepress preview` | 预览 dist |
| `quiz` | `node scripts/gen-quiz.mjs` | 只重新生成题库 |

PDF 转文本（按需，可带关键词筛选）：

```powershell
node scripts\pdf2txt.mjs              # 转换 cail\ 下全部 PDF
node scripts\pdf2txt.mjs 第20章        # 只转文件名含「第20章」的
```

输出到 `cail\txt\*.txt`。

> ⚠️ **Windows / PowerShell 5.1 注意事项**
> PowerShell 5.1 **不支持 `&&`**，会报「标记"&&"不是此版本中的有效语句分隔符」。
> 请用分号或分行：
> ```powershell
> git add -A; git commit -m "docs: 新增第20章"
> ```
> 另外 PS 5.1 传中文参数给 git 偶发编码问题，提交信息建议用英文，或先用 `git log -1` 检查中文是否乱码。

---

## 4. 构建与发布机制

### 数据流

```
cail\*.pdf ──pdf2txt.mjs──▶ cail\txt\*.txt ──人工/AI 整理──▶ docs\<栏目>\第X章-xxx.md
                                                                        │
                                    npm run docs:build ◀──────────────┘
                                    ├─ scripts/gen-quiz.mjs  ──▶ .vitepress\quiz-data.json
                                    └─ vitepress build       ──▶ .vitepress\dist\
                                                                        │
                                    git push ──▶ Cloudflare Pages 自动重新构建 ──▶ 线上生效
```

> 工商 / 财税的内容不走 pdf2txt：源资料是 `source\知识库归类2\` 下已整理好的 md，
> 整理进 `docs\工商管理\`、`docs\财政税收\`、`docs\经济师备考\` 后同样由 gen-quiz.mjs 抽题库。

### 🔴 构建命令必须是 `npm run docs:build`

`.vitepress/theme/Quiz.vue` 第 8 行是**静态导入**：

```js
import rawData from '../quiz-data.json'
```

这意味着 `.vitepress/quiz-data.json` 必须在 VitePress 打包前就存在，
**直接跑 `npx vitepress build` 会构建失败**。

所以：
- 本地：只用 `npm run docs:build`（脚本会先跑 gen-quiz.mjs）。
- Cloudflare Pages 后台的 Build command 也必须配成 `npm run docs:build`
  （Output directory 是 `.vitepress/dist`）。**改这个配置前三思。**

### 哪些文件会进 Git，哪些不会

| 路径 | 提交？ | 说明 |
|---|---|---|
| `docs/**/*.md` | ✅ | 内容源文件 |
| `cail/txt/*.txt` | ✅ | 提取的教材文本 |
| `cail/*.pdf` | ❌ | 体积大，已忽略 |
| `.vitepress/config.mjs` | ✅ | 站点配置 |
| `.vitepress/theme/*` | ✅ | 主题组件 |
| `.vitepress/dist/` | ❌ | 构建产物，Cloudflare 自己构建 |
| `.vitepress/cache/` | ❌ | 缓存 |
| `.vitepress/quiz-data.json` | ❌ | 构建时自动生成 |
| `node_modules/` | ❌ | 依赖 |
| `dist-bak.7z` | ❌ | 本地整站备份，已忽略 |
| `dev.log` `dom*.html` `err*.txt` `scripts/_*.mjs` | ❌ | 调试产物 |
| `TASKS.md` `TASKS-*.md` `.claude/` | ❌ | AI 工作流本地笔记与工具设置，与站点运行无关 |
| `audits/` `scripts/audit-source.py` | ❌ | 私有资料审计的中间产物与本地脚本 |
| `scripts/pdf2txt.cjs` `scripts/pdf2txt.ps1` | ❌ | 已作废的旧 PDF 转换脚本（用 `pdf2txt.mjs`） |
| `AGENTS.md` | ✅ | 维护手册，放仓库根目录（不在 `srcDir` 内，不会发布） |

### 发布流程

```powershell
npm run docs:build        # 1. 本地验证（必做，见第 9 节）
git add -A                # 2. 暂存
git commit -m "docs: ..." # 3. 提交
git push                  # 4. 推送，Cloudflare 1~2 分钟后自动上线
```

**本地 build 不是发布动作，只是验证。** 真正让线上更新的是 `git push`。
但强烈建议每次推送前都本地 build 一次 —— 它是唯一能在推送前发现
「题库块写错、章节号没识别、链接写死」的机会。Cloudflare 那边构建失败没有即时通知。

> CDN 有缓存，push 后如果线上还是旧内容，等几分钟或去 Cloudflare 后台 Purge Cache。

---

## 5. 题库系统原理

题库**没有独立数据文件**，全部从各章笔记的 `quiz` 代码块里现抽。

```
docs\**\*.md 里的 ```quiz 块
        │  scripts/gen-quiz.mjs 扫描
        ▼
.vitepress\quiz-data.json   （构建时生成，不入库）
        │  Quiz.vue 静态 import
        ▼
docs\quiz\index.md 的 <Quiz /> 组件
```

### gen-quiz.mjs 行为细则

- 扫描范围：`docs/` 下所有 `.md`（跳过 `node_modules` `.git` `.vitepress` `dist` `cache` 及所有 `.` 开头目录）。
- **绝不 throw**：单个块解析失败只 warn 并跳过，继续处理其余块。
- 写出合法 JSON（哪怕空数组 `[]`）。
- `id` 重复时**保留第一个**，后面的跳过并 warn。
- 输出按「章节号 → id」排序，保证 git diff 稳定。
- `category` 字段取自该 md 文件** frontmatter 的 `title`**（不是文件名）。
- `major` 字段（专业大类）取自**文件所在的一级目录**（`docs/人力资源/` → 人力资源管理，`docs/工商管理/` → 工商管理，`docs/财政税收/` → 财政税收），映射表在脚本顶部 `MAJOR_BY_DIR`；新增大类目录时在那里加一行即可。刷题页的大类筛选、章节联动都依赖这个字段。
- `chapter` 字段取自**文件名**匹配 `/第(\d+)章/`，匹配不到就是 `null`。
- 输出里的「章节分布」只按 `第X章` 合并计数，**四个栏目的章号会叠加显示**
  （如 `第1章` 是人力 + 工商 + 财税 + 经济基础四栏第 1 章之和）。想看真实分布请看
  `major` / `category` 字段，或直接查 `.vitepress/quiz-data.json`。
- 四个栏目都有第 1～19 章号重名的章节，**`id` 必须带栏目前缀**
  （人力 `c` / 工商 `gs` / 财税 `ft` / 经济基础 `jc`），否则会被当成重复 id 静默跳过。

### Quiz.vue 组件能力

- 筛选：专业大类（major，多选组合，带题量统计和「全选」）/ 章节（category，随所选大类联动）/ 题型（type）/ 难度（difficulty）/ 只看错题（wrongOnly）
- 大类等筛选条件持久化在 localStorage（键名 `kb-quiz-filters-v1`），下次打开自动恢复
- 题目乱序、选项保持源文件 A/B/C… 顺序、三种题型判分、答错重出、错 2 次以上自动进错题本（错题本只统计当前所选大类）
- 选择题的 `@answer` 和部分 `@explanation` 引用原始选项字母；不要单独打乱选项并重新编号，否则答题卡上高亮、正确答案和解析会不一致。选项显示及答案文本封装在 `.vitepress/theme/quiz-choice.mjs`，回归测试在 `tests/quiz-choice.test.mjs`。
- 填空题的输入框数量按**题干空位数**（`______` 或空括号 `（ ）`）渲染，不按 `@answer` 的分隔个数；单空多候选「任填其一」，多空按顺序逐一对应。逻辑封装在 `.vitepress/theme/quiz-blank.mjs`，回归测试在 `tests/quiz-blank.test.mjs`。
- 进度持久化在 localStorage（键名 `kb-quiz-stats-v1`、`kb-quiz-wrong-v1`），换设备不互通
- 题目标签会显示：难度、category（章名）、`真题：source`（source 非空时）

> 刷题页 `/quiz/` 在顶部导航中是紧随「中级经济师」的独立入口；手机端导航折叠时，右上角还有直达的「刷题」按钮（`.vitepress/theme/MobileQuizShortcut.vue`，通过 `nav-bar-content-after` 插槽挂载）。下拉菜单与各栏目侧边栏均不重复放刷题链接；刷题页不显示章节侧边栏。
> 手机端题库筛选默认折叠、保留题量提示，点「筛选条件 / 重新开始」展开；桌面端筛选始终显示。改筛选后仍须点「开始 / 重新开始」使新条件生效。

### 🔴 陷阱：`srcExclude` 对题库抽取无效

`scripts/gen-quiz.mjs` 有**自己独立的 `collectMarkdown()`**，只跳过
`node_modules` `.git` `.vitepress` `dist` `cache` 和所有 `.` 开头目录，
**完全不读 `config.mjs` 里的 `srcExclude`**。

这意味着：即使某页面被 `srcExclude` 排除（比如 `notes/deploy.md`），
**它里面的 `quiz` 块仍然会被抽进 `quiz-data.json`，并随 JS bundle 公开发布**。

> 结论：**任何不想公开的内容里，绝对不要写 `quiz` 块。**
> 想隐藏页面用 `srcExclude`，想隐藏题目只能把 `quiz` 块从那个文件里删掉。
>
> 当前状态（已验证）：`docs/notes/deploy.md` 含 **0 个** quiz 块，题库数据中无部署笔记内容。

---

## 6. `quiz` 块格式规范

### 完整示例

````markdown
```quiz
---
id: c02-q001
type: choice
difficulty: 3
source: 2015多选
---
下列属于社会保险法律关系的是（　）。
A. 税务机关与用人单位因征收社会保险费产生的法律关系
B. 企业与劳动者因建立企业年金产生的法律关系
C. 社会保险经办机构与退休职工因支付基本养老金产生的法律关系
D. 社会保险行政部门与用人单位因认定工伤产生的法律关系
E. 商业保险公司与参加意外伤害险的职工因支付住院津贴产生的法律关系
@answer ACD
@explanation 考查社会保险法律关系的主体。商业保险不属于社会保险法律关系范畴。
```
````

> ⚠️ 写文档时 `quiz` 块本身要用 **三个反引号**，外层包裹请用四个（如上）。
> 实际章节笔记里就是三个反引号。

### 块内 frontmatter 字段

| 字段 | 必填 | 取值 | 说明 |
|---|---|---|---|
| `id` | 建议 | 字符串 | 缺省自动生成 `auto-<文件名>-<序号>`；**必须全站唯一**，重复会被跳过 |
| `type` | **必填** | `choice` / `blank` / `qa` | 其它值直接报错跳过 |
| `difficulty` | 否 | 数字，默认 `2` | 1 容易 → 3 困难，用于难度筛选 |
| `source` | 否 | 字符串 | 显示为「真题：xxx」标签，如 `2015多选`、`2024案例` |

### 三种题型的写法

**① choice（选择题，唯一有实测示例的类型）**

- 选项行格式：`A. 选项内容`，字母 A–E，分隔符支持 `.` `．` `、` `)` `）` `:` `：`
- 题干写在选项之前，可多行
- `@answer ACD` —— 多个字母连写，会自动去重排序
- 选项**少于 2 个**或 **缺 `@answer`** → 整块跳过

> **案例分析题也要写成 `choice`**：`gen-quiz.mjs` / `Quiz.vue` 只有 `choice` / `blank` / `qa` 三种类型，
> 中级经济师的「案例分析题（不定项）」本质是多选，统一按 `type: choice` 写，`difficulty: 3`。

**② blank（填空题，全库 25 题，判分逻辑有回归测试）**

```quiz
---
id: ft01-q011
type: blank
difficulty: 2
---
在财政政策中，无需借助外力、能够随经济周期自动发挥调节作用的机制被称为______。
@answer 内在稳定器 | 自动稳定器 | 内在稳定器（自动稳定器）
@explanation 内在稳定器（也称自动稳定器）主要包括收入端的累进所得税制和支出端的转移性支出。
```

- **题干必须有空位标记**：连续两个及以上下划线 `______`，或空括号 `（ ）`。
  输入框数量按题干空位数渲染（`（AVC）`、`（填"之上"或"之下"）` 这类有内容的括号不算空位）。
- **单空**：`@answer` 用 `|` `｜` `;` `；` 分隔多个**可接受答案，任填其一即判对**，
  结果里会显示「任一：A ｜ B」。例：`@answer 两 | 2 | 二`。
- **多空**：`@answer` 按题干空位顺序逐一对应，顺序颠倒判错。
  建议在题干末尾加注（如「（按"前空|后空"顺序填写）」）说明填写顺序。
- 判分时会做全角→半角、去空白标点、转小写后比较
- 逻辑封装在 `.vitepress/theme/quiz-blank.mjs`，回归测试在 `tests/quiz-blank.test.mjs`

**③ qa（简答题，全库 13 题）**

```quiz
---
id: ft09-q011
type: qa
difficulty: 2
---
请简述地方政府一般债券与专项债券在偿债来源上的主要区别。
@answer 一般债券以地方一般公共预算收入作为偿债来源，专项债券以对应的政府性基金收入或项目专项收入作为偿债来源。
@explanation 见《预算法》及地方政府债券发行管理相关规定。
```

- `answer` 存原文字符串，界面上是「显示参考答案」形式，不做严格比对

### 🔴 五个必须避开的坑

1. **题干里不要以 `---` 开头** —— 块内第一个 `---...---` 会被当成 frontmatter 吃掉。
2. **选项必须连续写完，中间不要插普通文字** —— 一旦进入 options 模式，
   任何非空、非 `@` 指令、又不匹配选项格式的行，会被**追加到上一个选项的文本后面**。
   正确顺序永远是：题干 → 选项 → `@answer` → `@explanation`。
3. **`@answer` / `@explanation` 必须位于行首**（允许前导空格，但指令本身要在行首）。
   拼成 `@anser` 这类 typo 会被当未知指令忽略 → choice 题报「缺少 @answer」→ 整块被跳过。
4. **`id` 全站唯一**。按栏目区分前缀，新增章节往后顺延，不要复用旧号：

   | 栏目 | id 规则 | 示例 |
   |---|---|---|
   | 人力资源管理 | `c<两位章号>-q<三位序号>` | `c02-q001` |
   | 工商管理 | `gs<两位章号>-q<三位序号>` | `gs01-q001` |
   | 财政税收 | `ft<两位章号>-q<三位序号>` | `ft06-q009` |
   | 经济基础 | `jc<两位章号>-q<三位序号>` | `jc14-q001` |

   > 四个栏目都有第 1～19 章号重名的章节，`id` 撞号会被静默跳过（保留第一个），
   > 必须靠前缀区分。
5. **章节文件名必须含阿拉伯数字「第X章」**。写 `第二章-xxx.md` 会导致
   `chapter` 为 `null`，题目在刷题页归入「未识别章节」，按章节筛选就废了。

---

## 7. 新增 / 完善内容的完整流程

四个中级经济师栏目（人力 / 工商 / 财税 / 经济基础）的流程完全一致，只是目录、id 前缀和栏目首页不同。

以「人力新增第 20 章」为例（其他栏目同理，换目录和 id 前缀即可）：

### Step 1 — PDF 转文本

```powershell
node scripts\pdf2txt.mjs 第20章
# 产出 cail\txt\....txt
```

> 没有自动 PDF→md 的工具，**从 txt 到 md 必须人工或 AI 整理**。
> 工商 / 财税的资料来自 `source\知识库归类2\`（已整理好的 md），不需要走 pdf2txt。

### Step 2 — 按模板写笔记

新建 `docs\人力资源\第20章-章名.md`，模板（详见 `docs\人力资源\index.md`「六、内容组织方式」）：

工商 / 财税章节用的是**七段式 + 真题练习**模板，详见 `docs\工商管理\index.md`「五、内容组织方式」：

```markdown
---
title: 第20章 章名
description: 一句话摘要 —— 6套真题累计X分
---

# 第20章　章名

## 一、考情概况
## 二、知识框架
## 三、核心知识点
## 四、高频考点汇总
## 五、易混点对比
## 六、本章题目
（```quiz 题库块）
```

要点：
- frontmatter 的 `title` **会变成刷题页的栏目标签**，写 `第20章 章名`。
- 章节号在文件名里，不在 frontmatter 里。
- 现有文件命名不统一（`第01章-...` 补零 vs `第2章-...` 不补零），两种都能跑，
  但**新增建议统一不补零**，并且文件名必须和侧边栏链接完全一致。

### Step 3 — 登记侧边栏（最容易忘）

`.vitepress\config.mjs` → `sidebar` 是按路径划分的对象；选择对应栏目路径键（例如 `'/人力资源/'`）下的 `items`：

```js
{ text: '第 20 章 章名', link: '/人力资源/第20章-章名' }
```

link **不带 `.md` 后缀**，路径必须和文件名对应。

> `sidebar` 中 `/人力资源/`、`/工商管理/`、`/财政税收/`、`/经济基础/` 各自只显示本专业分组；`/经济师备考/` 独立展示跨专业资料；`/guide/`、`/notes/` 各有独立侧栏；`/quiz/` 留空。切换专业请使用顶部「中级经济师」下拉（手机端打开导航菜单）。
> 新增栏目时必须添加该栏目自己的路径键与章节链接，并在 `nav` 的「中级经济师」下拉添加入口。不要把新章节追加到别的专业路径键下，也不要为了隐藏页面而仅移除侧边栏链接（见第 2 节隐私红线）。

### Step 4 — 登记进度表与结构表

对应栏目的 `index.md`：

- 「二、真实教材结构」对应部分的表格加一行（人力）／「二、教材结构与章权重」表格加一行（工商 / 财税）
- 「五、学习进度追踪」表格加一行
- 人力栏目还要更新「三、考情分值总表」；工商栏目还要更新「三、真题与冲刺资料」

> 另外：**凡是在正文或备考总览里用 `[xxx](/栏目/页面)` 引用了某个页面，那个页面就必须存在**，
> 否则 VitePress 构建时死链检查会失败（`docs/工商管理/历年真题/index.md` 就是为这个存在的）。

### Step 5 — 构建验证 + 推送

```powershell
npm run docs:build
```

**必须检查输出最后几行**：

```
扫描文件：97 个 markdown
共解析 1717 题 → .vitepress/quiz-data.json
题型分布：choice=...  blank=...  qa=...
大类分布：人力资源管理=750  经济基础=728  财政税收=142  工商管理=97
跳过 0 块          ← 必须是 0，否则新内容有格式错误
```

> 以上数字为预期值，**以实际构建输出为准**；不一致时以输出为准更新本手册「当前题库状态」。

「跳过」不为 0 就往翻 warn，会指出 `文件:行号 → 原因`。

```powershell
git add -A; git commit -m "docs: add chapter 20"; git push
```

### 快速核对清单

- [ ] `docs\人力资源\第20章-章名.md` 已创建，文件名含「第20章」
- [ ] frontmatter `title` = `第20章 章名`（会成为刷题页的 category 标签）
- [ ] 至少一个 `quiz` 块，`id` 不撞号（用对栏目前缀），`type` 合法
- [ ] `config.mjs` sidebar 已加链接
- [ ] 栏目 `index.md` 进度表 / 结构表已更新
- [ ] 正文引用的每个 `/栏目/页面` 都有对应文件（无死链）
- [ ] `npm run docs:build` 显示「跳过 0 块」
- [ ] 已 push，线上验证页面能打开、题库能刷到

---

## 8. 题库日常维护

### 改题
直接改对应章节 md 里的 `quiz` 块，改完 `npm run docs:build`。**不需要动任何其它文件。**

### 删题
删掉整个 `quiz` 块。注意别留下孤立的 `@answer` / `@explanation`。

### 查重 / 查漏

```powershell
node scripts\gen-quiz.mjs        # 只看输出，不构建
```

输出会列出：扫描文件数、总题数、题型分布、章节分布、跳过列表。
「章节分布」里出现 `(未识别章节)` 就是有文件名不合规（见第 6 节坑 5）。

### 改难度 / 改来源
改块内的 `difficulty` / `source` 字段即可，即时生效。

### 注意：题库是「现抽」的，不是快照

`.vitepress/quiz-data.json` 不入库、每次构建重新生成。
所以**任何章节笔记的改动都会影响题库**，改笔记时留意别顺手破坏了 quiz 块。

---

## 9. 排错手册

| 现象 | 原因 | 处理 |
|---|---|---|
| `Cannot find module '../quiz-data.json'` / 打包失败 | 直接跑了 `vitepress build`，没先跑 gen-quiz | 用 `npm run docs:build` |
| 题库数量莫名变少 | quiz 块格式错误被静默跳过 | 看构建输出的「跳过 N 块」和 warn 行号 |
| 章节分布出现 `(未识别章节)` | 文件名不含「第X章」阿拉伯数字 | 重命名文件，同步改侧边栏链接 |
| 新章节侧边栏看不到 | 忘了在 `config.mjs` sidebar 登记 | 补 items（见第 7 节 Step 3） |
| 页面存在但搜不到 | 不会发生 —— 所有构建出的页面都进索引；搜不到说明没构建成功 | 检查 build 输出 |
| `Dead link` 构建失败 | 导航/侧边栏/正文链接指向不存在的页面 | 修正链接，或给该页面补 `srcExclude` |
| push 后线上没变化 | CDN 缓存 / Cloudflare 构建失败 | 等几分钟，或去后台看构建日志、Purge Cache |
| PowerShell 报 `&&` 错误 | PS 5.1 不支持 `&&` | 改用 `;` 或分行 |
| 中文提交信息乱码 | PS 5.1 编码问题 | 用英文提交信息，或 `git commit --amend -F msg.txt` |
| 页面「不想要它公开」 | 只删链接不够 | 加进 `srcExclude`，或移出 `docs/` |

---

## 10. 已知问题与改进建议

按优先级排列，接手后可以挑着做：

1. ~~**`blank` / `qa` 题型全库零示例，未经端到端实测。**~~
   **已收官（2026-10-10）**：`blank` 25 题 / `qa` 13 题均已入题库；
   判分与输入框数量逻辑封装在 `.vitepress/theme/quiz-blank.mjs`，
   回归测试 `tests/quiz-blank.test.mjs`（7 个用例，含 4 道真实题的回归）。
   历史 bug：曾按「`@answer` 分隔个数」渲染输入框，导致单空多候选的题
   （`ft01-q011` / `jc19-q006` / `jc22-q004` / `jc33-q010`）渲染出 2~3 个输入框
   且要求按序全部填对，实际永远判错。现已改为按题干空位数渲染、单空任填其一。
   **新增填空题时务必在题干里写空位标记（`______` 或 `（ ）`）**，否则无法判定空数。

2. **章节文件命名不统一**：`第01章-劳动合同管理与特殊用工.md`（补零）vs `第2章-社会保险法律.md`（不补零）。
   功能不受影响，但检索和排序难看。人力栏目两种混用；**工商 / 财税新栏目已统一为不补零**，
   建议以后新文件一律不补零。

3. **`quiz` 块在章节页面里显示为代码块**。主题没有注册 `quiz` fence 的渲染器
   （`.vitepress/theme/index.js` 未覆盖 markdown 配置），所以章节页上的题库块会按普通代码块展示，
   构建时还会打若干条 `The language 'quiz' is not loaded` 警告。**刷题入口只有 `/quiz/`**。
   三个栏目都是同一套既有行为，不影响题库抽取；若想改，可在 theme 里加 `markdown.config`，属于体验优化项。

4. **`docs/public/` 已空置**。原架构图文件已删除。若将来要放独立 HTML / 图片 / PDF，
   放这里即可原样发布到站点根目录 —— **但先确认它不含敏感信息**。

4. **侧边栏和进度表靠手工维护**，新增章节容易漏。可以考虑写个脚本校验：
   `docs/人力资源/` 下的 md 是否都在 `config.mjs` sidebar 里有对应链接。
   （这类校验脚本请按 `scripts/_check.mjs` 命名，会被 .gitignore 忽略；要长期保留就去掉下划线前缀。）

5. **Cloudflare Pages 构建失败无通知**。有条件可以接一个构建失败的 webhook 通知。

6. **`gen-quiz.mjs` 的 `pdf2txt.mjs` 里硬编码了 `D:\KnowBase\cail` 路径**，
   换机器部署会失效。建议改成基于 `import.meta.url` 的相对路径（`gen-quiz.mjs` 已经是这么写的，可以参考）。

---

## 11. 文件职责速查

| 想干什么 | 改哪个文件 |
|---|---|
| 改导航 / 侧边栏 / 页脚 / 搜索 / 隐藏页面 | `.vitepress/config.mjs` |
| 改首页标语、特性卡片、首页板块 | `docs/index.md` |
| 新增/修改某一章笔记和题目 | `docs/人力资源/第X章-章名.md`、`docs/工商管理/第X章-章名.md`、`docs/财政税收/第X章-章名.md` |
| 改考情分值、教材结构、学习进度 | 对应栏目的 `index.md`（`docs/人力资源/`、`docs/工商管理/`、`docs/财政税收/`） |
| 改历年真题索引 | `docs/工商管理/历年真题/index.md` |
| 改跨专业备考资料（总览 / 公式 / 数字 / 易混） | `docs/经济师备考/*.md` |
| 改刷题页交互、判分逻辑、UI | `.vitepress/theme/Quiz.vue` |
| 改选择题答案/选项显示对齐 | `.vitepress/theme/quiz-choice.mjs`（测试 `tests/quiz-choice.test.mjs`） |
| 改填空题输入框数量/判分 | `.vitepress/theme/quiz-blank.mjs`（测试 `tests/quiz-blank.test.mjs`） |
| 改题库抽取规则、字段、排序 | `scripts/gen-quiz.mjs` |
| 改 PDF 提取逻辑 | `scripts/pdf2txt.mjs` |
| 改依赖 / 脚本命令 | `package.json` |
| 控制哪些文件不入库 | `.gitignore` |
| 控制哪些页面不发布 | `config.mjs` 的 `srcExclude` |

---

## 附：一次典型的完整改动示例

> 场景：把「2026环球网校直播早课-中级人力高频错题-第1期.pdf」里的题补进第 3 章题库。

```powershell
# 1. 已有 txt（cail\txt\ 里），跳过转换；没有则：
node scripts\pdf2txt.mjs 高频错题-第1期

# 2. 编辑 docs\人力资源\第3章-社会保险体系.md
#    在「六、本章题目」里追加 quiz 块，id 顺延为 c03-q0XX

# 3. 本地验证
npm run docs:build
#    确认输出「跳过 0 块」，且章节分布里 第3章 题数增加了

# 4. 本地看一眼（可选）
npm run docs:dev
#    浏览器开 http://localhost:5173/quiz/ ，筛选栏目=第3章 社会保险体系

# 5. 提交推送
git add -A
git commit -m "docs: add high-frequency wrong questions to chapter 3"
git push
```

侧边栏、题库、搜索**全部自动生效**，不需要任何额外登记 —— 因为改的是已有章节的已有文件。

---

## 12. 新增原始资料的入库前审查（2026-09-26 起）

- `source/第二批材料260926/` 是**不发布**的原始素材及整理成果；已忽略在 Git 中。不得直接移动/复制整批文件到 `docs/`，即使页面未加入导航，也会被 VitePress 发布。
- 入库前运行 `python3 scripts/audit-source.py`，与 `source/知识库归类2/`、当前 `docs/` 对照。结果位于根目录 `audits/source-2026-09-26/`，包括按文件的 `manifest.csv`、按 SHA-256 的 `exact-duplicates.csv`、人工复核用的 `near-candidates.csv`、同章映射 `chapter-mapping.csv`、报告 `README.md`；**整个 `audits/` 不得搬进 `docs/`**。
- 路径分类和相似度算法只是初筛。`near-candidates.csv` 不足以证明两文件相同；不上榜也不能证明知识点/题目不重复。逐知识点和逐题去重、答案解析核验仍须在按章入库阶段进行，并记录不同版本间的事实冲突。
- 已整理来源的财税分章与现有页面不一致（来源 12 章、本站 7 章）：先核查新旧章节映射、教材依据、变化时间，再改导航/路径/题库；不要把新第 8—12 章简单追加到旧版 7 章后。
- 第三方课件、原题、`_原始文本`、`_处理记录` 等不可直接发布；出题采用经核对知识点编写的新题。未经证实的「2026 真题」、缺答案或来源冲突的题目不得作为已核实真题或有效题入库。
- 输出目录固定在仓库根目录，不属于 VitePress 的 `docs/`；发布前仍需检查 `srcExclude` 之外的页面和题库生成数据（`gen-quiz.mjs` 不读取 `srcExclude`）。
