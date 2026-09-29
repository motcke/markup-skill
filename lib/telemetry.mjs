// Usage telemetry (T1, 01/10). Application Insights custom events, posted straight to the ingestion
// endpoint with no SDK: an SDK auto-collects requests, dependencies, console output and heartbeats,
// all of it paid ingestion, and only the events tracked by name below are worth anything. A command
// appends one line to ~/.markup/telemetry/queue.jsonl and returns at once; the server sends the
// queue as one batch a few seconds after it starts and then every few minutes, so a CLI call never
// waits on the network. `"telemetry": false` in ~/.markup/config.json turns it off. Telemetry never
// breaks a command: every failure here is swallowed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readConfig, readJson, writeJson, userPath } from './user.mjs';
import { installInfo } from './update.mjs';

// resource markup-skill (resource group markup-skill, Israel Central). Write-only: the key sends, it cannot read.
const IKEY = '7b08d7a1-3be8-45fe-9d23-3cd1806ff956';
const ENDPOINT = 'https://israelcentral-0.in.applicationinsights.azure.com/v2.1/track';
const DIR = () => userPath('telemetry');
const QUEUE = () => path.join(DIR(), 'queue.jsonl');
const ID_FILE = () => path.join(DIR(), 'id.json');
const MAX_BATCH = 500;              // a machine offline for weeks sends its newest events, not a flood
const RETRY_MS = 3600 * 1000;       // a batch that failed to send is retried after an hour
const GIVE_UP_MS = 7 * 24 * 3600 * 1000;

const enabled = () => readConfig().telemetry !== false;

function installId() {
  const rec = readJson(ID_FILE(), null);
  if (rec?.installId) return rec.installId;
  const id = randomUUID();
  writeJson(ID_FILE(), { installId: id, since: new Date().toISOString() });
  // update.json is written by every server since 1.0.0: an install that has one is an existing user
  // seen for the first time by telemetry, not a new one
  append({ name: 'first_run', props: { existing: String(fs.existsSync(userPath('update.json'))) } });
  return id;
}

function append(rec) {
  fs.mkdirSync(DIR(), { recursive: true });
  fs.appendFileSync(QUEUE(), `${JSON.stringify({ time: new Date().toISOString(), ...rec })}\n`);
}

const strings = (props) => Object.fromEntries(Object.entries(props || {}).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, String(v).slice(0, 500)]));

// One custom event. `session` is the agent's conversation id (the plan's sessionId on the server).
export function track(name, props = {}, session = null) {
  try {
    if (!enabled()) return;
    installId();
    append({ name, session, props: strings(props) });
  } catch { /* never in the way */ }
}

// One exception, by message only (no stack). The same message is queued once per process: a broken
// route hit by every poll of an open tab would otherwise fill the day's quota.
const sentErrors = new Set();
export function trackError(op, err, session = null) {
  try {
    const message = String(err?.message || err).split('\n')[0].slice(0, 500);
    if (!enabled() || sentErrors.has(message)) return;
    sentErrors.add(message);
    installId();
    append({ name: 'exception', exception: { type: err?.name || 'Error', message }, session, props: { op } });
  } catch { /* never in the way */ }
}

// Properties on every event, read when the batch is sent (the server is restarted by an upgrade, so
// the version is the running one). The same names as the Cursor RTL extension's telemetry, so the
// dashboards' queries carry over.
let common = null;
function commonProps(skillDir) {
  if (common) return common;
  let user = {};
  try { user = os.userInfo(); } catch { /* no passwd entry */ }
  const intl = Intl.DateTimeFormat().resolvedOptions();
  const inst = installInfo(skillDir);
  common = strings({
    host: os.hostname(), username: user.username, homedir: user.homedir, tz: intl.timeZone, locale: intl.locale,
    platform: os.platform(), arch: os.arch(), node: process.versions.node,
    markupVersion: inst.version || 'unknown', installKind: inst.kind,
  });
  return common;
}

