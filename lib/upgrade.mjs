// Upgrading the installed skill (V7, V8, 28/09).
//
//   prepare  — compares the install with its manifest and with the new release, classifies every
//              file, and builds a workspace under ~/.markup/upgrades/<from>-to-<to>/:
//              theirs/ (new files), ours/ (the user's changed files), base/ (those files as the user
//              received them), merged/ (git merge-file of the three, when git is installed), plan.json.
//              Writes nothing into the skill folder.
//   apply    — backs up every file it will touch to ~/.markup/backups/, then writes the workspace
//              into the skill folder. Refuses while a merge has conflict markers or a question is
//              undecided.
//   rollback — restores the newest backup of this install.
//
// A clean install (no changed shipped files) goes prepare → apply in one step, by the server, from
// the page's upgrade button. Anything the user changed goes through the agent ("Mode: upgrade" in
// SKILL.md), which reviews the workspace, finishes the merges and asks before apply.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { readJson, writeJson, userPath, readConfig } from './user.mjs';
import { readManifest, diffInstall, hashBuffer, hashFile, realDir, isDevCheckout, compareVersions, MANIFEST } from './manifest.mjs';
import { sourceFor } from './source.mjs';

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
const safeRel = (rel) => typeof rel === 'string' && rel && !path.isAbsolute(rel) && !rel.split(/[\\/]/).includes('..');
const isText = (buf) => !buf.subarray(0, 8000).includes(0);
// Workspace copies are LF: a CRLF checkout against an LF release would otherwise differ on every line
const lf = (buf) => (isText(buf) ? Buffer.from(buf.toString('latin1').replace(/\r\n/g, '\n'), 'latin1') : buf);

function writeFileAtomic(file, buf) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, file);
}

async function fetchVerified(source, tag, rel, hash) {
  const buf = await source.file(tag, rel);
  if (hash && hashBuffer(buf) !== hash) throw new Error(`${rel} at ${tag}: hash does not match the release manifest`);
  return buf;
}

// One row per file that needs something. user: modified | missing | added | same · upstream:
// changed | added | removed | same | none · action:
//   take   — write the new file (the user did not touch it, or it is missing)
//   keep   — leave the user's file (the release did not change it, or it is the user's own file)
//   merge  — both sides changed it: three-way merge
//   delete — the release removed a file the user did not touch
//   ask    — the release removed a file the user changed: the user decides (keep | delete)
export function classify(cur, next, diff) {
  const entries = [];
  const curFiles = cur.files || {};
  const nextFiles = next.files || {};
  for (const rel of [...new Set([...Object.keys(curFiles), ...Object.keys(nextFiles)])].sort()) {
    const inCur = rel in curFiles, inNext = rel in nextFiles;
    const user = diff.modified.includes(rel) ? 'modified' : diff.missing.includes(rel) ? 'missing' : diff.added.includes(rel) ? 'added' : 'same';
    const upstream = !inCur ? 'added' : !inNext ? 'removed' : curFiles[rel] !== nextFiles[rel] ? 'changed' : 'same';
    let action = 'none';
    if (upstream === 'added') action = user === 'added' ? 'merge' : 'take'; // the user already had a file of that name
    else if (upstream === 'removed') action = user === 'modified' ? 'ask' : user === 'missing' ? 'none' : 'delete';
    else if (upstream === 'changed') action = user === 'modified' ? 'merge' : 'take';
    else action = user === 'modified' ? 'keep' : user === 'missing' ? 'take' : 'none';
    if (action !== 'none') entries.push({ path: rel, user, upstream, action });
  }
  for (const rel of diff.added) if (!(rel in nextFiles)) entries.push({ path: rel, user: 'added', upstream: 'none', action: 'keep' });
  return entries;
}

