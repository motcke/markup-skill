// `release <x.y.z>` (V2, 28/09), for the author's checkout only: writes manifest.json from the files
// git tracks (staged new files included) and adds the release notes to CHANGELOG.md. It changes no
// git state; it prints the commit, tag and GitHub release commands to run by hand.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildManifest, readManifest, compareVersions, isDevCheckout, realDir, MANIFEST } from './manifest.mjs';
import { DEFAULT_REPO } from './user.mjs';

const OWN = new Set([MANIFEST, 'CHANGELOG.md']);
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
const today = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

export function release(skillDir, version, { notesFile, force = false } = {}) {
  const root = realDir(skillDir);
  if (!isDevCheckout(root)) throw new Error('release runs in the git checkout of the skill, not in an install');
  if (!/^\d+\.\d+\.\d+$/.test(String(version || ''))) throw new Error('usage: release <x.y.z>');
  const prev = readManifest(root);
  if (prev?.version && compareVersions(version, prev.version) <= 0 && !force) throw new Error(`${version} is not newer than ${prev.version}`);
  // The manifest hashes the working tree, and the tag will hold the committed files: an unstaged
  // change would ship a hash that matches nothing in the release.
  const dirty = git(root, ['diff', '--name-only']).split('\n').map((s) => s.trim()).filter((f) => f && !OWN.has(f));
  if (dirty.length && !force) throw new Error(`unstaged changes (stage or revert them first):\n- ${dirty.join('\n- ')}`);

  const notes = notesFile ? fs.readFileSync(notesFile, 'utf8').trim() : '';
  const clog = path.join(root, 'CHANGELOG.md');
  const head = '# Changelog\n';
  let text = fs.existsSync(clog) ? fs.readFileSync(clog, 'utf8').replace(/\r\n/g, '\n') : `${head}\n`;
  if (!text.startsWith(head)) text = `${head}\n${text}`;
  if (!new RegExp(`^## ${version.replace(/\./g, '\\.')}\\b`, 'm').test(text)) {
    const entry = `## ${version} (${today()})\n\n${notes || '- '}\n`;
    const at = text.indexOf('\n## ');
    text = at < 0 ? `${text.trimEnd()}\n\n${entry}` : `${text.slice(0, at + 1)}${entry}\n${text.slice(at + 1)}`;
    fs.writeFileSync(clog, text);
  }

  const tracked = git(root, ['ls-files']).split('\n').map((s) => s.trim()).filter(Boolean);
  const files = [...new Set([...tracked, 'CHANGELOG.md'])].filter((f) => f !== MANIFEST && fs.existsSync(path.join(root, f)));
  const manifest = buildManifest(root, files, version, prev?.repo || DEFAULT_REPO);
  fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  const tag = `v${version}`;
  return {
    ok: true, version, files: files.length, manifest: path.join(root, MANIFEST), changelog: clog,
    next: [
      `git -C "${root}" add ${MANIFEST} CHANGELOG.md`,
      `git -C "${root}" commit -m "release: ${tag}"`,
      `git -C "${root}" tag -a ${tag} -m "${tag}"`,
      `git -C "${root}" push && git -C "${root}" push origin ${tag}`,
      `gh release create ${tag} --repo ${manifest.repo} --title ${tag} --notes-file <notes>   (the page balloon shows these notes)`,
    ],
  };
}
