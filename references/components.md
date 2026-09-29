# Components — copy-paste snippets

All classes are defined in `assets/plan.css`; behaviour (sorting, tabs, charts, mermaid) in `assets/plan.js`. Everything works in RTL and LTR.

Examples are in English. Write the page in the language of the conversation; on RTL pages the layout flips by itself.

**Read only what you use.** Every section is a `## ` heading; `grep -n "^## " components.md` gives their lines; read each section you need from its heading to the next one. Nearly every page needs *Page top*, *KPI tiles*, *Table* and *Table decorations*; the rest is by content:

| Content | Section |
| --- | --- |
| Headline numbers, a target, a change | KPI tiles · KPI extras |
| Anything enumerable, states, numbers per row | Table · Table decorations · Comparison matrix |
| Flow, sequence, states, data model | Mermaid · Figure with caption |
| Numbers by category or over time | Chart.js |
| Plan and status | Steps · Timeline · Kanban · Checklist + progress |
| Options side by side, optional detail | Cards · Two / three columns · Tabs · Collapsible detail |
| A choice the user must make | Selectable question |
| A number that depends on an input | What-if block |
| Code, files, changes | Code · File tree · Diff |
| Warnings, notes, key / value facts | Callouts · Key / value |
| Screenshots | Images |

## Page top

```html
<h1>Clerk production cutover</h1>
<p class="lead">The cutover plan, the decisions made, and what's still open.</p>
```

## KPI tiles

```html
<div class="kpis">
  <div class="kpi"><div class="n">28</div><div class="l">Decisions</div></div>
  <div class="kpi ok"><div class="n">7</div><div class="l">New files</div></div>
  <div class="kpi warn"><div class="n">3</div><div class="l">Open questions</div></div>
  <div class="kpi"><div class="n">60%</div><div class="l">Progress</div></div>
</div>
```

## Key / value

```html
<dl class="kv">
  <dt>Goal</dt><dd>…</dd>
  <dt>Out of scope</dt><dd>…</dd>
</dl>
```

## Table (sortable, numeric column, status badges)

```html
<table class="sortable">
  <thead><tr><th>#</th><th>Decision</th><th>Reason</th><th class="num">Cost</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>D1</td><td>Global skill</td><td>Available in every project</td><td class="num" data-sort="0">0</td><td><span class="badge ok">Approved</span></td></tr>
    <tr><td>D1a</td><td><del>Inside the repo</del></td><td>Available in only one project</td><td class="num">—</td><td><span class="badge muted">Rejected</span></td></tr>
  </tbody>
</table>
```
Every table with a header row sorts by any column: click = ascending, again = descending, again = the original order (`data-sort="off"` on the table opts out; the `sortable` class is added automatically). `data-sort` on a cell overrides its sort value. Badge variants: `ok`, `warn`, `danger`, `info`, `muted`, default gray.

## Table decorations (color by meaning — see content-guide §6)

Attributes on the `<th>` apply to the whole column; the page computes the colors and adds a legend.

```html
<table class="sortable">
  <thead><tr>
    <th>Area</th>
    <th>State</th>
    <th data-heat>Lines of code</th>                               <!-- white → blue, high = dark; data-heat="desc" when low is the notable one -->
    <th data-bar>Coverage %</th>                                   <!-- fill behind the number, 0–100 (or data-bar-max="80") -->
    <th data-delta data-delta-good="down">Bugs (change)</th>       <!-- ▲/▼ chips; "down" = a drop is good -->
    <th>Trend</th>
    <th data-rank>Score</th>                                       <!-- 1/2/3 medallions; data-rank="asc" when low wins -->
  </tr></thead>
  <tbody>
    <tr class="pick"><td>Contacts</td><td class="tl good">OK</td><td>4,210</td><td>82</td><td>-3</td><td data-spark="8,7,7,5,4,3">3</td><td>91</td></tr>
    <tr><td>Maamadot</td><td class="tl mid">Partial</td><td>2,980</td><td>55</td><td>+2</td><td data-spark="2,3,3,4,5,6">6</td><td>74</td></tr>
    <tr><td>Shtieblach</td><td class="tl bad">Stuck</td><td>1,120</td><td data-bar="62/80">62 of 80</td><td>0</td><td data-spark="4,4,4,4">4</td><td>40</td></tr>
  </tbody>
</table>
```