// git merge-file exits with the number of conflicts (0 = clean), negative on error. No git on the
// machine: the agent merges by reading the three files.
function mergeFile(ws, rel) {
  const base = path.join(ws, 'base', rel);
  if (!fs.existsSync(base)) writeFileAtomic(base, Buffer.alloc(0));
  const r = spawnSync('git', ['merge-file', '-p', '-L', 'ours (your version)', '-L', 'base (as released to you)', '-L', 'theirs (new release)',
    path.join(ws, 'ours', rel), base, path.join(ws, 'theirs', rel)], { maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (r.error || r.status === null || r.status < 0 || r.status > 127) return null;
  writeFileAtomic(path.join(ws, 'merged', rel), r.stdout);
  return r.status === 0 ? 'clean' : 'conflicts';
}

export function summarize(plan) {
  const by = (a) => plan.entries.filter((e) => e.action === a).map((e) => e.path);
  const userChanged = plan.entries.filter((e) => e.user === 'modified').map((e) => e.path);
  return {
    from: plan.from, to: plan.to,
    take: by('take').length, delete: by('delete').length,
    keep: by('keep'), merge: plan.entries.filter((e) => e.action === 'merge').map((e) => ({ path: e.path, merged: e.merged ?? null })), ask: by('ask'),
    userChanged,
    // Anything the user changed goes past the agent, even when the release left that file alone:
    // the user asked for someone to look at what they added before an upgrade.
    needsAgent: userChanged.length > 0 || by('merge').length > 0 || by('ask').length > 0,
  };
}

export async function prepare(skillDir) {
  const root = realDir(skillDir);
  if (isDevCheckout(root)) throw new Error(`${root} is a git checkout: upgrade it with git pull`);
  const cur = readManifest(root);
  if (!cur) throw new Error('no manifest.json: this install predates versioning — reinstall with `npx skills add motcke/markup-skill`');
  const source = sourceFor(readConfig().updateSource);
  const latest = await source.latest();
  if (compareVersions(latest.version, cur.version) <= 0) return { upToDate: true, current: cur.version, latest: latest.version };
  const next = JSON.parse((await source.file(latest.tag, MANIFEST)).toString('utf8'));
  const entries = classify(cur, next, diffInstall(root, cur));
  const ws = userPath('upgrades', `${cur.version}-to-${next.version}`);
  fs.rmSync(ws, { recursive: true, force: true });
  for (const e of entries) {
    if (!safeRel(e.path)) throw new Error(`unsafe path in manifest: ${e.path}`);
    // theirs/ for keep too: when the agent moves a user's change into an extension, it turns that
    // entry into "take" and the skill file goes back to the release version
    if ((e.action === 'take' || e.action === 'merge' || e.action === 'keep') && e.path in next.files) writeFileAtomic(path.join(ws, 'theirs', e.path), lf(await fetchVerified(source, latest.tag, e.path, next.files[e.path])));
    if (['merge', 'keep', 'ask'].includes(e.action) && fs.existsSync(path.join(root, e.path))) writeFileAtomic(path.join(ws, 'ours', e.path), lf(fs.readFileSync(path.join(root, e.path))));
    if ((e.action === 'merge' || e.action === 'ask') && e.path in (cur.files || {})) {
      try { writeFileAtomic(path.join(ws, 'base', e.path), lf(await fetchVerified(source, `v${cur.version}`, e.path, cur.files[e.path]))); }
      catch (err) { e.baseError = String(err?.message || err); }
    }
    if (e.action === 'merge') e.merged = mergeFile(ws, e.path);
  }
  writeFileAtomic(path.join(ws, 'theirs', MANIFEST), Buffer.from(JSON.stringify(next, null, 2)));
  const plan = { from: cur.version, to: next.version, tag: latest.tag, notes: latest.notes, url: latest.url, skillDir: root, createdAt: new Date().toISOString(), entries };
  writeJson(path.join(ws, 'plan.json'), plan);
  return { workspace: ws, ...summarize(plan) };
}

export function apply(skillDir, wsDir) {
  const root = realDir(skillDir);
  const plan = readJson(path.join(wsDir, 'plan.json'), null);
  if (!plan) throw new Error(`no plan.json in ${wsDir}`);
  const cur = readManifest(root);
  if (cur?.version !== plan.from) throw new Error(`the install is ${cur?.version || 'unversioned'} but the workspace was prepared for ${plan.from}: run upgrade prepare again`);
  const problems = [];
  for (const e of plan.entries) {
    if (!safeRel(e.path)) problems.push(`${e.path}: unsafe path`);
    if (e.action === 'merge') {
      const m = path.join(wsDir, 'merged', e.path);
      if (!fs.existsSync(m)) problems.push(`${e.path}: write the merged file to merged/${e.path}`);
      else if (/^(<{7}|>{7}|\|{7})( |$)/m.test(fs.readFileSync(m, 'utf8'))) problems.push(`${e.path}: conflict markers left in merged/${e.path}`);
    }
    if (e.action === 'ask' && !['keep', 'delete'].includes(e.decision)) problems.push(`${e.path}: set "decision": "keep" or "delete" on its entry in plan.json`);
    // a file that was untouched at prepare time and changed since would be overwritten silently
    if (e.action === 'take' && !fs.existsSync(path.join(wsDir, 'theirs', e.path))) problems.push(`${e.path}: no theirs/ copy to take`);
    if (e.action === 'take' && e.user === 'same' && fs.existsSync(path.join(root, e.path)) && hashFile(path.join(root, e.path)) !== cur.files?.[e.path]) problems.push(`${e.path}: changed after prepare — run upgrade prepare again`);
  }
  if (problems.length) throw Object.assign(new Error(`not ready to apply:\n- ${problems.join('\n- ')}`), { problems });

  const touched = plan.entries.filter((e) => ['take', 'merge', 'delete'].includes(e.action) || (e.action === 'ask' && e.decision === 'delete'));
  const backup = userPath('backups', `${plan.from}-${stamp()}`);
  const created = [];
  for (const e of touched) {
    const f = path.join(root, e.path);
    if (fs.existsSync(f)) writeFileAtomic(path.join(backup, 'files', e.path), fs.readFileSync(f));
    else created.push(e.path);
  }
  if (fs.existsSync(path.join(root, MANIFEST))) writeFileAtomic(path.join(backup, MANIFEST), fs.readFileSync(path.join(root, MANIFEST)));
  writeJson(path.join(backup, 'backup.json'), { from: plan.from, to: plan.to, skillDir: root, at: new Date().toISOString(), created, restored: touched.filter((e) => !created.includes(e.path)).map((e) => e.path) });

  for (const e of touched) {
    const f = path.join(root, e.path);
    if (e.action === 'take') writeFileAtomic(f, fs.readFileSync(path.join(wsDir, 'theirs', e.path)));
    else if (e.action === 'merge') writeFileAtomic(f, fs.readFileSync(path.join(wsDir, 'merged', e.path)));
    else fs.rmSync(f, { force: true });
  }
  // the manifest last: an apply that died halfway still reads as the old version, and prepare runs again
  writeFileAtomic(path.join(root, MANIFEST), fs.readFileSync(path.join(wsDir, 'theirs', MANIFEST)));
  plan.appliedAt = new Date().toISOString();
  writeJson(path.join(wsDir, 'plan.json'), plan);
  return { ok: true, from: plan.from, to: plan.to, backup, written: touched.length, kept: plan.entries.filter((e) => e.action === 'keep' || (e.action === 'ask' && e.decision === 'keep')).map((e) => e.path) };
}

// The server's upgrade button: one step when nothing of the user's is in the way.
export async function upgradeIfClean(skillDir) {
  const r = await prepare(skillDir);
  if (r.upToDate || r.needsAgent) return r;
  return { ...apply(skillDir, r.workspace), workspace: r.workspace };
}

export function rollback(skillDir) {
  const root = realDir(skillDir);
  const dir = userPath('backups');
  let names = [];
  try { names = fs.readdirSync(dir).sort().reverse(); } catch { /* no backups */ }
  for (const n of names) {
    const b = path.join(dir, n);
    const info = readJson(path.join(b, 'backup.json'), null);
    if (!info || info.restoredAt || realDir(info.skillDir) !== root) continue;
    for (const rel of info.restored || []) {
      const src = path.join(b, 'files', rel);
      if (safeRel(rel) && fs.existsSync(src)) writeFileAtomic(path.join(root, rel), fs.readFileSync(src));
    }
    for (const rel of info.created || []) if (safeRel(rel)) fs.rmSync(path.join(root, rel), { force: true });
    if (fs.existsSync(path.join(b, MANIFEST))) writeFileAtomic(path.join(root, MANIFEST), fs.readFileSync(path.join(b, MANIFEST)));
    info.restoredAt = new Date().toISOString();
    writeJson(path.join(b, 'backup.json'), info);
    return { ok: true, restored: info.from, undid: info.to, backup: b };
  }
  throw new Error(`no backup of ${root} to restore`);
}
