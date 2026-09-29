#!/usr/bin/env node
// markup: local server + CLI for the /markup skill. Zero dependencies.
//
//   node server.mjs port    <root>
//   node server.mjs ensure  <root>                       -> {url, port, started}
//   node server.mjs serve   <root> --port N [--idle-ms N]
//   node server.mjs publish <root> <slug|dir> [--title "..."] [--lang he|en|ar|fa|…] [--dir rtl|ltr] [--no-open] [--note-file p] [--force] [--takeover] [--session id]
//   Every command takes --session <id> (the agent's conversation id; Claude Code: $CLAUDE_CODE_SESSION_ID). publish prints `session`; pass it on every later call.
//   node server.mjs check   <root> <slug|dir|file> [--browser [--cdp 9222]]  -> static checks of content.html (run by publish; errors block);
//                                                            --browser also opens the served page in the automation Chrome: console errors, exceptions, failed mermaid, horizontal overflow
//   node server.mjs open    <root> [slug|dir]
//   node server.mjs list    <root>
//   node server.mjs comments <root> [slug|dir] [--all]   (no slug: this session's plans only, H#76)
//   node server.mjs reply   <root> <slug|dir> <threadId> (--file path | "text")
//   node server.mjs wait    <root> [slug|dir] [--timeout-ms N] [--all]  -> blocks until a "done" press nobody picked up yet (made before or after it started), prints one line
//                                                                     (this session's plans and plans without a session; --all = every plan)
//   node server.mjs done    <root> [slug|dir]                    -> "the agent finished this round" (the page chip turns green)
//   node server.mjs version <root>                               -> installed version, install kind, changed files
//   node server.mjs update  <root>                               -> check for a newer release now (--force past the daily cache)
//   node server.mjs upgrade <root> [prepare|apply <workspace>|rollback]   (no subcommand: upgrade a clean install in one step)
//   node server.mjs issue   <root> --file <draft.md> [--type bug|feature|question|other] [--plan <dir> --thread <id>] [--dry-run]
//                                                            -> a GitHub issue on the skill's repository, filed with the user's `gh` (else a prefilled link)
//   node server.mjs release <x.y.z> [--notes-file f]             -> author only: manifest.json + CHANGELOG.md for a new version
//   Commands from ~/.markup/ext/commands/*.mjs run like the built-in ones (docs/extensions.md).
//
// <root> = the project root. Data lives in <root>/.markup/<YYYY-MM-DD>-<slug>/.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { ensureUserLayer } from './lib/user.mjs';
import { updateStatus, checkLatest, checkIsStale, dismiss, installInfo } from './lib/update.mjs';
import { prepare, apply, rollback, upgradeIfClean } from './lib/upgrade.mjs';
import { extTags, extFile, runExtChecks, extCommands } from './lib/ext.mjs';
import { release } from './lib/release.mjs';
import { ISSUE_REPO, ISSUE_TYPES, issueType, environment, readDraft, composeIssue, newIssueUrl, fileIssue } from './lib/issue.mjs';
import { readManifest } from './lib/manifest.mjs';
import { track, trackError, flush, pageShape } from './lib/telemetry.mjs';

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const LISTENER_TTL_MS = 15000; // a `wait` heartbeats every 5s; older than this = gone
const DATA_DIRNAME = '.markup';
const PREFS_FILE = path.join(os.homedir(), '.markup', 'prefs.json'); // H#73: preferences shared across projects
const PORT_BASE = 19500;
const PORT_SPAN = 500;
const IDLE_MS_DEFAULT = 24 * 60 * 60 * 1000;
// A plan page counts as open while one of its tabs polled within this window. A background tab
// polls far less often than every 2s (Chrome throttles hidden tabs to one timer per minute after
// five minutes), so the window is wider than a minute; a tab that closes says so (`bye`) instead
// of waiting out the window.
const ACTIVE_WINDOW_MS = 75_000;

// ---------- small utils ----------

const normalizePath = (p) => path.resolve(p).replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const portFor = (root) => PORT_BASE + (fnv1a(normalizePath(root)) % PORT_SPAN);

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

const pad = (n) => String(n).padStart(2, '0');
function localDate(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function versionStamp(d = new Date()) {
  return `${localDate(d)}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) opts[key] = true;
      else { opts[key] = next; i++; }
    } else pos.push(a);
  }
  return { pos, opts };
}

const slugify = (s) => String(s).toLowerCase().trim()
  .replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'plan';

// ---------- data layer ----------

const dataDir = (root) => path.join(root, DATA_DIRNAME);

function listPlanDirs(root) {
  const dd = dataDir(root);
  if (!fs.existsSync(dd)) return [];
  return fs.readdirSync(dd, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
}

// Accepts a bare slug ("html-skill") or a full dir name ("2026-08-25-html-skill").
function findPlanDir(root, ref) {
  if (!ref) return null;
  const dirs = listPlanDirs(root);
  if (dirs.includes(ref)) return ref;
  const slug = slugify(ref);
  const matches = dirs.filter((d) => d.replace(/^\d{4}-\d{2}-\d{2}-/, '') === slug);
  if (!matches.length) return null;
  return matches[matches.length - 1]; // newest by date prefix
}

// The done-button state machine lives in wake.json: at (pressed) → pickedAt (`wait` returned) →
// workingAt (`comments` read the threads) → doneAt (`reply`/`publish` left no open thread, or
// `done`). Each CLI stamps its own step; the page polls the record and shows a chip with a timer.
function markWake(root, dir, field, { onlyIfNoOpen = false } = {}) {
  const p = planPaths(root, dir);
  const w = readJson(p.wake, null);
  if (!w?.at || w.doneAt || w[field]) return false;
  if (onlyIfNoOpen && readComments(root, dir).some((t) => t.status === 'open')) return false;
  w[field] = new Date().toISOString();
  if (field !== 'pickedAt' && !w.pickedAt) w.pickedAt = w[field];
  if (field === 'doneAt' && !w.workingAt) w.workingAt = w.doneAt;
  writeJson(p.wake, w);
  return true;
}

// The agent read these closed threads and picks (`comments`). `at` is when it read them, so a pick
// changed after that moment still counts as new on the next run.
function markSeen(root, dir, threads = [], answers = [], at = new Date().toISOString()) {
  if (threads.length) {
    const list = readComments(root, dir);
    list.forEach((t) => { if (threads.includes(t.id)) t.agentSeenAt = at; });
    writeComments(root, dir, list);
  }
  if (answers.length) {
    const p = planPaths(root, dir);
    const all = readJson(p.answers, {});
    for (const q of answers) if (all[q]) all[q].seenAt = at;
    writeJson(p.answers, all);
  }
}

function planPaths(root, dir) {
  const base = path.join(dataDir(root), dir);
  return {
    base,
    meta: path.join(base, 'meta.json'),
    content: path.join(base, 'content.html'),
    comments: path.join(base, 'comments.json'),
    answers: path.join(base, 'answers.json'),
    wake: path.join(base, 'wake.json'),
    history: path.join(base, 'history'),
    assets: path.join(base, 'assets'),
  };
}

// H#68 (30/08): the session id always arrives as `--session <id>`, never from the environment, so
// the server is the same for every agent. A Claude Code agent passes $CLAUDE_CODE_SESSION_ID; an
// agent whose harness exposes no id gets one from the first `publish` (printed as `session`) and
// passes it on every later call.
function sessionOf(opts) { return opts.session ? String(opts.session) : null; }
function newSessionId() { return `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }

// The session answering a plan becomes its session (the page's context meter follows it).
function stampSession(root, dir, sid) {
  if (!sid) return;
  const p = planPaths(root, dir);
  const meta = readJson(p.meta, null);
  if (!meta || meta.sessionId === sid) return;
  meta.sessionId = sid;
  writeJson(p.meta, meta);
}

// `dir` is always the plan's directory name; the text direction lives in `textDir`. Plans published
// before the split stored the direction in `dir` ("rtl" / "ltr"), which leaked into `list` and the
// home page links; that value is read as `textDir` and the directory name wins.
function readMeta(root, dir) {
  const p = planPaths(root, dir);
  const slug = dir.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const m = readJson(p.meta, {});
  const textDir = m.textDir || (m.dir === 'rtl' || m.dir === 'ltr' ? m.dir : undefined);
  return { title: slug, slug, lang: 'he', ...m, dir, ...(textDir ? { textDir } : {}) };
}

// R1 (30/08): page language from the content — Hebrew letters vs Latin letters in the text, code
// and identifiers excluded (they inflate the Latin count on every Hebrew page). Hebrew wins at 30%.
// H#72 (30/08): direction follows the script, not one language. Hebrew, Arabic, Persian and Urdu are
// told apart by their letter ranges; any other RTL script (Syriac, Thaana, N'Ko) counts as "rtl" with
// English UI strings. Latin-script pages are `en`.
const RTL_LANGS = new Set(['he', 'ar', 'fa', 'ur', 'yi', 'ps', 'sd', 'ug', 'ckb', 'dv', 'syr', 'nqo', 'rtl']);
function detectLang(html) {
  const text = html.replace(/<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const count = (re) => (text.match(re) || []).length;
  const he = count(/[\u05D0-\u05EA]/g);
  const ar = count(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g);
  const otherRtl = count(/[\u0700-\u074F\u0780-\u07BF\u07C0-\u07FF]/g);
  const latin = count(/[A-Za-z]/g);
  const rtl = he + ar + otherRtl;
  if (rtl < latin * 0.3) return 'en';
  if (he >= ar && he >= otherRtl) return 'he';
  if (ar >= otherRtl) return count(/[\u067E\u0686\u0698\u06AF\u06CC]/g) > ar * 0.02 ? 'fa' : 'ar'; // Persian letters پ چ ژ گ ی
  return 'rtl';
}
function dirOf(lang) { return RTL_LANGS.has(String(lang || '').toLowerCase().split('-')[0]) ? 'rtl' : 'ltr'; }
function listVersions(root, dir) {
  const p = planPaths(root, dir);
  if (!fs.existsSync(p.history)) return [];
  return fs.readdirSync(p.history).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5)).sort();
}

