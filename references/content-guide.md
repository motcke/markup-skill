# Content guide — turning a conversation into a page

Rules here are the skill's. Taste (what the user likes on a page) lives in `~/.markup/preferences.md` and wins where the two differ.

The page is for a reader who has not seen the conversation. They should understand in a minute what was decided, what is planned, where things stand, and what is still open — by scanning shapes, not reading paragraphs.

## 0. The smallest format that fits

Climb this ladder only as far as the content needs; every rung costs the reader more than the one below.

| Rung | Use when | Stop here when |
| --- | --- | --- |
| Sentence | one fact, one number | there is nothing to compare |
| Table | several things with the same attributes; anything enumerable | the reader compares by eye (add §6 marks) |
| Diagram (mermaid) | the point is a relationship or an order: flow, sequence, states, structure | the shape says it; a table of "A → B" rows does not |
| Chart (Chart.js) | named numbers to compare, a trend, a share | the eye needs magnitude, not the digits; the table stays under it (§5) |
| Interactive (`.whatif`) | the answer changes with an input the reader wants to move: price, count, date | a static chart would need five variants to say the same |

Go up a rung only when the rung below would need more than one instance to make the point. Never skip the table: a chart or an interactive block always carries its data as a table too.

## 1. Skeleton (default; adapt freely)

| # | Section | Component | When to drop |
| --- | --- | --- | --- |
| 0 | Title + one-line lead | `<h1>` + `<p class="lead">` | never |
| 1 | Headline numbers | `.kpis` (3–6 tiles: decisions, files, open questions, progress %) | fewer than 3 meaningful numbers |
| 2 | Goal and context | 2–4 short sentences, or `dl.kv` (goal / trigger / constraints / out of scope) | — |
| 3 | Decisions | `table.sortable` — # / decision / rationale / status; rejected options as rows with `<del>` or a "rejected" badge (in the page language) and the reason | no decisions were made |
| 4 | Topic sections | one `<h2>` per topic the conversation actually covered: architecture (mermaid flowchart / class), flows (sequence), data (ER / table), files (tree / table), comparisons (matrix), numbers (chart) | — |
| 5 | Execution plan | `ol.steps` for ≤ 8 steps; `table` with owner/status columns for more; `gantt` when dates matter | nothing is planned |
| 6 | Status | `.kanban` (done / in progress / next) or `ul.checklist` + `.progress` | — |
| 7 | Open questions | `table` — question / options / recommendation, or `ul.checklist` | none |

Other conversation types:

| Conversation | Structure |
| --- | --- |
| Bug investigation | symptom → reproduction (steps) → root cause (sequence or flowchart of the failing path) → fix options (matrix) → chosen fix + verification |
| Comparison / research | criteria matrix first, then one card per option, then recommendation callout |
| Open discussion | main points as cards, agreements vs disagreements as two columns (`.cols`), next steps |
| Review of existing code | structure diagram, findings table (severity sortable), suggested changes as diff blocks |

## 2. Content type → component

