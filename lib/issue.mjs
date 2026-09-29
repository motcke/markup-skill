// Reports about markup itself (a bug, a request, a question) go to the skill's GitHub repository as
// issues. The agent writes the draft; this module adds the environment, files it with the user's
// own `gh`, and falls back to a prefilled "new issue" link when `gh` is missing or refuses.
// Nothing here reads the project: what reaches the public issue is the draft the user approved and
// the technical environment below.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DEFAULT_REPO } from './user.mjs';
import { readManifest, isDevCheckout } from './manifest.mjs';

export const ISSUE_REPO = DEFAULT_REPO;
// type -> the repository label (GitHub's default labels) and the word shown in the body
export const ISSUE_TYPES = {
  bug: { label: 'bug', name: 'Bug' },
  feature: { label: 'enhancement', name: 'Feature request' },
  question: { label: 'question', name: 'Question' },
  other: { label: null, name: 'Other' },
};
export const issueType = (t) => (ISSUE_TYPES[t] ? t : 'other');

export function environment(skillDir, { ua } = {}) {
  const m = readManifest(skillDir);
  const env = [
    ['markup', `${m?.version || 'unknown'}${isDevCheckout(skillDir) ? ' (git checkout)' : ''}`],
    ['Node', process.version],
    ['OS', `${os.platform()} ${os.release()} ${os.arch()}`],
  ];
  if (ua) env.push(['Browser', String(ua).slice(0, 300)]);
  return env;
}

// The draft file: "# title" on the first line, the body below it (the same shape as a reply file,
// so non-ASCII text never travels as a command-line argument).
export function readDraft(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').trim();
  const m = /^#[ \t]+(.+)/.exec(text);
  return m ? { title: m[1].trim(), body: text.slice(m[0].length).trim() } : { title: '', body: text };
}

export function composeIssue({ title, body, type, env }) {
  const t = ISSUE_TYPES[issueType(type)];
  const rows = env.map(([k, v]) => `| ${k} | ${String(v).replace(/\|/g, '\\|')} |`).join('\n');
  return {
    title: title.slice(0, 200),
    body: `${body}\n\n---\n**Type:** ${t.name}\n\n| Environment | |\n| --- | --- |\n${rows}\n`,
    labels: t.label ? [t.label] : [],
  };
}

// GitHub's new-issue form with the fields filled in. The browser caps URLs, so a long body is cut
// (the user can paste the rest); labels apply only for users with triage rights, which is why the
// type is in the body too.
export function newIssueUrl(repo, { title, body, labels }) {
  const MAX = 7000;
  const cut = body.lastIndexOf('\n\n---\n**Type:**'); // the report is cut, the type and environment stay
  const tail = cut >= 0 ? body.slice(cut) : '';
  let b = cut >= 0 ? body.slice(0, cut) : body;
  const url = () => `https://github.com/${repo}/issues/new?${new URLSearchParams({ title, body: b + tail, ...(labels.length ? { labels: labels.join(',') } : {}) })}`;
  while (url().length > MAX && b.length > 200) b = `${b.slice(0, Math.floor(b.length * 0.8))}\n\n…`;
  return url();
}

const gh = (args) => spawnSync('gh', args, { encoding: 'utf8', windowsHide: true, timeout: 60_000 });

// Files the issue as the user, with their `gh` login. A label the user may not set (no triage
// rights on the repository) fails the whole call, so the second try goes without labels.
export function fileIssue(repo, issue) {
  const probe = gh(['--version']);
  if (probe.error || probe.status !== 0) return { ok: false, reason: 'gh is not installed' };
  const tmp = path.join(os.tmpdir(), `markup-issue-${process.pid}-${Date.now()}.md`);
  fs.writeFileSync(tmp, issue.body);
  try {
    const base = ['issue', 'create', '--repo', repo, '--title', issue.title, '--body-file', tmp];
    let r = gh([...base, ...issue.labels.flatMap((l) => ['--label', l])]);
    let labelsDropped = false;
    if (r.status !== 0 && issue.labels.length) { r = gh(base); labelsDropped = r.status === 0; }
    if (r.status !== 0) return { ok: false, reason: (r.stderr || r.stdout || 'gh failed').trim().split('\n').slice(-3).join(' ') };
    const url = (r.stdout.match(/https:\/\/github\.com\/\S+\/issues\/\d+/) || [])[0] || r.stdout.trim();
    return { ok: true, url, number: Number((url.match(/\/issues\/(\d+)/) || [])[1]) || null, labelsDropped };
  } finally { fs.rmSync(tmp, { force: true }); }
}