function readContent(root, dir, version) {
  const p = planPaths(root, dir);
  const file = version ? path.join(p.history, `${version}.html`) : p.content;
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

const readComments = (root, dir) => readJson(planPaths(root, dir).comments, []);
const writeComments = (root, dir, list) => writeJson(planPaths(root, dir).comments, list);

const countBy = (comments) => {
  const c = { open: 0, waiting: 0, closed: 0 };
  for (const t of comments) c[t.status] = (c[t.status] || 0) + 1;
  return c;
};

function planSummary(root, dir) {
  const meta = readMeta(root, dir);
  const versions = listVersions(root, dir);
  return { ...meta, versions: versions.length, version: versions[versions.length - 1] || null, counts: countBy(readComments(root, dir)) };
}

// Split content into h2 sections and diff them against the previous version. A section is keyed by
// its h2 id (stable by the content rules) and falls back to the heading text, so a heading that was
// only reworded reads as "changed", not as "removed" plus "added".
function sectionsOf(html) {
  const out = new Map(); // key -> { heading, id, body }
  if (!html) return out;
  const re = /<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi;
  const heads = [];
  let m;
  while ((m = re.exec(html))) heads.push({ idx: m.index, end: re.lastIndex, id: /\bid="([^"]+)"/.exec(m[1])?.[1] || null, text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() });
  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const top = (body) => out.set('', { heading: '', id: null, body });
  if (!heads.length) { top(norm(html)); return out; }
  if (heads[0].idx > 0) top(norm(html.slice(0, heads[0].idx)));
  heads.forEach((h, i) => {
    const bodyEnd = i + 1 < heads.length ? heads[i + 1].idx : html.length;
    out.set(h.id ? `#${h.id}` : h.text, { heading: h.text, id: h.id, body: `${h.text}\n${norm(html.slice(h.end, bodyEnd))}` });
  });
  return out;
}

function changedSections(current, previous) {
  const a = sectionsOf(current);
  const b = sectionsOf(previous);
  const changes = [];
  for (const [k, v] of a) {
    if (!b.has(k)) changes.push({ heading: v.heading, id: v.id, kind: 'added' });
    else if (b.get(k).body !== v.body) changes.push({ heading: v.heading, id: v.id, kind: 'changed' });
  }
  for (const [k, v] of b) if (!a.has(k)) changes.push({ heading: v.heading, id: v.id, kind: 'removed' });
  return changes;
}
// The page polls /state every 2s per tab; the diff of two immutable snapshots is computed once.
const changedCache = new Map(); // "<dir>|<current>|<previous>" -> changes
function changedBetween(root, dir, current, previous) {
  const key = `${dir}|${current}|${previous}`;
  if (!changedCache.has(key)) changedCache.set(key, changedSections(readContent(root, dir, current), readContent(root, dir, previous)));
  return changedCache.get(key);
}

function ensureGitignore(root) {
  if (!fs.existsSync(path.join(root, '.git'))) return false;
  const gi = path.join(root, '.gitignore');
  let text = '';
  try { text = fs.readFileSync(gi, 'utf8'); } catch { /* new file */ }
  const has = text.split(/\r?\n/).some((l) => l.trim() === `${DATA_DIRNAME}/` || l.trim() === DATA_DIRNAME);
  if (has) return false;
  const sep = text.length && !text.endsWith('\n') ? '\n' : '';
  fs.writeFileSync(gi, `${text}${sep}${DATA_DIRNAME}/\n`);
  return true;
}

// ---------- HTTP helpers ----------

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff', '.md': 'text/markdown; charset=utf-8',
};

function send(res, status, body, type = 'application/json; charset=utf-8') {
  const data = type.startsWith('application/json') && typeof body !== 'string' ? JSON.stringify(body) : body;
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(data);
}

function sendFile(res, file, cache = 'no-cache', extra = {}) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'not found' });
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', ...extra });
  fs.createReadStream(file).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// One pass over the template: a value is never scanned again, so content that shows a placeholder
// (a page about this skill quoting the template) keeps it as written.
const fill = (template, vars) => template.replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

const safeSegment = (s) => /^[A-Za-z0-9._-]+$/.test(s) && !s.includes('..');

// ---------- server ----------

