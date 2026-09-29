// The user layer (V9, 28/09): ~/.markup/ holds everything that belongs to the user and not to the
// skill — taste, lessons, extensions, update state, backups. An upgrade replaces the skill folder
// and never touches this one, so nothing here needs merging.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export const DEFAULT_REPO = 'motcke/markup-skill';
export const USER_DIR = path.join(os.homedir(), '.markup');
export const userPath = (...p) => path.join(USER_DIR, ...p);

export function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

// ~/.markup/config.json. Keys: updateCheck (false turns the daily check off), updateSource
// ("github:<owner>/<repo>" or a local folder laid out like a release source, see lib/source.mjs),
// telemetry (false turns usage statistics off, lib/telemetry.mjs).
// A file, never an environment variable: the server reads no environment (R8).
export function readConfig() {
  return { updateCheck: true, updateSource: `github:${DEFAULT_REPO}`, ...readJson(userPath('config.json'), {}) };
}

// First run: the user's own copies of the files the agent reads at every invocation. Taken from
// docs/ of an install older than 1.0.0 (where the agent used to edit them in place, so they may
// carry the user's changes), otherwise from the skill's defaults/.
const USER_FILES = ['preferences.md', 'learnings.md'];
export function ensureUserLayer(skillDir) {
  const created = [];
  for (const f of USER_FILES) {
    const dst = userPath(f);
    if (fs.existsSync(dst)) continue;
    const legacy = path.join(skillDir, 'docs', f);
    const src = fs.existsSync(legacy) ? legacy : path.join(skillDir, 'defaults', f);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(USER_DIR, { recursive: true });
    fs.copyFileSync(src, dst);
    created.push(dst);
  }
  return created;
}