| Content | Use | Not |
| --- | --- | --- |
| Anything enumerable (options, files, endpoints, findings, decisions) | `table` (every column sorts: up, down, original); numeric cells `class="num"`; then §6 for what to color | bullet list |
| State per row (ok / partial / broken, pass / fail) | `td.tl.good / .mid / .bad` (§6) | words alone |
| Numbers per row to compare, percentages, changes | `data-heat` / `data-bar` / `data-delta` on the column (§6) | plain digits |
| Commands, SQL, code | `<pre><code class="language-sql">` (highlighted, copy button) | inline text |
| Process, pipeline, request path | mermaid `flowchart TD` (or `LR`; `RL` for a horizontal flow on an RTL page) | numbered prose |
| Interaction between components over time | mermaid `sequenceDiagram` | prose |
| Lifecycle / statuses | mermaid `stateDiagram-v2` | table |
| Data model | mermaid `erDiagram` or `classDiagram` | field lists |
| Hierarchy, breakdown of a topic | mermaid `mindmap` or `.tree` | nested bullets |
| Schedule with dates | mermaid `gantt`; without dates → `ul.timeline` | table of dates |
| Numbers by category | Chart.js `bar` (horizontal `indexAxis: 'y'` for long labels) | table only |
| Trend over time | Chart.js `line` | — |
| Share of a whole (≤ 6 slices) | Chart.js `doughnut` | pie with 12 slices |
| Multi-criteria score | Chart.js `radar` or a `.matrix` table | — |
| Ordered steps of a plan | `ol.steps` (mark `done` / `active`) | — |
| Work status | `.kanban` | — |
| Yes / no / partial across options | `table.matrix` with `td.yes / .no / .partial` | ✓ ✗ characters in plain cells |
| Key figures | `.kpis` | a sentence with numbers |
| Warnings, decisions, notes | `.callout.warn / .ok / .danger / .info / .note` | bold text |
| Before / after text or code | `.diff` | two code blocks |
| Long optional detail | `<details>` | omitting it |
| Alternatives side by side | `.tabs` or `.cols` | one after the other |

Rule of thumb: if you are about to write a paragraph with more than one "and", it is a table or a diagram.

## 3. Language and direction

- Write the page in the language of the conversation. `publish` detects the script (Hebrew, Arabic, Persian → RTL; Latin → LTR) and sets the direction and the UI language; no flag needed.
- Identifiers, paths and commands in `<code>`. Code blocks are always LTR.
- On an RTL page, put an English paragraph or list in `dir="ltr"`. A `.tree` follows the names inside it automatically (English paths → LTR, left-aligned); no attribute needed.
- No bidi control characters, ever (U+200E/U+200F/U+2066–2069). The page handles mixed text by itself.
- Numbers and dates in the reader's convention. Table headers short; long explanations go under the table, not inside cells.

## 4. Mermaid rules

- Flowchart node labels with spaces, punctuation or non-Latin letters go in quotes: `A["Load data"] --> B["Check"]`.
- Prefer `flowchart TD` (top-down). Horizontal flows: `flowchart LR`, or `RL` on an RTL page.
- Keep diagrams ≤ ~15 nodes; split larger ones by topic. Use `subgraph "Name"` for grouping.
- Style by meaning, sparingly, with the same three states as tables:
  `classDef good fill:#ecfdf5,stroke:#15803d; classDef mid fill:#fffbeb,stroke:#b45309; classDef bad fill:#fef2f2,stroke:#b91c1c;` then `class A,B good;`.
- Wrap a diagram in `<figure>` with a one-line `<figcaption>` (what it shows); same for charts.
- Sequence diagrams: participants with aliases and **no quotes**, `participant U as User` (quotes after `as` print literally). Message texts need no quotes either.
- stateDiagram: no quotes. State descriptions (`s1: Loading`) and transition labels (`a --> b: click`) print quotes literally; spaces and any script work there without them.
- Gantt needs `dateFormat YYYY-MM-DD` and real dates; without dates use `ul.timeline`.
- Put the code in `<pre class="mermaid">…</pre>` exactly — no extra indentation inside.

## 5. Chart.js rules

