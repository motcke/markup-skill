---
name: markup
description: Render the current conversation's plan / findings as a clear, visual local HTML page (tables, diagrams, charts before prose), served by a local server with right-click comments the session reads and answers. Manual invocation only (/markup).
disable-model-invocation: true
argument-hint: "[slug] | comments | open | wait | upgrade | issue [text]"
---

# /markup — conversation → visual HTML page with comments

`SKILL` below = this skill's directory (`~/.claude/skills/markup/`). Everything runs through `node "SKILL/server.mjs"`.
`SESSION` = this conversation's id, passed as `--session SESSION` on **every** call (publish, wait, comments, reply, done). In Claude Code it is `$CLAUDE_CODE_SESSION_ID` (bash) / `$env:CLAUDE_CODE_SESSION_ID` (PowerShell). When the harness gives no id, the first `publish` prints `session`: use that value from then on (it is in your context; after a compaction, `list` shows each plan's `sessionId`). The server never reads environment variables, so the same skill serves every agent.
`PROJECT` = the project root of the current working directory (the git root when inside a repo).
`USER` = `~/.markup/`, the user's own layer: preferences, lessons, extensions, update state. An upgrade replaces `SKILL` and never touches `USER` (see "Customizing and evolving the skill").
Data lives in `PROJECT/.markup/<YYYY-MM-DD>-<slug>/` — the skill adds `.markup/` to `.gitignore` on first publish.

The premise: a good visualization beats prose. A table, flowchart, chart, timeline, kanban, or whatever fits the content explains it better than a paragraph, so use one wherever possible, and make it pleasant to look at. Simple and clear, never decorative for its own sake.

## Modes

| Invocation | Do |
| --- | --- |
| `/markup` | Create the page for this conversation, or update it if this session already published one. In a session with nothing to show yet, just start the server and open the home page |
| `/markup <slug>` | Same, with an explicit plan name (English kebab-case slug) |
| `/markup comments` | Read open comment threads, answer each one in its context |
| `/markup open` | Make sure the server is up and open the browser, nothing else |
| `/markup issue [text]` | Report a bug, a feature request or a question about markup itself as an issue on the skill's GitHub repository (see "Mode: issue"). The home page's "Copy for the agent" button pastes this with the report after it |
| `/markup upgrade` | Upgrade the skill to the newest release, keeping the user's changes (see "Mode: upgrade"). Also what an `UPGRADE` line from `wait` asks for |
| `/markup wait` | Arm a wake-up: run `while true; do node "SKILL/server.mjs" wait "PROJECT" --session SESSION --timeout-ms 86400000; done` through the **Monitor** tool (persistent, description "waiting for the page's Wake the agent button"; the loop keeps the watch alive across wakes, and the Monitor tool still ends it after about an hour, so re-arm when it reports `timeout`). It prints one line when the user presses the page's "Wake the agent" button on a page of **this session** (a plan whose `meta.sessionId` is yours, or one with no session; `--all` for every plan of the project, only when you are the single agent on it); that line re-invokes you — then run the `comments` command it prints (plan and session included) and answer. **No Monitor tool (another agent)?** Run the same `wait` in the foreground with a long timeout where the harness allows it; otherwise end the turn — with nobody listening, the page's button copies `/markup comments <dir>` to the user's clipboard, and they paste it to you. **Arm it in the same turn as every `publish`** (before ending the turn): the page shows the user whether an agent is listening, and `publish` prints `listening: false` plus a warning when nobody is. A press made while nobody listens is kept (up to 24 hours) and the next `wait` of this session returns it at once, but until then the user waits for nothing. When the round is over and nothing stamped it (no reply was needed, or a thread was left open on purpose), run `node "SKILL/server.mjs" done "PROJECT" [slug] --session SESSION` so the page chip turns green |

## Step 0 — every invocation

