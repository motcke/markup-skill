// manifest.json (V1, 28/09): the skill's version and a sha256 per shipped file. Comparing the files
// on disk with the manifest of the installed version tells whether the user changed anything —
// no git needed, since `npx skills add` installs a plain copy.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MANIFEST = 'manifest.json';

// Text hashes with LF line endings: a checkout on Windows with core.autocrlf turns every LF into
// CRLF, and the same file must hash the same on every machine. A NUL byte in the first 8000 bytes
// means binary, hashed as is.
export function hashBuffer(buf) {
  const text = !buf.subarray(0, 8000).includes(0);
  const b = text ? Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1') : buf;
  return crypto.createHash('sha256').update(b).digest('hex');
}

// The server hashes the install on every /api/update; vendor/ alone is ~4MB, so a file keeps its
// hash until its size or mtime moves.
const hashCache = new Map(); // abs path -> { size, mtimeMs, hash }
export function hashFile(file) {
  const st = fs.statSync(file);
  const c = hashCache.get(file);
  if (c && c.size === st.size && c.mtimeMs === st.mtimeMs) return c.hash;
  const hash = hashBuffer(fs.readFileSync(file));
  hashCache.set(file, { size: st.size, mtimeMs: st.mtimeMs, hash });
  return hash;
}

export const realDir = (dir) => { try { return fs.realpathSync(dir); } catch { return path.resolve(dir); } };

export function readManifest(dir) {
  try { return JSON.parse(fs.readFileSync(path.join(dir, MANIFEST), 'utf8')); } catch { return null; }
}

// The author's install is a junction into a git checkout: upgrades there are `git pull`, never a
// file swap under git's feet.
export const isDevCheckout = (dir) => fs.existsSync(path.join(realDir(dir), '.git'));

// Files on disk, relative with forward slashes. Dot folders (.git, .markup) and node_modules are
// not part of an install.
export function walk(dir) {
  const out = [];
  const rec = (rel) => {
    let entries;
    try { entries = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules') continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) rec(r);
      else if (e.isFile() && r !== MANIFEST) out.push(r);
    }
  };
  rec('');
  return out.sort();
}

// modified: shipped and changed on disk (the only thing that makes an install "modified");
// missing: shipped, not on disk (an installer that skipped it, or a user delete — the upgrade
// writes it again); added: on disk, never shipped (the user's own files — kept as they are).
export function diffInstall(dir, manifest) {
  const root = realDir(dir);
  const files = manifest?.files || {};
  const modified = [];
  const missing = [];
  for (const [rel, hash] of Object.entries(files)) {
    const f = path.join(root, rel);
    if (!fs.existsSync(f)) missing.push(rel);
    else if (hashFile(f) !== hash) modified.push(rel);
  }
  const added = walk(root).filter((rel) => !(rel in files));
  return { modified, missing, added };
}

export function buildManifest(dir, files, version, repo) {
  const root = realDir(dir);
  const out = {};
  for (const rel of [...files].sort()) out[rel] = hashFile(path.join(root, rel));
  return { name: 'markup', version, repo, files: out };
}

// SemVer core only (x.y.z); a pre-release suffix sorts below its release.
export function compareVersions(a, b) {
  const parse = (v) => { const m = /^v?(\d+)\.(\d+)\.(\d+)(-.+)?$/.exec(String(v || '').trim()); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? 0 : 1] : null; };
  const x = parse(a), y = parse(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 4; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}
