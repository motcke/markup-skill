// "Is there a newer markup?" (V3–V6, 28/09). The check runs in the background when a server starts,
// at most once a day, and stores its answer in ~/.markup/update.json — outside the skill folder, so
// the check itself never makes an install look modified. Network failures are recorded, not shown.
import { readConfig, readJson, writeJson, userPath } from './user.mjs';
import { readManifest, diffInstall, isDevCheckout, compareVersions, realDir } from './manifest.mjs';
import { sourceFor } from './source.mjs';

const DAY_MS = 24 * 3600 * 1000;
const CACHE = () => userPath('update.json');

// clean: every shipped file as released · modified: the user changed shipped files (the upgrade
// goes through the agent) · dev: a git checkout (the upgrade is `git pull`) · unknown: no manifest
// (an install older than 1.0.0).
export function installInfo(skillDir) {
  const manifest = readManifest(skillDir);
  const dev = isDevCheckout(skillDir);
  const diff = manifest ? diffInstall(skillDir, manifest) : { modified: [], missing: [], added: [] };
  const kind = dev ? 'dev' : !manifest ? 'unknown' : diff.modified.length ? 'modified' : 'clean';
  return { version: manifest?.version || null, dir: realDir(skillDir), kind, ...diff };
}

let inFlight = null;
export function checkLatest({ force = false } = {}) {
  const cfg = readConfig();
  if (!cfg.updateCheck && !force) return Promise.resolve(null);
  const cache = readJson(CACHE(), {});
  const fresh = cache.checkedAt && Date.now() - Date.parse(cache.checkedAt) < DAY_MS && cache.source === cfg.updateSource;
  if (fresh && !force) return Promise.resolve(cache);
  inFlight ||= (async () => {
    const prev = readJson(CACHE(), {});
    const next = { ...prev, checkedAt: new Date().toISOString(), source: cfg.updateSource };
    if (prev.source !== cfg.updateSource) delete next.latest; // another source: the old answer says nothing about it
    try { next.latest = await sourceFor(cfg.updateSource).latest(); delete next.error; }
    catch (e) { next.error = String(e?.message || e).slice(0, 200); } // a private repo or no network: quiet, retried tomorrow
    writeJson(CACHE(), next);
    return next;
  })().finally(() => { inFlight = null; });
  return inFlight;
}

export const checkIsStale = () => {
  const cfg = readConfig();
  const cache = readJson(CACHE(), {});
  return cfg.updateCheck && (!cache.checkedAt || cache.source !== cfg.updateSource || Date.now() - Date.parse(cache.checkedAt) >= DAY_MS);
};

// What the balloon shows. Reads the cache only (no network), so it is cheap enough for every page.
export function updateStatus(skillDir) {
  const cfg = readConfig();
  const cache = readJson(CACHE(), {});
  const inst = installInfo(skillDir);
  const latest = cache.source === cfg.updateSource ? cache.latest || null : null;
  const available = Boolean(cfg.updateCheck && latest?.version && inst.version && compareVersions(latest.version, inst.version) > 0);
  return {
    current: inst.version, latest: latest?.version || null, tag: latest?.tag || null, notes: latest?.notes || '', url: latest?.url || null,
    available, dismissed: Boolean(latest?.version && cache.dismissed === latest.version),
    kind: inst.kind, dir: inst.dir, modified: inst.modified, added: inst.added, missing: inst.missing,
    checkedAt: cache.checkedAt || null, error: cache.error || null,
  };
}

// "Not now": hidden until a newer version than this one appears.
export function dismiss(version) {
  const cache = readJson(CACHE(), {});
  cache.dismissed = String(version || '');
  writeJson(CACHE(), cache);
  return { ok: true, dismissed: cache.dismissed };
}