| Mark | Variants |
| --- | --- |
| `td.tl` | `good` / `mid` / `bad` — colored cell with ✓ ~ ✗ |
| `th[data-heat]` | `""` sequential blue · `"desc"` · `"rg"` red→green · `"rg desc"` · `"div"` diverging around `data-center` (default 0) · `data-thresholds="50,80"` bands · `data-labels="Poor,Average,Good"` · `data-legend="…"` legend title (default: the header text) |
| `th[data-bar]` / `td[data-bar]` | column: every number becomes a bar of 0–100 (or `data-bar-max`); cell: `data-bar="62"` or `data-bar="62/80"`; `data-tone="ok|warn|danger|muted"` recolors; empty cell text → the page writes the value |
| `td[data-spark]` | comma-separated numbers; green when the last is above the first, red when below; `data-spark-good="down"` (on the cell or the column's `th`) inverts that for costs, bugs, latency, like `data-delta-good`; `data-tone` overrides |
| `th[data-delta]` / `td[data-delta]` | sign decides ▲/▼; `data-delta-good="down"` inverts the colors (costs, bugs, latency) |
| `th[data-rank]` | ranks by value, ties share a rank; `"asc"` = lowest first |
| `tr.pick` | the recommended / chosen row (tint + ★) |
| `table.heatmap[data-heat]` | one scale over every numeric cell of the body (roles × modules) |
| `table[data-filter]` | force (`""`) or suppress (`"off"`) the filter box; default: shown above 12 rows. Header sticks above 8 rows |

Whole-table heatmap:

```html
<table class="heatmap" data-heat="rg" data-legend="Permissions">
  <thead><tr><th></th><th>admin</th><th>gabbai</th><th>user</th></tr></thead>
  <tbody>
    <tr><td>Contacts</td><td>12</td><td>4</td><td>2</td></tr>
    <tr><td>Maamadot</td><td>10</td><td>0</td><td>0</td></tr>
  </tbody>
</table>
```

## KPI extras: target bar and delta

```html
<div class="kpi ok"><div class="n">31</div><div class="l">Decisions</div><div class="delta up">▲ 3</div></div>
<div class="kpi"><div class="n">60%</div><div class="l">Progress</div><div class="bullet" style="--v:60;--t:100;--m:80"></div></div>
```
`--v` value, `--t` target (100%), `--m` optional marker (the bar to beat). `.delta.up / .down / .flat`.

## Code (highlighted, with a copy button)

```html
<pre><code class="language-sql">SELECT "Id" FROM "Contacts" WHERE "TenantId" = 3;</code></pre>
```
Languages in the vendored build: `sql`, `typescript`, `javascript`, `csharp`, `bash`, `json`, `yaml`, `xml`/`html`, `css`, `scss`, `python`, `diff`, `plaintext`. Without a `language-*` class the page auto-detects only when confident; `class="nohighlight"` opts out. Every `<pre>` gets a copy button on hover.

## Figure with caption (diagrams, charts, screenshots)

```html
<figure>
  <pre class="mermaid">…</pre>
  <figcaption>The publish path: what happens between writing the content and opening the page</figcaption>
</figure>
```

## Comparison matrix

```html
<table class="matrix">
  <thead><tr><th>Criterion</th><th>mermaid</th><th>Chart.js</th><th>vis-network</th></tr></thead>
  <tbody>
    <tr><td>Works offline</td><td class="yes"></td><td class="yes"></td><td class="yes"></td></tr>
    <tr><td>Quantitative charts</td><td class="no"></td><td class="yes"></td><td class="partial"></td></tr>
  </tbody>
</table>
```
Cells `yes` / `no` / `partial` render ✓ / ✗ / ~ with colors; leave them empty or add a short note.

## Cards

```html
<div class="cards">
  <div class="card accent"><h4>Server</h4><p>Node with no dependencies, port assigned per project.</p></div>
  <div class="card ok"><h4>Template</h4><ul><li>TOC</li><li>Comments</li></ul></div>
  <div class="card warn"><h4>Risk</h4><p>…</p></div>
</div>
```

## Two / three columns

```html
<div class="cols">
  <div><h4>Pros</h4><ul>…</ul></div>
  <div><h4>Cons</h4><ul>…</ul></div>
</div>
<div class="cols three">…</div>
```

## Steps (execution plan)

```html
<ol class="steps">
  <li class="done"><strong>Planning</strong><span class="small">28 decisions</span></li>
  <li class="active"><strong>Implementation</strong><span class="small">Server + template</span></li>
  <li class="blocked"><strong>Verification</strong><span class="small">Blocked: waiting for staging access</span></li>
  <li><strong>Documentation</strong></li>
</ol>
```
States: `done` (green ✓), `active` (blue), `blocked` (red). A blocked step says what it waits for in its text, since color alone carries no meaning.

## Timeline (no exact dates)

```html
<ul class="timeline">
  <li class="done"><span class="when">August</span><strong>Dashboard setup</strong> — DNS, JWT template</li>
  <li class="now"><span class="when">This week</span><strong>cutover</strong></li>
  <li><span class="when">After</span>Clean up old code</li>
</ul>
```

## Kanban

```html
<div class="kanban">
  <div class="col"><h4>Done <span>3</span></h4><div class="item">Server</div><div class="item">Template</div><div class="item">CSS</div></div>
  <div class="col"><h4>In progress <span>1</span></h4><div class="item">Browser verification</div></div>
  <div class="col"><h4>Next</h4><div class="item">Documentation</div></div>
</div>
```

## Checklist + progress

```html
<div class="progress"><span class="ok" style="width:60%"></span><span class="warn" style="width:15%"></span></div>
<ul class="checklist">
  <li class="done">Server is running</li>
  <li class="done">Comments are saved</li>
  <li>Mark as "updated"</li>
</ul>
```

## Selectable question (the pick is an answer)

Use for clarifying questions instead of a table of options: each option on its own line, radio or
checkbox, the recommended one first with the `q-rec` pill, a "Skip" option, free text as a
`<textarea data-free>` (grows with the text, no length limit). Every change is saved on the server
(`answers.json`) and restored on reload; `comments` prints new picks to the agent. Each question also
takes attachments (paperclip button and image paste, added by the page), printed as `attachment:`
lines like a comment's.

```html
<div class="q" data-q="Q3" data-type="single">   <!-- data-type: single | multi; data-cat optional, see "Guide" below -->
  <div class="q-title">Q3. Where does the tree open?</div>
  <div class="q-note">Short context, if needed.</div>
  <label><input type="radio" name="q-Q3" value="1"><span><span class="q-rec">Recommended</span> Modal over the card</span></label>
  <label><input type="radio" name="q-Q3" value="2"><span>Navigate to /family page</span></label>
  <label><input type="radio" name="q-Q3" value="3"><span>Skip, decide later</span></label>
  <textarea data-free placeholder="Explanation or another option"></textarea>
</div>
```
`data-q` must be unique per plan and stable between versions. Keep the value numbers stable too.

**Guide.** Two or more `.q` blocks written one after the other (no other element between them) become
one guide: a bounded box with a heading ("Questions"), a step strip on top (numbered circles joined by a
line, the question title under each, ✓ and green when answered), one question on screen, and "Previous"
/ "Next" side by side right under the question ("Next" is the primary button and goes to the next
unanswered one; at the end of the box it jumps to the next unanswered question anywhere on the page).
`1`–`9` pick an option and `Enter` moves on. With more than ~7 questions add `data-cat="…"` to every
block and write the blocks of one category together: each category becomes its own box, headed
"Questions about <cat>" and numbered from 1 (no category tabs — they read as unrelated to the questions).
Leave `data-cat` off when the questions do not share one topic: a box headed "Questions about Retry
schedule" over a question on who owns support and one on markets misleads the reader.
A single `.q` stays a plain block. The top bar counts answered questions ("Questions 4 / 7"; click = jump
to the next unanswered one), and the wake button asks "Send anyway / Keep answering" while some are
unanswered.

## What-if block (inputs drive numbers and a chart)

The last rung of the format ladder (content-guide §0): use when the reader will want to move an input. No script: every `data-var` input feeds the variables, `data-calc` evaluates an expression (vars and `Math` in scope), `data-out` echoes a variable, and a chart inside the block re-evaluates any dataset value written as a string. Formats: `data-format="₪"` / `"$"` / `"€"` / `"%"` / `"0"` / `"0.0"`. Fixed constants go in `data-vars` on the block.

```html
<div class="whatif" data-vars='{"cost":25}'>
  <div class="whatif-inputs">
    <label>Price <input type="range" data-var="price" data-format="$" min="10" max="100" step="5" value="40"> <output data-out="price"></output></label>
    <label>Quantity <input type="number" data-var="qty" min="0" value="120"></label>
  </div>
  <div class="whatif-results">
    <span>Revenue: <strong data-calc="price * qty" data-format="$"></strong></span>
    <span>Profit: <strong data-calc="(price - cost) * qty" data-format="$"></strong></span>
    <span>Margin: <strong data-calc="(price - cost) / price * 100" data-format="%"></strong></span>
  </div>
  <figure>
    <div class="chart short"><canvas data-chart='{"type":"bar","data":{"labels":["Revenue","Cost","Profit"],"datasets":[{"data":["price*qty","cost*qty","(price-cost)*qty"],"tones":["info","danger","ok"]}]}}'></canvas></div>
    <figcaption>Profit by the selected price; cost per unit is fixed (25).</figcaption>
    <details><summary>Formulas</summary><table><tbody><tr><td>Revenue</td><td><code>price × qty</code></td></tr><tr><td>Profit</td><td><code>(price − cost) × qty</code></td></tr></tbody></table></details>
  </figure>
</div>
```

## Callouts

```html
<div class="callout ok"><strong>Decided:</strong> One server per project.</div>
<div class="callout warn">Every push to master deploys to stage.</div>
<div class="callout danger">Don't write payment data back to Nedarim.</div>
<div class="callout info">…</div>
<div class="callout note">…</div>
```

## Collapsible detail

```html
<details>
  <summary>API details (11 endpoints)</summary>
  <div class="body">…table…</div>
</details>
```

## Tabs

```html
<div class="tabs">
  <div role="tablist">
    <button role="tab" aria-selected="true" aria-controls="t-a">Option A</button>
    <button role="tab" aria-controls="t-b">Option B</button>
  </div>
  <div role="tabpanel" id="t-a">…</div>
  <div role="tabpanel" id="t-b" hidden>…</div>
</div>
```

## File tree

```html
<div class="tree"><ul>
  <li><code>~/.claude/skills/markup/</code>
    <ul>
      <li><code>SKILL.md</code> <span class="d">Instructions for the agent</span></li>
      <li><code>server.mjs</code> <span class="d">Server + CLI</span></li>
      <li><code>vendor/</code><ul><li><code>mermaid.min.js</code></li><li><code>chart.umd.js</code></li></ul></li>
    </ul>
  </li>
</ul></div>
```

## Diff

```html
<div class="diff">
  <span class="line del">- const port = 4800 + hash % 200;</span>
  <span class="line add">+ const port = 19500 + hash % 500;</span>
</div>
```
Inline: `<span class="diff">was <del>4800</del> now <ins>19500</ins></span>`.

## Mermaid

```html
<pre class="mermaid">
flowchart TD
  A["/markup in session"] --> B["Writing content.html"]
  B --> C["publish"]
  C --> D{"Server running?"}
  D -- "Yes" --> E["Open browser"]
  D -- "No" --> F["Start server"] --> E
  classDef done fill:#ecfdf5,stroke:#15803d;
  class A,B done;
</pre>
```

```html
<pre class="mermaid">
sequenceDiagram
  participant U as User
  participant P as Page
  participant S as Server
  U->>P: Right-click + text
  P->>S: POST /api/comments
  S-->>P: 201 thread
  P->>S: GET /api/state (every 2 seconds)
</pre>
```

Other types that work: `stateDiagram-v2`, `classDiagram`, `erDiagram`, `gantt`, `mindmap`, `timeline`, `pie`, `quadrantChart`.

## Chart.js

A chart is a figure with a one-sentence conclusion and its data as a collapsed table (`check` hints when either is missing):

```html
<figure>
  <div class="chart">
    <canvas data-chart='{"type":"bar","data":{"labels":["Planning","Implementation","Verification","Documentation"],"datasets":[{"label":"Hours","data":[3,6,2,1]}]},"options":{"indexAxis":"y"}}'></canvas>
  </div>
  <figcaption>Implementation took twice as long as planning; verification and documentation together took less than planning.</figcaption>
  <details><summary>Data</summary><table><thead><tr><th>Stage</th><th class="num">Hours</th></tr></thead><tbody><tr><td>Planning</td><td class="num">3</td></tr><tr><td>Implementation</td><td class="num">6</td></tr><tr><td>Verification</td><td class="num">2</td></tr><tr><td>Documentation</td><td class="num">1</td></tr></tbody></table></details>
</figure>
```

Colors carry meaning. The default palette is deliberately neutral (blues, teals, purples, slate) so a
series never turns green or red just because of its position. When the data means something — done,
blocked, at risk, closed — say so with `tones` (one per slice/bar) or `tone` (whole dataset):

```html
<div class="chart short">
  <canvas data-chart='{"type":"doughnut","data":{"labels":["Approved","Rejected","Open"],"datasets":[{"data":[24,9,2],"tones":["ok","danger","warn"]}]}}'></canvas>
</div>
```

```html
<div class="chart">
  <canvas data-chart='{"type":"bar","data":{"labels":["Done","In progress","Stuck"],"datasets":[{"label":"Tasks","data":[12,5,2],"tones":["ok","info","danger"]}]},"options":{"indexAxis":"y"}}'></canvas>
</div>
```

Tones: `ok` green, `warn` amber, `danger` red, `info` blue, `muted` gray, `neutral` slate. Anything
without a tone falls back to the neutral palette. Never let a positive category land on red by accident.

```html
<div class="chart">
  <canvas data-chart='{"type":"line","data":{"labels":["Jan","Feb","Mar"],"datasets":[{"label":"Donations","data":[120,150,170]},{"label":"Pledges","data":[80,95,110]}]}}'></canvas>
</div>
```

## Images

Put files in `.markup/<dir>/assets/` and reference `assets/<file>`:
```html
<figure><img src="assets/screenshot.png" alt="…"><figcaption>…</figcaption></figure>
```
