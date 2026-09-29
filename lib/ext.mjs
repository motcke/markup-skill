// Extension points (V9, 28/09). What a user adds to markup lives in ~/.markup/ext/ and the core
// loads it, so the skill folder stays exactly as released and an upgrade has nothing to merge.
//
//   ext/*.css            loaded after plan.css on every page (and the home page)
//   ext/vendor/*.js      extra libraries, loaded before plan.js
//   ext/*.js             page components, loaded after plan.js; they call markup.register(...)
//   ext/checks/*.mjs     extra `check` rules: export default { id, run(html, prevHtml) -> [{ level, message }] }
//   ext/commands/*.mjs   extra CLI commands: export default { name, run({ pos, opts, root, skillDir }) }
//   ext/components.md    snippets the agent reads next to references/components.md
// Full description: docs/extensions.md.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { userPath } from './user.mjs';

export const EXT_DIR = userPath('ext');
const SAFE = /^[A-Za-z0-9._-]+$/;
const list = (sub, re) => {
  try { return fs.readdirSync(path.join(EXT_DIR, sub)).filter((f) => SAFE.test(f) && re.test(f)).sort(); } catch { return []; }
};

// Tags the server fills into template.html / home.html: {{EXT_HEAD}} after plan.css, {{EXT_VENDOR}}
// before plan.js, {{EXT_SCRIPTS}} after it. Read on every page load, so a new file needs no restart.
export function extTags() {
  return {
    head: list('', /\.css$/).map((f) => `<link rel="stylesheet" href="/_ext/${f}">`).join('\n'),
    vendor: list('vendor', /\.js$/).map((f) => `<script src="/_ext/vendor/${f}"></script>`).join('\n'),
    scripts: list('', /\.js$/).map((f) => `<script src="/_ext/${f}"></script>`).join('\n'),
  };
}

// /_ext/<file> and /_ext/vendor/<file>; anything else is not served.
export function extFile(parts) {
  if (parts.length === 1 && SAFE.test(parts[0])) return path.join(EXT_DIR, parts[0]);
  if (parts.length === 2 && parts[0] === 'vendor' && SAFE.test(parts[1])) return path.join(EXT_DIR, 'vendor', parts[1]);
  return null;
}

async function loadModules(sub) {
  const out = [];
  for (const f of list(sub, /\.mjs$/)) {
    const file = path.join(EXT_DIR, sub, f);
    try { const m = await import(pathToFileURL(file).href); out.push({ file, mod: m.default || m }); }
    catch (e) { out.push({ file, error: String(e?.message || e).slice(0, 200) }); }
  }
  return out;
}

// Runs every ext/checks module over the fragment and merges its findings into a check result.
// A check that throws or fails to load is reported as a warning; it never blocks a publish by
// crashing.
export async function runExtChecks(result, html, prevHtml) {
  for (const { file, mod, error } of await loadModules('checks')) {
    const id = mod?.id || path.basename(file, '.mjs');
    if (error || typeof mod?.run !== 'function') { result.warnings.push(`ext check ${id}: ${error || 'no run() export'}`); continue; }
    try {
      for (const f of (await mod.run(html, prevHtml)) || []) {
        const bucket = f.level === 'error' ? result.errors : f.level === 'hint' ? result.hints : result.warnings;
        bucket.push(`[${id}] ${f.message}`);
      }
    } catch (e) { result.warnings.push(`ext check ${id} threw: ${String(e?.message || e).slice(0, 160)}`); }
  }
  result.ok = result.errors.length === 0;
  return result;
}

export async function extCommands() {
  const map = new Map();
  for (const { mod } of await loadModules('commands')) if (mod?.name && typeof mod.run === 'function') map.set(String(mod.name), mod);
  return map;
}