1. Read `USER/preferences.md` (the user's taste), `USER/learnings.md` (recent feedback) and `USER/rules.md` when it exists (lessons folded from learnings), and apply them. On a machine where the first two do not exist yet, run `node "SKILL/server.mjs" version "PROJECT"` once: every CLI call creates them from `SKILL/defaults/`.
2. Determine `PROJECT` (`git rev-parse --show-toplevel`, else cwd).
3. When `publish` or `open` prints an `update` field, tell the user its `say` in one line. The page shows an upgrade balloon; do not upgrade unless asked.

## Mode: create / update

0. **Nothing to show yet?** If the conversation has no substance to render — a fresh session where `/markup` is the first real message, or nothing beyond greetings — do not invent a page. Behave like `/markup open`: `node "SKILL/server.mjs" open "PROJECT"` (server up, home page with the project's existing plans in the browser), report the URL and the open-comment counts from `list`, and stop.
1. **Resolve the plan.** `node "SKILL/server.mjs" list "PROJECT"` prints existing plans with `sessionId`. If a slug was given, use it. Otherwise reuse the plan whose `sessionId` equals `SESSION`; if none, pick a slug: 2–4 English words in kebab-case describing the topic (`clerk-cutover`, `nedarim-sync-bug`). The directory name is `<today>-<slug>` for a new plan (today = local date `YYYY-MM-DD`); an existing plan keeps its original date.
2. **Frame the page**: before writing, answer four questions in one line each — what outcome the reader needs, from which source material (this conversation, which files), which question the page answers, and which interactions it needs (picks, what-if inputs, none). The first two sentences of the `<p class="lead">` come from these answers; the fourth decides whether `.q` blocks or a `.whatif` belong on the page.
3. **Compose the content.** Read `SKILL/references/content-guide.md` (skeleton, content-type → component mapping, table coloring, language/direction and mermaid rules) and, from `SKILL/references/components.md` (copy-paste snippets), its index at the top and then only the sections for the components this page uses, plus `USER/ext/components.md` when it exists (the user's own components). Write an HTML **fragment** — no `<html>`, `<head>`, `<body>` or `<script>` — to `PROJECT/.markup/<dir>/content.html`. Write in the language of the conversation (what the user writes in), unless the user asked for another; the direction and the page's UI language follow the content by themselves.
   **Facts come from the code, not from memory.** When the page states how something works — architecture, data model, a flow, a file list — check it against the repository before writing it, especially in a long session. A claim you could not verify gets a `<span class="badge warn">not verified</span>` (in the page language) next to it, never a confident sentence.
4. **Self-check before publishing** (what the machine cannot check for you):

   | Ask | Fix |
   | --- | --- |
   | Does every `<h2>` have a stable English kebab-case `id`, unchanged from the previous version when only the wording moved? | Comments and change tags key on it |
   | Are decisions numbered as before, new ones appended? | Never renumber |
   | Is there a paragraph with more than one "and" in it? | It is a table or a diagram |
   | Does every table with numbers or states carry a visual encoding (`data-heat`, `data-bar`, `td.tl`… — content-guide §6)? | Black-on-white is the exception that needs a reason |
   | Do chart categories with a meaning (done / blocked / rejected) carry `tones`? | A positive category must never land on red |
   | Mermaid: flowchart labels with spaces or non-Latin text quoted, sequence participants and state labels unquoted? | `A["Load data"]`, `participant U as User` |
   | Is the one thing the reader must take away visible in the first screen (lead + KPIs + a callout)? | Lead with the conclusion |
   | Republish: is `--note-file` written? | The version dropdown is bare timestamps without it |

5. **Publish.** `node "SKILL/server.mjs" publish "PROJECT" <slug> --session SESSION --title "<title in the page language>" [--lang he|en] [--note-file <note.txt>]`
   The page language follows the content (the script outside code: Hebrew, Arabic, Persian → RTL, Latin → LTR); pass `--lang` only to override.
   A plan that belongs to another session is refused (a matching slug must not replace someone else's page): pick another slug, or pass `--takeover` when the user asked to take that plan over.
   `publish` first runs the static **check** (bidi characters, page tags or scripts in the fragment, invalid `data-chart` JSON, duplicate ids or `data-q`, `<h2>` without id, external assets, unquoted non-Latin mermaid labels, over-long paragraphs, numeric columns with no encoding, `h2` ids removed since the previous version). **Errors block the publish** — fix `content.html` and run again (`--force` only when the user asks); warnings and hints come back in the JSON: act on them or state why not. Run it alone with `node "SKILL/server.mjs" check "PROJECT" <slug>`. **Before a publish that uses a component no earlier page of this project used** (a first `.tabs`, `.whatif`, a new mermaid type…), run `check "PROJECT" <slug> --browser`: it opens the page in the automation Chrome (CDP 9222; `--cdp N` for another port) and reports console errors, exceptions, mermaid blocks that did not render and content wider than its column; `publish --browser` does the same after publishing. Skipped silently when no browser answers.
   Then it snapshots the version into `history/`, updates `meta.json`, starts the server if needed and opens the default browser unless the page is already open (then the open tab refreshes by itself). It prints JSON: `url`, `newVersion`, `comments` counts, `check`, `gitignoreUpdated`, `listening` (whether a `wait` of this session is armed; `false` comes with a `warning`) and `wakeDone` (whether this publish marked the user's pending "Wake the agent" call as answered, which turns the page chip green).
   **On every republish, pass `--note-file`**: a one-line summary of what changed since the previous version, written to a scratchpad file (a file, never an argument, so non-ASCII text survives the Windows shells). It labels the entry in the page's version dropdown.
6. **Report** in chat: the URL, one line on what the page shows, and how many comment threads are open (from the JSON). Nothing more — the page is the deliverable.

Re-running on an existing plan rewrites `content.html` from the current state of the conversation. Comments survive: they re-anchor by quote/section, and if their block was removed they climb to the nearest surviving ancestor while showing the original anchor. Sections whose HTML changed get an "updated" tag until the user clicks "Got it".

## Mode: upgrade

Read `SKILL/references/upgrade.md` and follow it. A clean install never gets here (the page's upgrade button handles it without an agent); this is for an install where the user changed shipped files.

## Mode: issue

A report about markup itself (a bug, a request, a question) becomes an issue on the skill's GitHub repository, and only after the user approves the exact text. Read `SKILL/references/issue.md` and follow it.

## Mode: comments

1. `node "SKILL/server.mjs" comments "PROJECT" [dir] --session SESSION` — prints every `open` thread (this session's plans, or the one plan the WAKE line named; `--all` for every session's) with: plan dir, section, block, ancestor chain, quoted text, and the messages so far, then unread closed threads, then new picks in `.q` question blocks ("Picks in question blocks"). `--all` includes waiting/closed threads and all picks.
2. For each thread, understand the context: the quote and block text usually suffice; open `content.html` and search for the block text when they don't. A message or a pick may list `attachment: <path>` lines — Read every one (screenshots are the usual case) before composing the answer.
3. Answer briefly and concretely, in the page's language. Write the answer to a file in the scratchpad and post it:
   `node "SKILL/server.mjs" reply "PROJECT" <dir> <threadId> --file <answer.txt> --session SESSION`. Always use `--file` (written with the Write tool, UTF-8): non-ASCII text passed as a command-line argument through the Windows shells arrives as mojibake. The thread moves to `waiting` (waiting for the user).
   - **Start the answer file with `# <short title>`** on its own first line. It names the thread in the panel (which shows the title alone when a thread is collapsed) and is stripped from the message body. A few words describing what the thread is about, not a summary of your answer.
   - The body renders `code`, **bold**, `[label](https://…)` links and `- ` bullets; nothing else of markdown (no headings, tables or images), so keep answers to short plain paragraphs.
   - **Reference a page section as `[[#section-id]]`** (or `[[#section-id|label]]`) anywhere in the answer. It renders as a link that scrolls the page to that heading and flashes it. Use it every time you mention a section, especially one you just added — never write "see the section about X" as plain text. Unknown ids fall back to plain text, so use the real `id` from `content.html`.
4. If an answer changes the plan itself, edit `content.html` and `publish` again — the changed sections get tagged, the comment stays attached.
5. Summarize in chat as a table: `#`, question (short), answer (short), plan changed? Do not paste full answers — they are on the page.

A thread marked `kind=issue` is not about the plan: it is a report about markup itself. Handle it with "Mode: issue".

Thread statuses: `open` = waiting for the agent, `waiting` = answered, waiting for the user, `closed` = the user closed it. A user reply reopens a thread. Only the user closes threads.

**`closed` does not mean "ignore this".** The user closes a thread when they have nothing further to add — not to hide it from you. The content still counts: it may carry a decision, a correction, or a preference you are expected to absorb. `comments` therefore prints every closed thread you have not read yet, under a heading that says so, and marks it seen so it appears once. Read those, apply what they say, and do not reply to them or ask them to decide anything.

The user can edit their own messages at any time, including after an answer. `comments` marks such messages with `EDITED <time>`; an edit does not change the status, so when a `waiting` thread shows an EDITED message newer than your answer, treat it as a follow-up and answer again. Always read the message text as it is now, not as you remember it.

A pick in a `.q` question block is an answer like any other: record it in the decisions log and act on it.

## Page behaviour and conventions

Everything about how the page, the comments panel and the floating cards behave (layout, card order, connectors, drafts, attachments, context meter, wake button, print) is in `SKILL/docs/page-conventions.md`. **Read it before changing `assets/plan.js`, `assets/plan.css`, `template.html` or `server.mjs`**, and keep every convention there — each was asked for explicitly. Composing a page does not need it.

## Server facts

| Fact | Value |
| --- | --- |
| Port | `19500 + hash(PROJECT path) % 500`, so one stable URL per project (`node "SKILL/server.mjs" port "PROJECT"` prints it). If the port is taken by something else, the next free one is used and remembered in `.markup/.port` |
| Lifecycle | One detached process per project, shared by every session of that project. `publish`/`open` start it when it is not running; `ensure` replaces a server older than `server.mjs`. It exits by itself after 24 hours without requests |
| State | None — it serves files from `.markup/` and writes `comments.json` / `answers.json`. Killing it loses nothing |
| Log | `.markup/.server.log` — start, exit, uncaught errors |
| Home page | `http://localhost:<port>/` lists all plans of the project with comment counts and a delete button |
| Versions | `SKILL/manifest.json` holds the version and a sha256 per shipped file; `version` compares the install with it (`clean` / `modified` / `dev`). Each server checks GitHub Releases once a day in the background (`USER/update.json`; `"updateCheck": false` in `USER/config.json` turns it off) and the page shows a balloon when a newer release exists. `release <x.y.z>` (author only) writes the manifest and the changelog entry |
| Agent dependency | None hard. The context meter reads Claude Code's transcript (`~/.claude/projects`) and hides itself when there is none; the wake button needs a listener (`wait` through Monitor, or in the foreground) and otherwise hands the user the `comments` command. Session ids come only from `--session` |
| Debug | Run it in the foreground to see errors: `node "SKILL/server.mjs" serve "PROJECT" --port <port> --idle-ms 0` |

## Content rules (short form — the full guide is in `references/content-guide.md`)

- Visual first: a table for anything enumerable, a mermaid diagram for flows/sequences/states/structures, a Chart.js chart for numbers over categories or time, KPI tiles for the headline numbers, cards/steps/timeline/kanban for plans and status. Paragraphs only when nothing else fits, and short.
- Color by meaning, in every table: states as traffic lights, numbers as heat or bars, changes as deltas, scores as ranks — declarative attributes, the page computes the colors (content-guide §6). One color, one meaning, per page; never color alone.
- Skeleton, adapted to the conversation: headline KPIs → goal and context → decisions (adopted **and** rejected, with reasons) → topic sections (architecture, flows, data, files…) → execution plan → status → open questions. Drop what does not apply; a bug investigation, a comparison, or a discussion gets a matching structure instead.
- Give every `<h2>` a stable `id` so comments and change detection survive rewrites. Keep the heading text stable too.
- Code, paths and identifiers in `<code>`; code blocks as `<pre><code class="language-sql">`; an English block inside an RTL page gets `dir="ltr"`.
- Never emit bidi control characters (RLM/LRM/isolates). The page handles mixed text by itself.
- Everything self-contained: no CDN, no external images. Extra images go in `.markup/<dir>/assets/` and are referenced as `assets/<file>`.

## Customizing and evolving the skill

The skill folder is replaced on every upgrade, so treat `SKILL` as read-only. What the user adds goes to `USER`, and the core loads it from there (details and examples in `SKILL/docs/extensions.md`):

| The user wants | Write it to |
| --- | --- |
| a different look | `USER/ext/<name>.css` (loaded after `plan.css`) |
| a visualization the vendored libraries cannot do | the library's self-contained UMD/IIFE build in `USER/ext/vendor/` (loaded before `plan.js`), its init in `USER/ext/<name>.js` through `markup.register({ name, selector, init })`, a snippet in `USER/ext/components.md`. No build steps, no package managers |
| a new rule for writing pages | `USER/rules.md` |
| a new `check` rule | `USER/ext/checks/<name>.mjs` |
| a new CLI command | `USER/ext/commands/<name>.mjs` |
| a different taste | `USER/preferences.md` |

- `vendor/` ships mermaid (flowchart, sequence, state, class, ER, gantt, mindmap, timeline, pie, quadrant), Chart.js (bar, line, pie, doughnut, radar, scatter, bubble) and highlight.js (common languages). Vendored on purpose: the page must work with no network.
- When the user gives feedback on the page (in chat or in a comment) — what helped, what was noise, a layout that did not work — append a dated line to `USER/learnings.md`. When ~10 lines accumulate or the same lesson repeats, fold them into `USER/rules.md` (or `USER/preferences.md` when it is taste), then clear them from learnings. Every file read at invocation time costs context: keep these files short.
- A request the extension points cannot express (the comments panel, the server API, the check engine) is a change to the skill itself. Say so, and offer to write it up as an issue ("Mode: issue") or a pull request for the skill's repository instead of editing the installed copy.
- Exception: in the skill's own git checkout (`version` prints `kind: dev`) editing `SKILL` is development. There, lessons that belong to every user are folded into this file, `references/` or `docs/page-conventions.md`, and a release follows `SKILL/docs/RELEASING.md`.