function serve(root, port, idleMs) {
  const templateFile = path.join(SKILL_DIR, 'template.html');
  const homeFile = path.join(SKILL_DIR, 'home.html');
  const projectName = path.basename(path.resolve(root));
  // H#77 (31/08): visual separation between projects. The project's own icon (first match below)
  // shows in the top bar next to the name and as the tab favicon; and every page of the project
  // carries a stable hue derived from the project path, tinting the top bar.
  const ICON_CANDIDATES = ['favicon.ico', 'favicon.png', 'favicon.svg', 'logo.png', 'logo.svg', 'icon.png',
    'public/favicon.ico', 'public/favicon.png', 'public/favicon.svg', 'public/logo.png', 'public/logo.svg',
    'static/favicon.ico', 'static/favicon.png', 'app/favicon.ico', 'src/favicon.ico', 'src/assets/logo.png', 'assets/logo.png', 'docs/logo.png'];
  const projectIcon = () => { for (const c of ICON_CANDIDATES) { const f = path.join(path.resolve(root), c); if (fs.existsSync(f)) return f; } return null; };
  const ICON_MIME = { '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const projectHue = fnv1a(normalizePath(path.resolve(root))) % 360;
  const lastPoll = new Map(); // dir -> Map(tab id -> ts of its last /state)
  let lastRequest = Date.now();
  const startedAt = new Date().toISOString();
  // Agents that armed `server.mjs wait` heartbeat here; the page shows whether anyone is listening
  // before the user presses the done button, and the button itself reports it.
  // A `wait` serves the plans of its own session (or plans with no session); `--all` serves every
  // plan. So "listening" is per plan: the session that published it, not any agent on the project.
  const listeners = new Map(); // pid -> { ts, sessionId, all }
  const hasListener = (dir) => {
    for (const [pid, l] of listeners) if (Date.now() - l.ts > LISTENER_TTL_MS) listeners.delete(pid);
    if (!dir) return listeners.size > 0;
    const sid = readMeta(root, dir).sessionId || null;
    for (const l of listeners.values()) if (l.all || !sid || l.sessionId === sid) return true;
    return false;
  };
  const listenerSince = (dir) => {
    if (!hasListener(dir)) return null;
    const sid = readMeta(root, dir).sessionId || null;
    let t = Infinity;
    for (const l of listeners.values()) if ((l.all || !sid || l.sessionId === sid) && l.since < t) t = l.since;
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  };

  // Only this machine's own pages and the CLI may talk to the server. A foreign Host is DNS
  // rebinding; a foreign Origin on a write is another site in the same browser (a text/plain POST
  // needs no CORS preflight), which could post a comment and press "done" to feed the agent its
  // text. The CLI sends no Origin.
  const OWN_HOSTS = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
  const trusted = (req) => {
    if (!OWN_HOSTS.has(String(req.headers.host || '').toLowerCase())) return false;
    const origin = req.headers.origin;
    if (!origin || req.method === 'GET' || req.method === 'HEAD') return true;
    return [...OWN_HOSTS].some((h) => origin.toLowerCase() === `http://${h}`);
  };

  const server = http.createServer(async (req, res) => {
    if (!trusted(req)) return send(res, 403, { error: 'forbidden: foreign host or origin' });
    lastRequest = Date.now();
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    const method = req.method;

    try {
      // ---- global routes
      if (parts[0] === 'project-icon' && !parts[1]) {
        const f = projectIcon();
        if (!f) return send(res, 404, { error: 'no icon' });
        res.writeHead(200, { 'content-type': ICON_MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'max-age=300' });
        return res.end(fs.readFileSync(f));
      }
      if (parts[0] === 'markup-logo.svg' && !parts[1]) return sendFile(res, path.join(SKILL_DIR, 'logo.svg'), 'max-age=86400');
      if (parts[0] === 'api' && parts[1] === 'ping') {
        const active = {};
        for (const [d, tabs] of lastPoll) {
          for (const [t, ts] of tabs) if (Date.now() - ts >= ACTIVE_WINDOW_MS) tabs.delete(t);
          if (tabs.size) active[d] = Date.now() - Math.max(...tabs.values());
        }
        return send(res, 200, { ok: true, app: 'markup', root: path.resolve(root), pid: process.pid, startedAt, active, listening: hasListener() });
      }
      if (parts[0] === 'api' && parts[1] === 'listeners' && method === 'POST') {
        const body = await readBody(req);
        if (body?.pid) listeners.set(String(body.pid), { ts: Date.now(), since: listeners.get(String(body.pid))?.since || Date.now(), sessionId: body.sessionId || null, all: Boolean(body.all) });
        if (body?.bye) listeners.delete(String(body.pid));
        return send(res, 200, { ok: true, listening: hasListener() });
      }
      // H#73 (30/08): user preferences shared by every project and every port — one file in the home
      // directory (section defaults of the comments list, later mode and theme). GET returns it, PUT merges.
      if (parts[0] === 'api' && parts[1] === 'prefs' && !parts[2]) {
        if (method === 'GET') return send(res, 200, readJson(PREFS_FILE, {}));
        if (method === 'PUT') { const body = await readBody(req); const merged = { ...readJson(PREFS_FILE, {}), ...(body || {}) }; fs.mkdirSync(path.dirname(PREFS_FILE), { recursive: true }); writeJson(PREFS_FILE, merged); return send(res, 200, merged); }
      }
      if (parts[0] === 'api' && parts[1] === 'shutdown' && method === 'POST') {
        send(res, 200, { ok: true });
        setTimeout(() => process.exit(0), 100);
        return;
      }
      if (parts[0] === 'api' && parts[1] === 'plans') {
        if (method === 'GET' && !parts[2]) {
          return send(res, 200, { project: projectName, root: path.resolve(root), plans: listPlanDirs(root).map((d) => planSummary(root, d)).filter((p) => p.versions > 0) }); // a folder whose first publish has not passed the check yet is not a page
        }
        if (method === 'DELETE' && parts[2] && safeSegment(parts[2])) {
          const dir = parts[2];
          if (!listPlanDirs(root).includes(dir)) return send(res, 404, { error: 'no such plan' });
          track('plan_delete', { versions: listVersions(root, dir).length, threads: readComments(root, dir).length }, readMeta(root, dir).sessionId);
          fs.rmSync(planPaths(root, dir).base, { recursive: true, force: true });
          return send(res, 200, { ok: true });
        }
      }
      if (parts[0] === '_ext') { const f = extFile(parts.slice(1)); return f ? sendFile(res, f) : send(res, 404, { error: 'not found' }); }
      // The update balloon (V5): status from the daily cache (a stale cache starts a check in the
      // background; the next page load sees its answer), "not now" per version, and the one-click
      // upgrade of a clean install. A changed install is never upgraded here: 409 sends the page to
      // the agent path.
      if (parts[0] === 'api' && parts[1] === 'update' && !parts[2] && method === 'GET') {
        if (checkIsStale()) checkLatest().catch(() => {});
        return send(res, 200, { ...updateStatus(SKILL_DIR), agentCmd: '/markup upgrade', devCmd: `git -C "${installInfo(SKILL_DIR).dir}" pull` });
      }
      if (parts[0] === 'api' && parts[1] === 'update' && parts[2] === 'dismiss' && method === 'POST') { const body = await readBody(req); track('update_dismiss', { version: body.version }); return send(res, 200, dismiss(body.version)); }
      if (parts[0] === 'api' && parts[1] === 'upgrade' && method === 'POST') {
        const st = updateStatus(SKILL_DIR);
        if (st.kind !== 'clean') { track('upgrade', { via: 'page', from: st.current, to: st.latest, result: `refused_${st.kind}` }); return send(res, 409, { error: `install is ${st.kind}`, kind: st.kind }); }
        const r = await upgradeIfClean(SKILL_DIR);
        track('upgrade', { via: 'page', from: st.current, to: st.latest, result: r.needsAgent ? 'needs_agent' : r.upToDate ? 'up_to_date' : r.ok ? 'ok' : 'failed' });
        if (r.needsAgent) return send(res, 409, { error: 'the install has changes of the user', kind: 'modified', workspace: r.workspace });
        send(res, 200, r);
        // New code is on disk: `ensure` sees this process as older than server.mjs, shuts it down and
        // starts the new one on the same port. The page waits for a new startedAt, then reloads.
        if (r.ok) setTimeout(() => spawn(process.execPath, [SELF, 'ensure', root], { detached: true, stdio: 'ignore', windowsHide: true }).unref(), 200);
        return;
      }
      if (parts[0] === 'vendor' && parts[1] && safeSegment(parts[1]) && !parts[2]) return sendFile(res, path.join(SKILL_DIR, 'vendor', parts[1]), 'max-age=86400');
      if (parts[0] === '_' && parts[1] && safeSegment(parts[1]) && !parts[2]) return sendFile(res, path.join(SKILL_DIR, 'assets', parts[1]));
      if (!parts.length) {
        const html = fill(fs.readFileSync(homeFile, 'utf8'), { PROJECT: escapeHtml(projectName), ROOT: escapeHtml(path.resolve(root)), HUE: String(projectHue), ICON_TAGS: projectIcon() ? '<link rel="icon" href="/project-icon">' : '<link rel="icon" href="/markup-logo.svg">', HOME_ICON: projectIcon() ? '<img class="home-logo" src="/project-icon" alt="">' : '', EXT_HEAD: extTags().head, REPO: ISSUE_REPO });
        return send(res, 200, html, MIME['.html']);
      }

      // ---- plan routes: /<dir>/...
      const dir = parts[0];
      if (!safeSegment(dir) || !listPlanDirs(root).includes(dir)) {
        // a browser opening a deleted page (an old tab, a bookmark) gets the home page with a note, not raw JSON
        if (parts.length === 1 && req.method === 'GET' && /text\/html/.test(req.headers.accept || '')) { res.writeHead(302, { Location: `/?gone=${encodeURIComponent(dir)}`, 'Cache-Control': 'no-store' }); return res.end(); }
        return send(res, 404, { error: 'no such plan', dir });
      }
      const p = planPaths(root, dir);
      const rest = parts.slice(1);

      if (!rest.length) {
        const meta = readMeta(root, dir);
        const versions = listVersions(root, dir);
        const current = versions[versions.length - 1] || '';
        const v = url.searchParams.get('v');
        if (v && !versions.includes(v)) return send(res, 404, { error: 'no such version' }); // v becomes a file path and a JS string
        const readonly = Boolean(v && v !== current);
        const content = readContent(root, dir, readonly ? v : null);
        if (content === null) return send(res, 404, { error: 'no content' });
        const lang = meta.lang || 'he';
        const ext = extTags();
        const html = fill(fs.readFileSync(templateFile, 'utf8'), {
          EXT_HEAD: ext.head, EXT_VENDOR: ext.vendor, EXT_SCRIPTS: ext.scripts,
          TITLE: escapeHtml(meta.title), TITLE_CSS: cssString(meta.title), PROJECT_CSS: cssString(projectName), DATE: localDate(), PROJECT: escapeHtml(projectName), DIR: dir, LANG: lang,
          HUE: String(projectHue), ICON_TAGS: projectIcon() ? '<link rel="icon" href="/project-icon">' : '<link rel="icon" href="/markup-logo.svg">', PROJ_ICON: projectIcon() ? '<img class="proj-icon" src="/project-icon" alt="">' : '',
          DIR_ATTR: meta.textDir || dirOf(lang), CONTENT: content, VERSION: readonly ? v : current,
          READONLY: readonly ? 'true' : 'false', REPO: ISSUE_REPO, MARKUP_VERSION: readManifest(SKILL_DIR)?.version || '',
        });
        return send(res, 200, html, MIME['.html']);
      }

      // Attachments come from the browser and open in a tab of this origin: a sandbox CSP keeps an
      // .html or .svg file viewable while any script in it stays inert (no access to the API).
      if (rest[0] === 'assets' && rest[1] && safeSegment(rest[1]) && !rest[2]) return sendFile(res, path.join(p.assets, rest[1]), 'no-cache', { 'Content-Security-Policy': 'sandbox' });

      if (rest[0] === 'api') {
        const sub = rest.slice(1);


        if (sub[0] === 'bye' && method === 'POST') { lastPoll.get(dir)?.delete(url.searchParams.get('tab') || '_'); return send(res, 200, { ok: true }); }
        if (sub[0] === 'state' && method === 'GET') {
          if (!lastPoll.has(dir)) lastPoll.set(dir, new Map());
          lastPoll.get(dir).set(url.searchParams.get('tab') || '_', Date.now());
          const meta = readMeta(root, dir);
          const versions = listVersions(root, dir);
          const current = versions[versions.length - 1] || null;
          let changed = [];
          if (current && meta.seenVersion !== current && versions.length > 1) {
            changed = changedBetween(root, dir, current, versions[versions.length - 2]);
          }
          return send(res, 200, { title: meta.title, lang: meta.lang, version: current, versions, notes: meta.notes || {}, seenVersion: meta.seenVersion || null, changed, comments: readComments(root, dir), wake: readJson(p.wake, null), listening: hasListener(dir), listeningSince: listenerSince(dir), wakeCmd: `/markup comments ${dir}` });
        }

        // Answers to selectable questions (radio / multi-select blocks in the content): one record
        // per question id, overwritten on every change. `comments` prints the ones the agent has
        // not read yet, like closed threads.
        // "I am done" from the page: the `wait` CLI (armed by the agent as a Monitor) returns when
        // a wake newer than its start appears.
        if (sub[0] === 'wake' && method === 'POST') {
          // A fresh record each press: the page's state chip follows at → pickedAt (wait
          // returned) → workingAt (comments read) → doneAt (reply / publish / done).
          // kind "upgrade" (V8): the balloon asked the agent to upgrade a changed install; `wait`
          // prints an UPGRADE line instead of WAKE.
          const body = await readBody(req).catch(() => ({}));
          const rec = { at: new Date().toISOString(), listening: hasListener(dir), ...(body?.kind === 'upgrade' ? { kind: 'upgrade' } : {}) };
          writeJson(p.wake, rec);
          track('wake_press', { kind: rec.kind || 'wake', listening: rec.listening }, readMeta(root, dir).sessionId);
          return send(res, 200, rec);
        }
        if (sub[0] === 'wake' && method === 'DELETE') { // the user cancelled the call
          const w = readJson(p.wake, null);
          if (w?.at && !w.doneAt) { w.doneAt = new Date().toISOString(); w.cancelled = true; writeJson(p.wake, w); }
          return send(res, 200, { ok: true });
        }
        // CLI writes (see markWakeSafe): the server applies them between its own requests
        if (sub[0] === 'mark-wake' && method === 'POST') {
          const body = await readBody(req);
          if (!['pickedAt', 'workingAt', 'doneAt'].includes(body.field)) return send(res, 400, { error: 'bad field' });
          return send(res, 200, { marked: markWake(root, dir, body.field, { onlyIfNoOpen: Boolean(body.onlyIfNoOpen) }) });
        }
        if (sub[0] === 'agent-seen' && method === 'POST') {
          const body = await readBody(req);
          markSeen(root, dir, Array.isArray(body.threads) ? body.threads.map(String) : [], Array.isArray(body.answers) ? body.answers.map(String) : [], String(body.at || new Date().toISOString()));
          return send(res, 200, { ok: true });
        }
        if (sub[0] === 'ctx' && method === 'GET') return send(res, 200, contextUsage(root, readMeta(root, dir).sessionId, versionTimes(root, dir)) || {});
        if (sub[0] === 'answers' && method === 'GET') return send(res, 200, readJson(p.answers, {}));
        if (sub[0] === 'answers' && method === 'PUT') {
          const body = await readBody(req);
          const qid = String(body.qid || '').trim();
          if (!qid) return send(res, 400, { error: 'qid required' });
          const all = readJson(p.answers, {});
          const prev = all[qid] || {};
          const keep = Array.isArray(body.keepFiles) ? (prev.attachments || []).filter((a) => body.keepFiles.includes(a.file)) : (prev.attachments || []);
          const attachments = [...keep, ...saveAttachments(p, body.attachments)];
          all[qid] = {
            type: body.type === 'multi' ? 'multi' : 'single',
            values: Array.isArray(body.values) ? body.values.map(String).slice(0, 50) : [],
            labels: Array.isArray(body.labels) ? body.labels.map((l) => String(l).slice(0, 300)).slice(0, 50) : [],
            text: String(body.text || '').slice(0, 200000),
            title: String(body.title || '').slice(0, 300),
            section: body.section ? String(body.section).slice(0, 200) : null,
            at: new Date().toISOString(),
            ...(attachments.length ? { attachments } : {}),
          };
          writeJson(p.answers, all);
          // the page saves free text as it is typed: only a change of the selection is a pick
          if (String(prev.values || []) !== String(all[qid].values)) track('pick', { type: all[qid].type, picked: all[qid].values.length, first: !prev.at }, readMeta(root, dir).sessionId);
          return send(res, 200, all[qid]);
        }

        if (sub[0] === 'seen' && method === 'POST') {
          const meta = readMeta(root, dir);
          const versions = listVersions(root, dir);
          meta.seenVersion = versions[versions.length - 1] || null;
          writeJson(p.meta, meta);
          return send(res, 200, { ok: true, seenVersion: meta.seenVersion });
        }

        if (sub[0] === 'comments') {
          const id = sub[1];
          if (!id && method === 'POST') {
            const body = await readBody(req);
            const text = String(body.text || '').trim();
            const attachments = saveAttachments(p, body.attachments);
            if (!text && !attachments.length) return send(res, 400, { error: 'text required' });
            const list = readComments(root, dir);
            const now = new Date().toISOString();
            const versions = listVersions(root, dir);
            const thread = {
              id: `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
              n: (list.reduce((m, t) => Math.max(m, t.n || 0), 0) + 1),
              createdAt: now, status: 'open', version: versions[versions.length - 1] || null,
              anchor: {
                section: body.anchor?.section ?? null, quote: body.anchor?.quote ?? null,
                chain: Array.isArray(body.anchor?.chain) ? body.anchor.chain.slice(0, 12) : [],
              },
              messages: [{ role: 'user', text, at: now, ...(attachments.length ? { attachments } : {}) }],
              // a report about markup itself, for its GitHub repository (Mode: issue in SKILL.md)
              ...(body.kind === 'issue' ? { kind: 'issue', issueType: issueType(body.issueType), ua: String(body.ua || '').slice(0, 300) } : {}),
            };
            list.push(thread);
            writeComments(root, dir, list);
            track('comment_add', { kind: thread.kind || 'comment', quote: Boolean(thread.anchor.quote), section: Boolean(thread.anchor.section), attachments: attachments.length, chars: text.length }, readMeta(root, dir).sessionId);
            return send(res, 201, thread);
          }
          if (id) {
            const list = readComments(root, dir);
            const thread = list.find((t) => t.id === id);
            if (!thread) return send(res, 404, { error: 'no such thread' });
            if (sub[2] === 'messages' && method === 'POST') {
              const body = await readBody(req);
              const text = String(body.text || '').trim();
              const role = body.role === 'agent' ? 'agent' : 'user';
              const attachments = saveAttachments(p, body.attachments);
              if (!text && !attachments.length) return send(res, 400, { error: 'text required' });
              thread.messages.push({ role, text, at: new Date().toISOString(), ...(attachments.length ? { attachments } : {}) });
              thread.status = role === 'agent' ? 'waiting' : 'open';
              writeComments(root, dir, list);
              track('comment_message', { role, kind: thread.kind || 'comment', messages: thread.messages.length, attachments: attachments.length, chars: text.length }, readMeta(root, dir).sessionId);
              return send(res, 200, thread);
            }
            if (sub[2] === 'messages' && sub[3] !== undefined && method === 'PATCH') {
              const body = await readBody(req);
              const msg = thread.messages[Number(sub[3])];
              const text = String(body.text || '').trim();
              if (!msg) return send(res, 404, { error: 'no such message' });
              if (!text) return send(res, 400, { error: 'text required' });
              if (msg.text !== text) { msg.text = text; msg.editedAt = new Date().toISOString(); }
              writeComments(root, dir, list);
              return send(res, 200, thread);
            }
            if (!sub[2] && method === 'PATCH') {
              const body = await readBody(req);
              if (body.title !== undefined) thread.title = String(body.title).slice(0, 120).trim() || null;
              if (body.issue?.url && /^https:\/\/github\.com\//.test(String(body.issue.url))) thread.issue = { url: String(body.issue.url).slice(0, 300), number: Number(body.issue.number) || null };
              if (body.status !== undefined) {
                if (!['open', 'waiting', 'closed'].includes(body.status)) return send(res, 400, { error: 'bad status' });
                if (thread.status !== body.status) track('thread_status', { from: thread.status, to: body.status, messages: thread.messages.length }, readMeta(root, dir).sessionId);
                thread.status = body.status;
              }
              thread.updatedAt = new Date().toISOString();
              writeComments(root, dir, list);
              return send(res, 200, thread);
            }
            if (!sub[2] && method === 'DELETE') {
              writeComments(root, dir, list.filter((t) => t.id !== id));
              return send(res, 200, { ok: true });
            }
          }
        }
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      trackError(`${method} ${url.pathname.replace(/^\/\d{4}-\d{2}-\d{2}-[^/]+/, '/<plan>').replace(/\/c_[a-z0-9]+/, '/<thread>')}`, e);
      return send(res, 500, { error: String(e?.message || e) });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`markup serving ${path.resolve(root)} at http://localhost:${port}/ (pid ${process.pid})`);
  });
  server.on('error', (e) => { console.error(e.message); process.exit(1); });
  // The detached process has no console: keep a short log of anything that would kill it, and
  // survive unhandled errors instead of dying silently (the page then shows "server down").
  const logFile = path.join(dataDir(root), '.server.log');
  const logLine = (msg) => { try { fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}
`); } catch { /* ignore */ } };
  process.on('uncaughtException', (e) => { logLine(`uncaughtException ${e?.stack || e}`); trackError('uncaught', e); });
  process.on('unhandledRejection', (e) => { logLine(`unhandledRejection ${e?.stack || e}`); trackError('unhandled', e); });
  process.on('exit', (code) => logLine(`exit ${code}`));
  logLine(`start pid ${process.pid} port ${port}`);
  // V3: the daily update check, in the background, a few seconds after start
  setTimeout(() => checkLatest().catch(() => {}), 3000).unref();
  // T1: usage telemetry. Commands queue events; the server sends them in batches
  track('server_start');
  setTimeout(() => flush(SKILL_DIR), 10_000).unref();
  setInterval(() => flush(SKILL_DIR), 5 * 60_000).unref();

  if (idleMs > 0) {
    setInterval(() => { if (Date.now() - lastRequest > idleMs) { console.log('idle timeout, exiting'); process.exit(0); } }, Math.min(idleMs, 60_000));
  }
}

// ---------- client-side helpers (CLI) ----------

function ping(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/ping', timeout: 1500 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ host: '127.0.0.1', port, method, path: urlPath, headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null') }); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const s = http.createServer();
    s.once('error', () => resolve(false));
    s.listen(port, '127.0.0.1', () => s.close(() => resolve(true)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// While the server runs it is the single writer of a plan's JSON files (H#28): a CLI read-modify-write
// of comments.json / answers.json / wake.json could drop a comment, a pick or a press the page posted
// in between. These helpers go through the server and fall back to the files when it is down (or too
// old to know the route).
const serverPorts = new Map(); // root -> Promise<port|null>, once per CLI run
function runningServer(root) {
  if (!serverPorts.has(root)) {
    serverPorts.set(root, (async () => {
      const portFile = path.join(dataDir(root), '.port');
      const port = fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, 'utf8').trim()) || portFor(root) : portFor(root);
      const info = await ping(port);
      return info?.app === 'markup' && normalizePath(info.root) === normalizePath(root) ? port : null;
    })());
  }
  return serverPorts.get(root);
}
async function viaServer(root, dir, route, body) {
  const port = await runningServer(root);
  if (!port) return null;
  try { const r = await request(port, 'POST', `/${dir}/api/${route}`, body); return r.status === 200 ? r.body : null; } catch { return null; }
}
async function markWakeSafe(root, dir, field, o = {}) {
  const r = await viaServer(root, dir, 'mark-wake', { field, onlyIfNoOpen: Boolean(o.onlyIfNoOpen) });
  return r ? Boolean(r.marked) : markWake(root, dir, field, o);
}
async function markSeenSafe(root, dir, threads, answers, at) {
  if (!threads.length && !answers.length) return;
  if (!(await viaServer(root, dir, 'agent-seen', { threads, answers, at }))) markSeen(root, dir, threads, answers, at);
}

async function ensure(root) {
  root = path.resolve(root);
  const rootNorm = normalizePath(root);
  const portFile = path.join(dataDir(root), '.port');
  const candidates = [];
  const remembered = Number(fs.existsSync(portFile) ? fs.readFileSync(portFile, 'utf8').trim() : NaN);
  if (remembered) candidates.push(remembered);
  const derived = portFor(root);
  if (!candidates.includes(derived)) candidates.push(derived);

  // A server that started before the last edit of this file runs old code (the API grows with the
  // skill; a stale process once silently dropped thread titles). Replace it instead of reusing it.
  // lib/ modules and manifest.json count too: an upgrade may change a module and not server.mjs, and
  // it always writes the manifest last, so a server started before any upgrade is retired.
  const codeFiles = [SELF, path.join(SKILL_DIR, 'manifest.json'), ...(() => { try { return fs.readdirSync(path.join(SKILL_DIR, 'lib')).map((f) => path.join(SKILL_DIR, 'lib', f)); } catch { return []; } })()];
  const codeMtime = Math.max(...codeFiles.map((f) => { try { return fs.statSync(f).mtimeMs; } catch { return 0; } }));
  const stale = (info) => !info.startedAt || new Date(info.startedAt).getTime() < codeMtime;
  const reuseOrRetire = async (port, info) => {
    if (!stale(info)) return { url: `http://localhost:${port}/`, port, started: false, pid: info.pid };
    try { await request(port, 'POST', '/api/shutdown'); } catch { /* already gone */ }
    for (let i = 0; i < 30 && !(await portIsFree(port)); i++) await sleep(100);
    return null;
  };
  for (const port of candidates) {
    const info = await ping(port);
    if (info?.app === 'markup' && normalizePath(info.root) === rootNorm) { const r = await reuseOrRetire(port, info); if (r) return r; }
  }
  let port = derived;
  for (let i = 0; i < 50; i++, port++) {
    const info = await ping(port);
    if (info?.app === 'markup' && normalizePath(info.root) === rootNorm) { const r = await reuseOrRetire(port, info); if (r) return r; }
    if (!info && await portIsFree(port)) break;
  }
  fs.mkdirSync(dataDir(root), { recursive: true });
  const child = spawn(process.execPath, [SELF, 'serve', root, '--port', String(port)], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
  for (let i = 0; i < 40; i++) {
    await sleep(150);
    const info = await ping(port);
    if (info?.app === 'markup') {
      fs.writeFileSync(portFile, String(port));
      return { url: `http://localhost:${port}/`, port, started: true, pid: info.pid };
    }
  }
  throw new Error(`server did not start on port ${port}`);
}

function openBrowser(url) {
  const plat = process.platform;
  const cmd = plat === 'win32' ? ['cmd', ['/c', 'start', '', url]] : plat === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  const child = spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function threadToMarkdown(t, dir, root) {
  const chain = (t.anchor?.chain || []).map((l) => `${l.tag}${l.id ? `#${l.id}` : ''}${l.cls ? `.${l.cls}` : ''}`).join(' > ') || '(none)';
  const block = t.anchor?.chain?.[0];
  const lines = [];
  lines.push(`### #${t.n ?? '?'}${t.title ? ` ${t.title}` : ''} [${t.id}] status=${t.status} · plan=${dir}${t.kind === 'issue' ? ` · kind=issue type=${t.issueType || 'other'}` : ''}`);
  if (t.kind === 'issue') {
    lines.push(`- report about markup itself (not about this plan)${t.anchor?.chain?.length ? '; the element below is where the user saw it' : ', not tied to an element'}`);
    if (t.ua) lines.push(`- browser: ${t.ua}`);
    if (t.issue?.url) lines.push(`- filed: ${t.issue.url}`);
  }
  lines.push(`- section: ${t.anchor?.section || '(top)'}`);
  if (block) lines.push(`- block: <${block.tag}> "${(block.text || '').slice(0, 160)}"`);
  lines.push(`- chain: ${chain}`);
  if (t.anchor?.quote) lines.push(`- quote: "${t.anchor.quote}"`);
  for (const m of t.messages || []) {
    lines.push(`- ${m.role} (${fmtDate(m.at)}${m.editedAt ? `, EDITED ${fmtDate(m.editedAt)}` : ''}): ${(m.text || '').replace(/\n/g, '\n  ')}`);
    // absolute paths, so the agent can Read an attached screenshot straight away
    for (const a of m.attachments || []) lines.push(`  attachment: ${path.join(dataDir(root), dir, 'assets', a.file)} (${a.name}, ${a.type})`);
  }
  return lines.join('\n');
}

// Files posted with a comment or a reply: data URLs in the JSON body, written under the plan's
// assets/ with an ASCII-safe name (the assets route only serves plain segments) and kept on the
// message as {name, file, type, size}.
function saveAttachments(p, list) {
  if (!Array.isArray(list) || !list.length) return [];
  fs.mkdirSync(p.assets, { recursive: true });
  const EXT_BY_TYPE = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'application/pdf': '.pdf', 'text/plain': '.txt' };
  const out = [];
  list.slice(0, 10).forEach((a, i) => {
    const data = String(a?.data || '');
    const m = data.match(/^data:([^;]*);base64,(.*)$/s);
    const buf = Buffer.from(m ? m[2] : data, 'base64');
    if (!buf.length || buf.length > 8 * 1024 * 1024) return;
    const type = String(a?.type || (m ? m[1] : '') || 'application/octet-stream');
    const orig = String(a?.name || 'file').slice(0, 120);
    const ext = (path.extname(orig) || EXT_BY_TYPE[type] || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const stem = path.basename(orig, path.extname(orig)).replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'file';
    const file = `att-${Date.now().toString(36)}-${i}-${stem}${ext}`;
    fs.writeFileSync(path.join(p.assets, file), buf);
    out.push({ name: orig, file, type, size: buf.length });
  });
  return out;
}

// ---------- context usage of the serving agent ----------
// Claude Code keeps one transcript per session under ~/.claude/projects/<encoded cwd>/<id>.jsonl;
// every assistant message carries the API usage of that call. The context in use is the input
// side of the last call (input + cache creation + cache read), the same sum the status line
// shows. H#75 (31/08): the meter reads ONLY the plan's own session — full separation between
// conversations, like every other part of the skill (`--session` on every call). When that session
// has no transcript here (another agent, a server-issued id), the meter is hidden; it never falls
// back to "the newest transcript of the project" (a bridge session once showed its 50k as if it
// were the plan's context).
function claudeProjectDir(root) {
  const base = path.join(os.homedir(), '.claude', 'projects');
  const enc = path.resolve(root).replace(/[^A-Za-z0-9]/g, '-');
  try {
    const hit = fs.readdirSync(base).find((d) => d.toLowerCase() === enc.toLowerCase());
    return hit ? path.join(base, hit) : null;
  } catch { return null; }
}
function contextWindowSize(model) {
  const m = String(model || '');
  if (/\[1m\]/.test(m)) return 1e6;
  try {
    const s = readJson(path.join(os.homedir(), '.claude', 'settings.json'), {});
    if (/\[1m\]/.test(String(s.model || ''))) return 1e6;
  } catch { /* no settings */ }
  return 200000;
}
// H#65 (30/08): the meter splits by plan version. Every assistant record carries a timestamp and
// the usage of that call; the context in use when version k was published is the last usage
// before the history file's mtime. The transcript is append-only, so it is parsed incrementally
// and cached per file.
// Only complete lines are parsed: `offset` stops after the last newline, so a record the agent was
// still writing is read whole on the next call instead of being split and lost.
const usageCache = new Map(); // file -> { size, offset, points: [{t, used, output, model}] }
function usagePoints(file) {
  const size = fs.statSync(file).size;
  const c = usageCache.get(file);
  if (c && c.size === size) return c.points;
  const from = c && size > c.size ? c.offset : 0; // a file that shrank was rewritten: start over
  const points = from ? c.points.slice() : [];
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(size - from);
  fs.readSync(fd, buf, 0, size - from, from);
  fs.closeSync(fd);
  const end = buf.lastIndexOf(0x0a) + 1;
  for (const ln of buf.subarray(0, end).toString('utf8').split('\n')) {
    if (!ln.includes('"usage"') || !ln.includes('"assistant"')) continue;
    try {
      const rec = JSON.parse(ln);
      const u = rec?.message?.usage;
      if (rec.type !== 'assistant' || !u || !rec.timestamp) continue;
      const used = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
      if (used) points.push({ t: Date.parse(rec.timestamp), used, output: u.output_tokens || 0, model: rec.message.model || null });
    } catch { /* not a usage record */ }
  }
  usageCache.set(file, { size, offset: from + end, points });
  return points;
}
function versionTimes(root, dir) {
  const p = planPaths(root, dir);
  const meta = readMeta(root, dir);
  return listVersions(root, dir).map((v) => { try { return { version: v, note: (meta.notes || {})[v] || '', t: fs.statSync(path.join(p.history, `${v}.html`)).mtimeMs }; } catch { return null; } }).filter(Boolean);
}
function contextSegments(file, versions) {
  if (!versions || !versions.length) return null;
  let points;
  try { points = usagePoints(file); } catch { return null; }
  if (!points.length) return null;
  const usedAt = (t) => { let u = null; for (const pt of points) { if (pt.t <= t) u = pt.used; else break; } return u; };
  const segs = [];
  let prev = 0;
  versions.forEach((v, i) => {
    const u = usedAt(v.t);
    if (u === null) return;
    segs.push({ version: v.version, note: v.note, n: i + 1, at: new Date(v.t).toISOString(), used: u, delta: u - prev, reset: u < prev });
    prev = u;
  });
  const last = points[points.length - 1].used;
  segs.push({ version: null, n: segs.length + 1, at: new Date(points[points.length - 1].t).toISOString(), used: last, delta: last - prev, reset: last < prev, tail: true });
  return segs;
}
// ---------- check --browser (R10, 30/08) ----------
// Opens the served page in a Chrome that exposes CDP (the automation Chrome on 9222 by default),
// waits for the scripts, and reports what the static check cannot see: console errors and
// exceptions, mermaid blocks that did not render (no <svg>, or mermaid's own error svg), and
// content wider than its column. Returns { skipped } when no browser answers on that port.
async function browserCheck(url, cdpPort = 9222, waitMs = 3500) {
  if (typeof WebSocket === 'undefined') return { skipped: 'browser check needs Node 22+ (global WebSocket); everything else runs on Node 18+' };
  let tab;
  try { tab = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json(); }
  catch { return { skipped: `no browser with CDP on port ${cdpPort} (start Chrome with --remote-debugging-port=${cdpPort})` }; }
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const consoleErrors = []; const exceptions = [];
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id) { pending.get(d.id)?.(d.result); return; }
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) consoleErrors.push(d.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 200));
    if (d.method === 'Runtime.exceptionThrown') exceptions.push(String(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0].slice(0, 200));
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  try {
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
    await new Promise((r) => setTimeout(r, waitMs));
    const ev = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
      const content = document.querySelector('.content'); const right = content.getBoundingClientRect().right;
      const mer = [...document.querySelectorAll('pre.mermaid')].filter((p) => p.getClientRects().length); // hidden tabs render when opened
      const mermaidFailed = mer.filter((p) => !p.querySelector('svg') || /syntax error/i.test(p.textContent)).map((p, i) => (p.dataset.src || ("block " + (i + 1))).slice(0, 60));
      const wide = [...content.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().right > right + 2 && getComputedStyle(e).overflowX !== 'auto' && !e.closest('.table-wrap.scrolls, pre'))
        .slice(0, 5).map((e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList[0] ? '.' + e.classList[0] : ''));
      return JSON.stringify({ mermaid: mer.length, mermaidFailed, charts: document.querySelectorAll('canvas[data-chart]').length, pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2, wide });
    })()` });
    const info = JSON.parse(ev?.result?.value || '{}');
    return { consoleErrors, exceptions, ...info };
  } finally {
    try { await fetch(`http://127.0.0.1:${cdpPort}/json/close/${tab.id}`); } catch { /* tab already gone */ }
    await new Promise((res) => { ws.onclose = res; ws.close(); setTimeout(res, 500); }); // let the socket close before process.exit (libuv assertion on Windows otherwise)
  }
}
// Browser findings join the static check: exceptions, console errors and failed diagrams are errors,
// overflow is a warning. Shared by `check --browser` and `publish --browser`.
function mergeBrowser(check, b) {
  if (b.skipped) return;
  check.errors.push(...b.exceptions.map((e) => `browser exception: ${e}`), ...b.consoleErrors.map((e) => `browser console: ${e}`), ...b.mermaidFailed.map((m) => `mermaid did not render: "${m}"`));
  if (b.pageOverflow) check.warnings.push('the page scrolls horizontally');
  check.warnings.push(...b.wide.map((w) => `wider than its column: ${w}`));
  check.ok = check.errors.length === 0;
}
function cssString(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' '); }

function contextUsage(root, sessionId, versions) {
  if (!sessionId) return null;
  const dir = claudeProjectDir(root);
  if (!dir) return null;
  const file = path.join(dir, `${sessionId}.jsonl`);
  let mtime, points;
  try { mtime = fs.statSync(file).mtimeMs; points = usagePoints(file); } catch { return null; } // the plan's session has no transcript here
  const last = points[points.length - 1];
  if (!last) return null;
  const { used, output, model } = last;
  let window = contextWindowSize(model);
  if (used > window) window = 1e6;
  return { used, window, pct: Math.round((used / window) * 100), output, model, sessionId, at: new Date(mtime).toISOString(), own: true, ownActiveAt: new Date(mtime).toISOString(), segments: contextSegments(file, versions) };
}

// ---------- content check ----------
// Static checks on content.html before it is published. Errors block `publish` (--force overrides),
// warnings and hints are printed for the agent. No DOM, no browser: regexes over the fragment.
const stripTags = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const lineOf = (html, idx) => html.slice(0, idx).split('\n').length;
const NUMERIC_CELL = /^[\s\d.,%₪$€+-]+$/;

function checkContent(html, prevHtml) {
  const errors = [], warnings = [], hints = [];
  // bidi control characters: the page handles mixed text by itself; these leak as garbage
  const bidi = [...html.matchAll(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g)];
  if (bidi.length) errors.push(`bidi control characters (${bidi.length}) at lines ${[...new Set(bidi.map((m) => lineOf(html, m.index)))].slice(0, 8).join(', ')} — remove them`);
  // the file is a fragment
  for (const m of html.matchAll(/<(html|head|body)\b/gi)) errors.push(`<${m[1].toLowerCase()}> at line ${lineOf(html, m.index)} — content.html is a fragment, no page tags`);
  for (const m of html.matchAll(/<script\b/gi)) warnings.push(`<script> at line ${lineOf(html, m.index)} — inline scripts run after plan.js and are not checked; prefer the page's own features, keep them for one-off demos only`);
  for (const m of html.matchAll(/<style\b/gi)) hints.push(`<style> at line ${lineOf(html, m.index)} — prefer the classes in references/components.md`);
  // data-chart must be valid JSON
  for (const m of html.matchAll(/data-chart=(?:'([^']*)'|"([^"]*)")/g)) {
    const raw = (m[1] ?? m[2] ?? '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
    try { const cfg = JSON.parse(raw); if (!cfg.type || !cfg.data) warnings.push(`data-chart at line ${lineOf(html, m.index)} has no type/data`); }
    catch (e) { errors.push(`data-chart at line ${lineOf(html, m.index)} is not valid JSON: ${e.message.slice(0, 80)}`); }
    // H#66b: a chart carries its data as a table and its conclusion as a figcaption
    const figStart = html.lastIndexOf('<figure', m.index), figEnd = html.indexOf('</figure>', m.index);
    const fig = figStart >= 0 && figEnd > m.index && html.indexOf('</figure>', figStart) === figEnd ? html.slice(figStart, figEnd) : '';
    if (!fig) hints.push(`chart at line ${lineOf(html, m.index)} is not inside a <figure> — wrap it, add a one-sentence <figcaption> and a collapsed <details> data table (content-guide §5)`);
    else { if (!/<figcaption/i.test(fig)) hints.push(`chart at line ${lineOf(html, m.index)} has no <figcaption> conclusion`); if (!/<table/i.test(fig)) hints.push(`chart at line ${lineOf(html, m.index)} has no data table — add <details><summary>הנתונים</summary><table>…</table></details>`); }
  }
  // ids: unique; every h2 has one (comments and change detection key on them)
  const ids = new Map();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.set(m[1], (ids.get(m[1]) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) errors.push(`id="${id}" appears ${n} times`);
  const h2s = [...html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi)];
  const h2NoId = h2s.filter((m) => !/\bid="/.test(m[1]));
  if (h2NoId.length) warnings.push(`${h2NoId.length} <h2> without id: ${h2NoId.map((m) => `"${stripTags(m[2]).slice(0, 40)}"`).slice(0, 5).join(', ')} — give each a stable English kebab-case id`);
  if (!h2s.length) hints.push('no <h2> sections — a page without sections has no table of contents and nothing for comments to anchor to');
  // question blocks
  const qs = new Map();
  for (const m of html.matchAll(/<div\b[^>]*class="([^"]*)"[^>]*>/g)) {
    if (!m[1].split(/\s+/).includes('q')) continue; // the class token "q" itself, not q-title / q-rec
    const tag = m[0];
    const id = /data-q="([^"]+)"/.exec(tag)?.[1];
    if (!id) errors.push(`.q block at line ${lineOf(html, m.index)} has no data-q`);
    else qs.set(id, (qs.get(id) || 0) + 1);
    if (!/data-type="(single|multi)"/.test(tag)) warnings.push(`.q block ${id || ''} at line ${lineOf(html, m.index)} has no data-type="single|multi"`);
  }
  for (const [id, n] of qs) if (n > 1) errors.push(`data-q="${id}" appears ${n} times`);
  // external assets (links to sites are fine; images and scripts must be local)
  for (const m of html.matchAll(/<(img|script|link|iframe|source)\b[^>]*\b(?:src|href)="(https?:[^"]+)"/gi)) warnings.push(`<${m[1]}> loads ${m[2].slice(0, 60)} — the page must be self-contained (assets/ folder)`);
  // mermaid: Hebrew in an unquoted label breaks the parser
  for (const m of html.matchAll(/<pre\b[^>]*class="[^"]*\bmermaid\b[^"]*"[^>]*>([\s\S]*?)<\/pre>/g)) {
    const body = m[1].replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
    const kind = (body.trim().split(/\s+/)[0] || '').toLowerCase();
    if (!/^(flowchart|graph|sequencediagram|statediagram-v2|statediagram|classdiagram|erdiagram|gantt|mindmap|timeline|pie|quadrantchart|journey|gitgraph|xychart-beta|block-beta)$/.test(kind) && !kind.startsWith('%%')) warnings.push(`mermaid block at line ${lineOf(html, m.index)} starts with "${kind}" — unknown diagram type`);
    if (!/^(flowchart|graph)$/.test(kind)) continue;
    for (const line of body.split('\n')) {
      if (/^\s*(%%|classDef|class |style |click |subgraph|end\b)/.test(line)) continue;
      const bad = line.match(/[\[\({|]\s*([^"'\]\)}|]*[\u0590-\u05FF][^"'\]\)}|]*)\s*[\]\)}|]/);
      if (bad) { warnings.push(`mermaid label without quotes: "${bad[1].trim().slice(0, 40)}" (line ${lineOf(html, m.index)} block) — write A["${bad[1].trim().slice(0, 20)}"]`); break; }
    }
  }
  // prose that should have been a table or a diagram
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = stripTags(m[1]);
    if (t.length > 600) hints.push(`paragraph of ${t.length} chars at line ${lineOf(html, m.index)} — a table, list or diagram would scan better`);
  }
  // numeric columns with no visual encoding
  for (const tm of html.matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)) {
    if (/data-heat|class="[^"]*\bheatmap\b/.test(tm[1])) continue;
    // a chart's own data table (a <details> inside its <figure>, as the guide asks) is the chart in
    // numbers: the chart is its encoding
    const before = html.slice(0, tm.index), fig = before.lastIndexOf('<figure');
    if (fig > before.lastIndexOf('</figure>') && /data-chart/.test(before.slice(fig))) continue;
    if (/data-delta-good="down"/.test(tm[2]) && /data-spark=/.test(tm[2]) && !/data-spark-good=/.test(tm[2])) hints.push(`table at line ${lineOf(html, tm.index)}: deltas count a drop as good but sparklines do not — add data-spark-good="down" to the sparkline column, or a falling line turns red next to a green ▼`);
    const head = /<thead\b[^>]*>([\s\S]*?)<\/thead>/i.exec(tm[2]);
    const ths = head ? [...head[1].matchAll(/<th\b([^>]*)>([\s\S]*?)<\/th>/gi)] : [];
    const body = /<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i.exec(tm[2])?.[1] || '';
    const rows = [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)]);
    if (rows.length < 3 || !ths.length) continue;
    ths.forEach((th, i) => {
      if (/data-(heat|bar|rank|delta)/.test(th[1])) return;
      const head = stripTags(th[2]);
      if (/^(#|id|מס'?|מספר|סעיף|שורה|שנה|year|no\.?)$/i.test(head)) return; // identifiers, not measures
      const col = rows.map((r) => r[i]).filter(Boolean);
      if (col.length < 3) return;
      const numeric = col.filter((c) => { const t = stripTags(c[2]); return t !== '' && NUMERIC_CELL.test(t) && /\d/.test(t); });
      const distinct = new Set(numeric.map((c) => stripTags(c[2])));
      // a running sequence (1, 2, 3…) is a numbering, not a measure
      const ints = [...distinct].map((t) => Number(t.replace(/[^\d.-]/g, ''))).filter((n) => Number.isInteger(n)).sort((a, b) => a - b);
      if (ints.length === distinct.size && ints.every((n, k) => k === 0 || n === ints[k - 1] + 1)) return;
      if (numeric.length >= 3 && numeric.length >= col.length * 0.8 && distinct.size >= 3 && !col.some((c) => /data-(bar|heat|spark)/.test(c[1]))) hints.push(`column "${stripTags(th[2]).slice(0, 30)}" (table at line ${lineOf(html, tm.index)}) is numeric with no data-heat / data-bar / data-rank — see content-guide §6`);
    });
  }
  // sections that disappeared since the previous version (comments there will re-anchor)
  if (prevHtml) {
    const prevIds = [...prevHtml.matchAll(/<h2\b[^>]*\bid="([^"]+)"/gi)].map((m) => m[1]);
    const curIds = new Set(h2s.map((m) => /\bid="([^"]+)"/.exec(m[1])?.[1]).filter(Boolean));
    const gone = prevIds.filter((id) => !curIds.has(id));
    if (gone.length) warnings.push(`h2 ids removed since the previous version: ${gone.slice(0, 8).join(', ')} — comments on them climb to the nearest ancestor; keep ids stable when only the wording changed`);
  }
  return { ok: !errors.length, errors, warnings, hints };
}

// ---------- CLI ----------

// A plan name that matches nothing: say which ones exist, so the next call can be right.
function noPlan(root, name) {
  const dirs = listPlanDirs(root);
  console.error(`no such plan: ${name}. ${dirs.length ? `Plans in this project: ${dirs.join(', ')}` : 'This project has no plans yet.'}`);
  process.exit(1);
}

async function main() {
  const { pos, opts } = parseArgs(process.argv.slice(2));
  const cmd = pos[0];
  const usage = () => {
    // the command list is the header comment of this file: one source, printed as is
    // the header only: it ends at the first line that is not a comment (filtering every `//` line
    // of the file printed internal notes too)
    const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split(/\r?\n/).slice(1);
    const end = lines.findIndex((l) => !l.startsWith('//'));
    const head = lines.slice(0, end < 0 ? lines.length : end).map((l) => l.replace(/^\/\/ ?/, ''));
    console.error(['usage: node server.mjs <command> <project root> [args]', ...head].join('\n'));
    process.exit(cmd && cmd !== 'help' && cmd !== '--help' ? 2 : 0);
  };
  if (cmd !== 'serve') ensureUserLayer(SKILL_DIR);
  if (cmd === 'release') { console.log(JSON.stringify(release(SKILL_DIR, pos[1], { notesFile: opts['notes-file'], force: Boolean(opts.force) }), null, 2)); return; }
  const root = pos[1] ? path.resolve(pos[1]) : null;
  if (!cmd || !root) usage();
  // Commands added after 1.0 live in a map, and the user's own commands join it from
  // ~/.markup/ext/commands (OCP: a new command is a new entry, not an edit of the switch below).
  const commands = new Map([
    ['version', async () => { const i = installInfo(SKILL_DIR); console.log(JSON.stringify({ version: i.version, kind: i.kind, dir: i.dir, modified: i.modified, added: i.added, missing: i.missing }, null, 2)); }],
    ['update', async () => { await checkLatest({ force: Boolean(opts.force) }); console.log(JSON.stringify(updateStatus(SKILL_DIR), null, 2)); }],
    ['upgrade', () => upgradeCommand(root, pos[2], pos[3])],
    ['issue', () => issueCommand(root, opts)],
  ]);
  for (const [name, mod] of await extCommands()) if (!commands.has(name)) commands.set(name, () => mod.run({ pos, opts, root, skillDir: SKILL_DIR }));
  if (commands.has(cmd)) return commands.get(cmd)();

  switch (cmd) {
    case 'port': {
      console.log(portFor(root));
      return;
    }
    case 'serve': {
      const port = Number(opts.port) || portFor(root);
      const idleMs = opts['idle-ms'] !== undefined ? Number(opts['idle-ms']) : IDLE_MS_DEFAULT;
      return serve(root, port, idleMs);
    }
    case 'ensure': {
      console.log(JSON.stringify(await ensure(root)));
      return;
    }
    case 'list': {
      console.log(JSON.stringify(listPlanDirs(root).map((d) => planSummary(root, d)), null, 2));
      return;
    }
    case 'open': {
      const srv = await ensure(root);
      const dir = pos[2] ? findPlanDir(root, pos[2]) : null;
      const url = dir ? `${srv.url}${dir}/` : srv.url;
      openBrowser(url);
      track('open', { plan: Boolean(dir), started: srv.started }, sessionOf(opts));
      console.log(JSON.stringify({ url, port: srv.port, started: srv.started }));
      return;
    }
    case 'publish': {
      if (!pos[2]) usage();
      let dir = findPlanDir(root, pos[2]);
      if (!dir) dir = `${localDate()}-${slugify(pos[2])}`;
      const p = planPaths(root, dir);
      if (!fs.existsSync(p.content)) { console.error(`missing ${p.content} — write content.html first`); process.exit(1); }
      const gitignored = ensureGitignore(root);
      const meta = readMeta(root, dir);
      const now = new Date().toISOString();
      meta.dir = dir;
      meta.slug = dir.replace(/^\d{4}-\d{2}-\d{2}-/, '');
      meta.createdAt ||= now;
      meta.updatedAt = now;
      if (opts.title) meta.title = String(opts.title);
      if (opts.lang) meta.lang = String(opts.lang).toLowerCase();
      else meta.lang = detectLang(fs.readFileSync(p.content, 'utf8')); // R1: the page follows its content unless --lang says otherwise
      meta.textDir = opts.dir === 'ltr' || opts.dir === 'rtl' ? opts.dir : dirOf(meta.lang); // --dir overrides the script's direction (H#72)
      const sidOpt = sessionOf(opts);
      // Another session's plan is not taken over by a slug that happens to match: that silently
      // replaced its content and moved its session. --takeover when it is meant.
      if (sidOpt && meta.sessionId && meta.sessionId !== sidOpt && !opts.takeover) {
        console.error(JSON.stringify({ error: `plan ${dir} belongs to session ${meta.sessionId} — pick another slug, or pass --takeover to replace it`, dir, sessionId: meta.sessionId }, null, 2));
        process.exit(1);
      }
      let sessionIssued = false;
      if (sidOpt) meta.sessionId = sidOpt;
      else if (!meta.sessionId) { meta.sessionId = newSessionId(); sessionIssued = true; }
      const versions = listVersions(root, dir);
      const content = fs.readFileSync(p.content, 'utf8');
      const last = versions.length ? readContent(root, dir, versions[versions.length - 1]) : null;
      // static checks first: errors block the publish unless --force
      const check = await runExtChecks(checkContent(content, last), content, last);
      if (!check.ok && !opts.force) {
        // the rule is the start of each message, before its line numbers and advice
        track('publish_blocked', { errors: check.errors.length, rules: [...new Set(check.errors.map((e) => String(e).split(/ at line| —| \(|:/)[0].replace(/"[^"]*"/g, '"…"').trim().slice(0, 40)))].join(' | '), newPlan: !versions.length }, meta.sessionId);
        console.error(JSON.stringify({ error: 'check failed — fix content.html or pass --force', ...check }, null, 2)); process.exit(1);
      }
      let version = versions[versions.length - 1] || null;
      let created = false;
      // A one-line note on what changed since the previous version. Passed as a FILE
      // (never as an argument) so Hebrew survives the Windows shells intact.
      const note = opts['note-file'] ? fs.readFileSync(String(opts['note-file']), 'utf8').trim().split('\n')[0].slice(0, 200) : '';
      if (content !== last) {
        version = versionStamp();
        fs.mkdirSync(p.history, { recursive: true });
        fs.writeFileSync(path.join(p.history, `${version}.html`), content);
        created = true;
        if (!versions.length) meta.seenVersion = version; // first version: nothing to compare against
        if (note) { meta.notes = meta.notes || {}; meta.notes[version] = note; }
      } else if (note && version) { meta.notes = meta.notes || {}; meta.notes[version] = note; }
      writeJson(p.meta, meta);
      if (!fs.existsSync(p.comments)) writeComments(root, dir, []);
      const srv = await ensure(root);
      const url = `${srv.url}${dir}/`;
      const info = await ping(srv.port);
      const alreadyOpen = Boolean(info?.active && info.active[dir] !== undefined);
      let opened = false;
      if (!opts['no-open'] && !alreadyOpen) { openBrowser(url); opened = true; }
      const counts = countBy(readComments(root, dir));
      const wakeDone = await markWakeSafe(root, dir, 'doneAt', { onlyIfNoOpen: true });
      const listening = Boolean(info?.listening);
      const out = { url, dir, title: meta.title, lang: meta.lang, version, newVersion: created, versions: versions.length + (created ? 1 : 0), opened, alreadyOpen, gitignoreUpdated: gitignored, comments: counts, listening, wakeDone, session: meta.sessionId, check: { errors: check.errors, warnings: check.warnings, hints: check.hints } };
      if (!sidOpt) out.sessionHint = sessionIssued ? `no --session given: issued ${meta.sessionId}; pass --session ${meta.sessionId} on every later call (wait, comments, reply, done, publish)` : `no --session given: kept the plan's session ${meta.sessionId}; pass --session on every call`;
      if (opts.browser) {
        const b = await browserCheck(url, Number(opts.cdp || 9222));
        out.browser = b;
        mergeBrowser(out.check, b);
      }
      if (!listening) out.warning = 'no agent is listening: the agent button on the page can only copy a command for the user to paste into the chat — arm `/markup wait` (Monitor) before ending the turn';
      track('plan_publish', {
        newPlan: !versions.length, newVersion: created, versions: out.versions, lang: meta.lang, dir: meta.textDir, ...pageShape(content),
        errors: check.errors.length, warnings: check.warnings.length, hints: check.hints.length, forced: Boolean(opts.force && !check.ok),
        note: Boolean(note), listening, alreadyOpen, browserCheck: Boolean(opts.browser), threads: counts.open + counts.waiting + counts.closed, openThreads: counts.open,
      }, meta.sessionId);
      const upd = updateStatus(SKILL_DIR);
      if (upd.available && !upd.dismissed) out.update = { current: upd.current, latest: upd.latest, kind: upd.kind, say: `markup ${upd.latest} is available (installed ${upd.current}) — tell the user in one line; the page shows an upgrade balloon` };
      console.log(JSON.stringify(out));
      return;
    }
    case 'check': {
      // node server.mjs check <root> <slug|dir>  -> prints {ok, errors, warnings, hints}; exit 1 on errors
      if (!pos[2]) usage();
      const dir = findPlanDir(root, pos[2]);
      const file = dir ? planPaths(root, dir).content : path.resolve(pos[2]);
      if (!fs.existsSync(file)) { console.error(`missing ${file}`); process.exit(1); }
      const versions = dir ? listVersions(root, dir) : [];
      const prev = versions.length ? readContent(root, dir, versions[versions.length - 1]) : null;
      const html = fs.readFileSync(file, 'utf8');
      const result = await runExtChecks(checkContent(html, prev), html, prev);
      if (opts.browser && dir) {
        const srv = await ensure(root);
        const b = await browserCheck(`${srv.url}${dir}/`, Number(opts.cdp || 9222));
        result.browser = b;
        mergeBrowser(result, b);
      }
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.ok ? 0 : 1; // no process.exit: the CDP socket must finish closing first
      return;
    }
    case 'wait': {
      // Blocks until the user presses "done, wake the agent" on any plan of the project (or the
      // given plan), then prints one line and exits. Meant for the agent's Monitor tool: the line
      // re-invokes the agent, which then runs `comments`. Polls the wake.json files every 2s;
      // --timeout-ms (default 6h) exits with "timeout".
      const dirsToWatch = pos[2] ? [findPlanDir(root, pos[2])].filter(Boolean) : null;
      if (pos[2] && !dirsToWatch.length) noPlan(root, pos[2]);
      const started = Date.now();
      const timeoutMs = Number(opts['timeout-ms'] || 6 * 3600 * 1000);
      // A press nobody has picked up yet (no pickedAt, not cancelled or done) is served whenever it
      // happened, not only after this `wait` started: a press made while no listener was armed (the
      // Monitor expired, the agent was mid-turn) used to be lost for good. Presses older than a day
      // are stale.
      const PENDING_MAX_MS = 24 * 3600 * 1000;
      const pendingWake = (dir) => {
        const w = readJson(planPaths(root, dir).wake, null);
        if (!w?.at || w.pickedAt || w.doneAt) return false;
        return Date.now() - new Date(w.at).getTime() < PENDING_MAX_MS;
      };
      // Heartbeat so the page can show "an agent is listening"; the server may be down, which
      // only costs the indicator (the wake itself is a file).
      const portFile = path.join(dataDir(root), '.port');
      const hbPort = fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, 'utf8').trim()) || portFor(root) : portFor(root);
      // Only this session's plans (and plans with no session) unless --all: two sessions on one
      // project both answered the same press on 28/08, and the user got every answer twice.
      const mySession = sessionOf(opts);
      if (!mySession && !opts.all) console.error('warning: wait without --session listens only to plans that have no session');
      const mine = (d) => opts.all || !mySession || !(readMeta(root, d).sessionId) || readMeta(root, d).sessionId === mySession;
      const heartbeat = (bye) => request(hbPort, 'POST', '/api/listeners', { pid: process.pid, sessionId: mySession, all: Boolean(opts.all), bye: Boolean(bye) }).catch(() => {});
      let lastHb = 0;
      try {
        for (;;) {
          if (Date.now() - lastHb > 5000) { lastHb = Date.now(); await heartbeat(false); }
          const dirs = (dirsToWatch || listPlanDirs(root)).filter(mine);
          const hit = dirs.find(pendingWake);
          if (hit) {
            await markWakeSafe(root, hit, 'pickedAt');
            const w = readJson(planPaths(root, hit).wake, {});
            if (w.kind === 'upgrade') { console.log(`UPGRADE ${hit} ${w.at} — the user pressed upgrade on the page: follow "Mode: upgrade" in SKILL.md (node "${SELF}" upgrade "${root}" prepare), then run: node "${SELF}" done "${root}" ${hit}${mySession ? ` --session ${mySession}` : ''}`); return; }
            console.log(`WAKE ${hit} ${readJson(planPaths(root, hit).wake, {}).at} — run: node "${SELF}" comments "${root}" ${hit}${mySession ? ` --session ${mySession}` : ''}`);
            return;
          }
          if (Date.now() - started > timeoutMs) { console.log('timeout'); return; }
          await new Promise((r) => setTimeout(r, 2000));
        }
      } finally { await heartbeat(true); }
    }
    case 'comments': {
      // H#76 (31/08): full separation between conversations. Without an explicit plan, `comments`
      // serves only this session's plans (and legacy plans with no session); it must not read —
      // and mark as read — another session's threads and picks, nor stamp `workingAt` on its pages.
      const mySession = sessionOf(opts);
      const mine = (d) => { const sid = readMeta(root, d).sessionId; return opts.all || !sid || sid === mySession; };
      const dirs = pos[2] ? [findPlanDir(root, pos[2])].filter(Boolean) : listPlanDirs(root).filter(mine);
      if (pos[2] && !dirs.length) noPlan(root, pos[2]);
      if (!pos[2] && !mySession && !opts.all) console.error('warning: comments without --session covers only plans that have no session (--all for everything)');
      const out = [];
      let total = 0;
      let shown = 0; // threads printed as open (all of them with --all)
      const closedOut = [];
      const readAt = new Date().toISOString(); // what changes after this moment is new next time
      const seenThreads = new Map(); // dir -> closed thread ids printed now
      for (const dir of dirs) {
        await markWakeSafe(root, dir, 'workingAt'); // the agent is reading: the page chip says so
        const all = readComments(root, dir);
        const list = all.filter((t) => opts.all || t.status === 'open');
        if (list.length) {
          total += list.length;
          shown += list.length;
          out.push(`## ${readMeta(root, dir).title} (${dir})`);
          for (const t of list) out.push(threadToMarkdown(t, dir, root), '');
        }
        // "closed" means the user has nothing more to add — NOT that the thread is
        // irrelevant. Surface each closed thread once so its content is actually read,
        // then mark it seen so it stops repeating on every run.
        if (opts.all) continue;
        const lastAt = (t) => (t.messages || []).reduce((m, x) => (x.editedAt || x.at) > m ? (x.editedAt || x.at) : m, '');
        const unread = all.filter((t) => t.status === 'closed' && (!t.agentSeenAt || t.agentSeenAt < lastAt(t)));
        if (!unread.length) continue;
        closedOut.push(`## Closed, not read yet — ${readMeta(root, dir).title} (${dir})`);
        for (const t of unread) closedOut.push(threadToMarkdown(t, dir, root), '');
        seenThreads.set(dir, unread.map((t) => t.id));
      }
      if (closedOut.length) {
        out.push('---', 'Threads the user closed. Closed means they have nothing to add, not that the thread is irrelevant.',
          'Read them and absorb their content. Do not reply to them and do not ask for a decision in them.', '', ...closedOut);
        total += closedOut.length;
      }
      // Answers to selectable questions: print those changed since the agent last read them (or
      // all with --all), then mark them read. A selection counts as an answer, like a comment.
      const ansOut = [];
      const seenAnswers = new Map(); // dir -> question ids printed now
      for (const dir of dirs) {
        const p = planPaths(root, dir);
        const all = readJson(p.answers, {});
        const ids = Object.keys(all).filter((q) => opts.all || !all[q].seenAt || all[q].seenAt < all[q].at);
        if (!ids.length) continue;
        ansOut.push(`## Picks in question blocks — ${readMeta(root, dir).title} (${dir})`);
        for (const q of ids) {
          const a = all[q];
          const picked = a.labels.length ? a.labels.map((l, i) => `${a.values[i] ?? ''}. ${l}`).join(' | ') : '(nothing picked)';
          ansOut.push(`- ${q}${a.title ? ` (${a.title})` : ''}${a.section ? ` · section: ${a.section}` : ''} [${fmtDate(a.at)}]: ${picked}${a.text ? `\n  free text: ${a.text.replace(/\n/g, '\n  ')}` : ''}`);
          for (const at of a.attachments || []) ansOut.push(`  attachment: ${path.join(dataDir(root), dir, 'assets', at.file)} (${at.name}, ${at.type})`);
        }
        if (!opts.all) seenAnswers.set(dir, ids);
      }
      for (const dir of dirs) await markSeenSafe(root, dir, seenThreads.get(dir) || [], seenAnswers.get(dir) || [], readAt);
      if (ansOut.length) { out.push('---', 'Picks made on the page (radio / multi). Every pick is an answer to a question, like a comment.', '', ...ansOut); total += ansOut.length; }
      track('comments_read', { plans: dirs.length, threads: shown, closedUnread: [...seenThreads.values()].reduce((n, l) => n + l.length, 0), picks: [...seenAnswers.values()].reduce((n, l) => n + l.length, 0), all: Boolean(opts.all), plan: Boolean(pos[2]) }, mySession);
      if (!total) { console.log(opts.all ? 'No comments.' : 'No open comments.'); return; }
      if (out.some((l) => l.includes(' kind=issue '))) out.push('---', `Threads marked kind=issue report a bug, a request or a question about the markup skill itself, for its GitHub repository (${ISSUE_REPO}). Follow "Mode: issue" in SKILL.md: post the draft in the thread, and file it only after the user approves it there.`);
      out.push(`---`, `Reply with: node "${SELF}" reply "${root}" <dir> <threadId> --file <answer.txt>${opts.session ? ` --session ${opts.session}` : ' --session <id>'}   (first line of the file: "# <short title>")`);
      console.log(out.join('\n'));
      return;
    }
    case 'reply': {
      const dir = findPlanDir(root, pos[2]);
      const id = pos[3];
      if (!pos[2] || !id) usage();
      if (!dir) noPlan(root, pos[2]);
      let text = opts.file ? fs.readFileSync(String(opts.file), 'utf8').trim() : (pos[4] || '').trim();
      // A first line of the form "# short title" names the thread and is stripped from
      // the message. Kept inside the file so Hebrew never travels as a CLI argument.
      let title = null;
      const titleMatch = /^#[ \t]+(.+)/.exec(text);
      if (titleMatch) { title = titleMatch[1].trim().slice(0, 120); text = text.slice(titleMatch[0].length).trim(); }
      if (!text) { console.error('empty reply'); process.exit(1); }
      const portFile = path.join(dataDir(root), '.port');
      const port = fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, 'utf8').trim()) || portFor(root) : portFor(root);
      const srv = await ping(port);
      if (srv?.app === 'markup' && normalizePath(srv.root) === normalizePath(root)) {
        let titleSaved = null;
        if (title) { const tr = await request(port, 'PATCH', `/${dir}/api/comments/${id}`, { title }); titleSaved = tr.status === 200 && tr.body?.title === title; }
        const r = await request(port, 'POST', `/${dir}/api/comments/${id}/messages`, { role: 'agent', text });
        if (r.status !== 200) { console.error(JSON.stringify(r.body)); process.exit(1); }
        if (title && !titleSaved) console.error('warning: title was not saved — the running server may be stale; run `ensure` and reply again');
        stampSession(root, dir, sessionOf(opts));
        const wakeDone = await markWakeSafe(root, dir, 'doneAt', { onlyIfNoOpen: true });
        console.log(JSON.stringify({ ok: true, via: 'server', id, title, titleSaved, status: r.body.status, wakeDone }));
        return;
      }
      // server down: edit the file directly
      const list = readComments(root, dir);
      const t = list.find((x) => x.id === id);
      if (!t) { console.error('no such thread'); process.exit(1); }
      if (title) t.title = title;
      t.messages.push({ role: 'agent', text, at: new Date().toISOString() });
      t.status = 'waiting';
      writeComments(root, dir, list);
      track('comment_message', { role: 'agent', kind: t.kind || 'comment', messages: t.messages.length, attachments: 0, chars: text.length, via: 'file' }, sessionOf(opts) || readMeta(root, dir).sessionId);
      stampSession(root, dir, sessionOf(opts));
      const wakeDone = markWake(root, dir, 'doneAt', { onlyIfNoOpen: true });
      console.log(JSON.stringify({ ok: true, via: 'file', id, title, status: t.status, wakeDone }));
      return;
    }
    case 'done': {
      // The agent finished the round the done button started (use when nothing else stamps it:
      // no reply was needed, or a thread was left open on purpose). Without a plan: every plan.
      // H#76: without a plan, stamp only this session's plans — never another conversation's chip
      const mySession = sessionOf(opts);
      const mine = (d) => { const sid = readMeta(root, d).sessionId; return opts.all || !sid || sid === mySession; };
      const dirs = pos[2] ? [findPlanDir(root, pos[2])].filter(Boolean) : listPlanDirs(root).filter(mine);
      if (pos[2] && !dirs.length) noPlan(root, pos[2]);
      const stamped = [];
      for (const d of dirs) if (await markWakeSafe(root, d, 'doneAt')) stamped.push(d);
      console.log(JSON.stringify({ ok: true, done: stamped }));
      return;
    }
    default:
      usage();
  }
}

// `issue`: a report about markup itself, filed on the skill's repository with the user's `gh`.
// --dry-run prints the exact title, body and labels (the draft the user approves); a thread given
// with --plan/--thread lends its type and browser, and gets the issue link recorded on it.
async function issueCommand(root, opts) {
  const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };
  if (!opts.file || opts.file === true) fail('usage: issue <root> --file <draft.md> [--type bug|feature|question|other] [--plan <dir> --thread <id>] [--dry-run]', 2);
  const draft = readDraft(String(opts.file));
  if (!draft.title || !draft.body) fail('the draft needs "# <title>" on its first line and a body below it');
  let dir = null, thread = null;
  if (opts.plan || opts.thread) {
    dir = findPlanDir(root, String(opts.plan || ''));
    thread = dir ? readComments(root, dir).find((t) => t.id === String(opts.thread)) : null;
    if (!thread) fail(`no such thread: ${opts.plan} ${opts.thread}`);
  }
  if (opts.type && !ISSUE_TYPES[opts.type]) fail(`--type is one of: ${Object.keys(ISSUE_TYPES).join(', ')}`, 2);
  const type = opts.type || thread?.issueType || 'other';
  const issue = composeIssue({ ...draft, type, env: environment(SKILL_DIR, { ua: thread?.ua }) });
  const link = newIssueUrl(ISSUE_REPO, issue);
  if (opts['dry-run']) { console.log(JSON.stringify({ dryRun: true, repo: ISSUE_REPO, ...issue, link }, null, 2)); return; }
  const r = fileIssue(ISSUE_REPO, issue);
  track('issue_filed', { type, via: r.ok ? 'gh' : 'link', fromThread: Boolean(thread) }, opts.session ? String(opts.session) : null);
  if (!r.ok) {
    console.log(JSON.stringify({ ok: false, via: 'link', reason: r.reason, url: link, say: 'gh could not file the issue: give the user this link, it opens the GitHub form with every field filled in' }, null, 2));
    process.exitCode = 1;
    return;
  }
  if (thread) {
    const rec = { url: r.url, number: r.number };
    const portFile = path.join(dataDir(root), '.port');
    const port = fs.existsSync(portFile) ? Number(fs.readFileSync(portFile, 'utf8').trim()) || portFor(root) : portFor(root);
    const srv = await ping(port);
    if (srv?.app === 'markup' && normalizePath(srv.root) === normalizePath(root)) await request(port, 'PATCH', `/${dir}/api/comments/${thread.id}`, { issue: rec });
    else { const list = readComments(root, dir); const t = list.find((x) => x.id === thread.id); if (t) { t.issue = rec; writeComments(root, dir, list); } }
  }
  console.log(JSON.stringify({ ok: true, via: 'gh', url: r.url, number: r.number, labelsDropped: r.labelsDropped }, null, 2));
}

// `upgrade` (V7, V8). Without a subcommand it upgrades a clean install in one step and refuses a
// changed one, pointing at the agent path. After a write, this project's server restarts on the new
// code (other projects' servers restart at their next publish or open: `ensure` retires old code).
async function upgradeCommand(root, sub, arg) {
  const restart = async (r) => { if (r.ok) r.server = await ensure(root).catch((e) => ({ error: String(e.message || e) })); return r; };
  let out;
  if (sub === 'prepare') out = await prepare(SKILL_DIR);
  else if (sub === 'apply') {
    if (!arg) { console.error('usage: upgrade <root> apply <workspace>'); process.exit(2); }
    out = await restart(apply(SKILL_DIR, path.resolve(arg)));
  } else if (sub === 'rollback') out = await restart(rollback(SKILL_DIR));
  else if (!sub) {
    const st = installInfo(SKILL_DIR);
    if (st.kind === 'dev') out = { error: `git checkout: run git -C "${st.dir}" pull`, kind: 'dev' };
    else {
      out = await upgradeIfClean(SKILL_DIR);
      if (out.needsAgent) out = { ...out, error: 'the install has changes of the user: follow "Mode: upgrade" in SKILL.md (the workspace above is ready for it)' };
      else await restart(out);
    }
  } else { console.error('usage: upgrade <root> [prepare|apply <workspace>|rollback]'); process.exit(2); }
  track('upgrade', { via: 'cli', step: sub || 'one-step', from: out.from ?? out.current ?? out.undid, to: out.to ?? out.latest ?? out.restored, result: out.error ? 'error' : out.upToDate ? 'up_to_date' : out.needsAgent ? 'needs_agent' : out.ok ? 'ok' : 'prepared' });
  console.log(JSON.stringify(out, null, 2));
  if (out.error) process.exitCode = 1;
}

main().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
