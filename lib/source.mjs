// Where releases come from (V13, 28/09). Two sources with one shape, so the update and upgrade code
// never knows which one it talks to:
//   latest()          -> { version, tag, notes, url }
//   file(tag, rel)    -> Buffer of that file at that release
// github:<owner>/<repo> reads the Releases API (60 unauthenticated requests an hour; the check runs
// once a day) and raw files at the tag. A local folder with latest.json and <tag>/<files> stands in
// for it in tests and on machines without network.
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_REPO } from './user.mjs';

const TIMEOUT_MS = 15000;

function githubSource(repo) {
  const headers = { 'User-Agent': 'markup-skill', Accept: 'application/vnd.github+json' };
  return {
    kind: 'github',
    async latest() {
      const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!r.ok) throw new Error(`GitHub releases: HTTP ${r.status}`);
      const j = await r.json();
      return { version: String(j.tag_name || '').replace(/^v/, ''), tag: j.tag_name, notes: j.body || '', url: j.html_url || `https://github.com/${repo}/releases` };
    },
    async file(tag, rel) {
      const url = `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(tag)}/${rel.split('/').map(encodeURIComponent).join('/')}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'markup-skill' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!r.ok) throw new Error(`${rel} at ${tag}: HTTP ${r.status}`);
      return Buffer.from(await r.arrayBuffer());
    },
  };
}

function dirSource(dir) {
  return {
    kind: 'dir',
    async latest() {
      const j = JSON.parse(fs.readFileSync(path.join(dir, 'latest.json'), 'utf8'));
      return { version: String(j.version || j.tag || '').replace(/^v/, ''), tag: j.tag || `v${j.version}`, notes: j.notes || '', url: j.url || null };
    },
    async file(tag, rel) {
      const f = path.resolve(dir, tag, rel);
      if (!f.startsWith(path.resolve(dir, tag) + path.sep)) throw new Error(`bad path ${rel}`);
      return fs.readFileSync(f);
    },
  };
}

export function sourceFor(spec) {
  const s = String(spec || `github:${DEFAULT_REPO}`);
  return s.startsWith('github:') ? githubSource(s.slice(7)) : dirSource(path.resolve(s));
}