- `<div class="chart"><canvas data-chart='{…}'></canvas></div>` — the JSON is a normal Chart.js config (`type`, `data`, `options`). RTL legend and `maintainAspectRatio` are filled in automatically.
- **Colors must match meaning.** The default palette is neutral on purpose. Whenever a category means done / in progress / blocked / rejected, add `"tones": ["ok","info","danger",…]` to the dataset (one per slice or bar), or `"tone": "ok"` for a whole series. A category that reads as good must never come out red.
- Use single quotes around the attribute and double quotes inside the JSON; escape nothing else. Avoid `'` inside labels.
- Height: `.chart` = 280px, `.chart.short` = 200px, `.chart.tall` = 400px.
- Label every axis that is not obvious (`options.scales.y.title`).
- A value axis starts at zero (`"beginAtZero": true`) unless the point is the variation itself; then say in the figcaption that the axis is cut. Chart.js otherwise fits the axis to the data, and a flat 61 → 64 draws as a steep climb.
- **Every chart carries its data and its conclusion**: the `<figcaption>` states in one sentence what the chart shows, and a collapsed `<details><summary>Data</summary><table>…</table></details>` (summary in the page language) under the canvas holds the numbers (screen readers, print in gray, copy-paste). `check` prints a hint for a chart without a table or a figcaption. Snippet in components.md § Chart.js.
- Animation is off and labels never rotate (set in `plan.js`): the page is screenshotted constantly, and rotated labels are unreadable. Long category labels → horizontal bar (`indexAxis: 'y'`).

## 6. Visual encoding in tables (28/08)

A table is not finished when the data is in the cells. Before writing one, ask what in it can be read
by eye instead of by comparing digits, and mark it. A black-on-white table is the exception that
needs a reason. The marks are attributes; `plan.js` computes the colors, so every page colors the same
way and no hex is ever hand-picked. Snippets in `components.md` § "Table decorations".

| The column holds | Mark | Reads as |
| --- | --- | --- |
| bad / medium / good state | `<td class="tl bad|mid|good">` | red / amber / green cell with ✗ ~ ✓ |
| numbers to compare (who is high) | `<th data-heat>` (`data-heat="desc"` when low is the notable one) | white → blue gradient, legend under the table |
| numbers where high is good and low is bad | `<th data-heat="rg">` (`rg desc` when low is good) | red → amber → green gradient |
| numbers with a pass / fail line | `<th data-heat="rg" data-thresholds="50,80" data-labels="bad,medium,good">` | three bands, legend with the ranges |
| positive vs negative (change, delta, balance) | `<th data-heat="div">` (`data-center="100"` for another zero point) | red below, green above, white at the center |
| percent / progress / share of a target | `<th data-bar>` or per cell `<td data-bar="62/80">` | a fill behind the number |
| a series over time | `<td data-spark="3,5,4,8,9">` (`data-spark-good="down"` for costs, bugs, latency) | sparkline, green when it moves the good way, red when the bad way |
| change since last time | `<th data-delta>` or `<td data-delta="+3">` (`data-delta-good="down"` for costs, bugs, latency) | ▲ / ▼ chip in green or red by whether the change is good |
| a score to order by | `<th data-rank>` (`data-rank="asc"` when low wins) | 1 / 2 / 3 medallions, top three emphasized |
| the recommended / chosen option | `<tr class="pick">` | tinted row with ★ |
| a grid of one measure (roles × modules, months × areas) | `<table class="heatmap" data-heat="rg">` | one scale over the whole body |

Rules that keep this readable instead of noisy:

- One color, one meaning, per page. Green is "good" everywhere or nowhere; never "category B".
- Never color alone: every color carries a sign, a number, a bar or a chip too (red-green is invisible
  to ~8% of men, and the page is printed in gray sometimes).
- Direction is explicit. Costs, bugs, latency, open questions: low is good — say so with `desc` /
  `data-delta-good="down"`, or the scale lies.
- One encoding per column. A heat column is not also a bar column.
- The same applies outside tables: `tones` on charts, `classDef good/mid/bad` on mermaid nodes (§4),
  `.kpi` tiles with a `.bullet` (value vs target) and a `.delta`.

`check` prints a hint for every numeric column that has no encoding; a hint is a question, not an
order — a column of ids or years stays plain.

## 7. Anchoring and stability

- Every `<h2>` gets an `id` (English kebab-case). Keep ids and heading text stable between versions — change detection and comment re-anchoring key on them.
- Prefer many small blocks (rows, list items, cards) over one giant paragraph: comments attach to blocks.
- Do not renumber decisions between versions; append new ones.