function envelope(e, id, props) {
  const tags = { 'ai.user.id': id, 'ai.application.ver': props.markupVersion, 'ai.cloud.role': 'markup', 'ai.cloud.roleInstance': props.host, 'ai.internal.sdkVersion': `markup:${props.markupVersion}` };
  if (e.session) tags['ai.session.id'] = e.session;
  const properties = { ...props, ...e.props };
  const data = e.exception
    ? { baseType: 'ExceptionData', baseData: { ver: 2, exceptions: [{ typeName: e.exception.type, message: e.exception.message, hasFullStack: false }], properties } }
    : { baseType: 'EventData', baseData: { ver: 2, name: e.name, properties } };
  return { name: e.exception ? 'Microsoft.ApplicationInsights.Exception' : 'Microsoft.ApplicationInsights.Event', time: e.time, iKey: IKEY, tags, data };
}

// Every server of every project flushes the same queue. A batch is claimed by renaming it to a name
// of its own (atomic, so two servers never send it twice); a claimed batch that was not sent keeps
// its file and is claimed again, by anyone, an hour later.
function claim() {
  const files = [];
  const mine = () => path.join(DIR(), `batch.${Date.now()}.${process.pid}.${files.length}.jsonl`);
  const take = (f) => { const to = mine(); try { fs.renameSync(f, to); files.push(to); } catch { /* another server took it, or it is being written */ } };
  if (fs.existsSync(QUEUE())) take(QUEUE());
  for (const f of fs.readdirSync(DIR())) {
    const m = /^batch\.(\d+)\./.exec(f);
    if (!m || files.includes(path.join(DIR(), f))) continue;
    const age = Date.now() - Number(m[1]);
    if (age > GIVE_UP_MS) fs.rmSync(path.join(DIR(), f), { force: true });
    else if (age > RETRY_MS) take(path.join(DIR(), f));
  }
  return files;
}

let flushing = null;
export function flush(skillDir) {
  flushing ||= (async () => {
    if (!fs.existsSync(DIR())) return;
    if (!enabled()) { for (const f of fs.readdirSync(DIR())) if (f.endsWith('.jsonl')) fs.rmSync(path.join(DIR(), f), { force: true }); return; }
    const id = installId();
    for (const file of claim()) {
      const events = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).slice(-MAX_BATCH);
      if (!events.length) { fs.rmSync(file, { force: true }); continue; }
      const props = commonProps(skillDir);
      const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(events.map((e) => envelope(e, id, props))), signal: AbortSignal.timeout(15000) });
      // 206 = some items rejected as malformed: sending them again would duplicate the rest
      if (r.ok || r.status === 206 || r.status === 400) fs.rmSync(file, { force: true });
    }
  })().catch(() => { /* offline: the batch waits for its retry */ }).finally(() => { flushing = null; });
  return flushing;
}

// The kind of content a page uses, for "which components do people use": one sorted list per publish.
const COMPONENTS = [
  ['table', /<table\b/i], ['kpi', /class="[^"]*\bkpis\b/], ['kv', /class="[^"]*\bkv\b/], ['cards', /class="[^"]*\bcards\b/],
  ['cols', /class="[^"]*\bcols\b/], ['steps', /class="[^"]*\bsteps\b/], ['timeline', /class="[^"]*\btimeline\b/],
  ['kanban', /class="[^"]*\bkanban\b/], ['checklist', /class="[^"]*\bchecklist\b/], ['question', /class="[^"]*\bq\b/],
  ['whatif', /class="[^"]*\bwhatif\b/], ['callout', /class="[^"]*\bcallout\b/], ['tabs', /class="[^"]*\btabs\b/],
  ['details', /<details\b/i], ['tree', /class="[^"]*\btree\b/], ['diff', /class="[^"]*\bdiff\b/], ['matrix', /class="[^"]*\bmatrix\b/],
  ['code', /<pre[^>]*>\s*<code/i], ['image', /<img\b/i], ['heat', /data-heat/], ['bar', /data-bar\b/],
];
export function pageShape(html) {
  const found = COMPONENTS.filter(([, re]) => re.test(html)).map(([n]) => n);
  for (const m of html.matchAll(/<pre class="mermaid"[^>]*>\s*(?:%%[^\n]*\n\s*)*([A-Za-z-]+)/g)) found.push(`mermaid:${m[1].replace(/-v2$/, '')}`);
  for (const m of html.matchAll(/data-chart='[^']*?"type"\s*:\s*"(\w+)"/g)) found.push(`chart:${m[1]}`);
  return { components: [...new Set(found)].sort().join(','), sections: (html.match(/<h2\b/gi) || []).length, kb: Math.round(html.length / 1024) };
}
