# Customizing markup without touching the skill

An upgrade replaces the skill folder. Your changes survive it when they live in `~/.markup/`, which the skill reads but an upgrade never writes. The agent follows the same rule: it adds to `~/.markup/`, not to the skill folder.

```
~/.markup/
  config.json          settings (below)
  preferences.md       your taste on a page; created from defaults/ on first run
  learnings.md         recent feedback, folded into rules.md over time
  rules.md             your own rules for writing pages (optional)
  prefs.json           page UI preferences, written by the page itself
  ext/
    *.css              loaded after plan.css, on every page and the home page
    vendor/*.js        extra libraries, loaded before plan.js
    *.js               page components, loaded after plan.js
    components.md      snippets the agent reads next to references/components.md
    checks/*.mjs       extra rules for `check` and `publish`
    commands/*.mjs     extra CLI commands
  update.json          last update check (written by the server)
  upgrades/            upgrade workspaces
  backups/             files an upgrade replaced; `upgrade <root> rollback` restores the newest
```

New files are picked up on the next page load or CLI call; nothing restarts.

## config.json

| Key | Default | Meaning |
| --- | --- | --- |
| `updateCheck` | `true` | `false` turns off the daily update check and the balloon |
| `updateSource` | `"github:motcke/markup-skill"` | `github:<owner>/<repo>` for a fork, or a local folder laid out as a release source (`latest.json` plus one folder per tag), for tests and offline machines |
| `telemetry` | `true` | `false` turns off the usage statistics the server sends |

## Page components (`ext/*.js`)

```js
// ~/.markup/ext/stamp.js — adds a small date stamp to every <time data-stamp> in the content
markup.register({
  name: 'stamp',
  selector: 'time[data-stamp]',
  init(el, { lang, dark }) {
    el.textContent = new Date(el.dateTime).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB');
  },
});
```

`markup.register` runs `init` once for each matching element in the page content and returns how many it found. `markup` also carries `lang`, `plan`, `dark` and `readonly`. That is the whole API; the internals of `plan.js` are not part of it and may change in any release.

A library goes in `ext/vendor/` as a self-contained UMD/IIFE build (no CDN: the page must work offline), with its initialization in an `ext/*.js` file and a snippet in `ext/components.md` so the agent knows how to write it.

## Check rules (`ext/checks/*.mjs`)

```js
// ~/.markup/ext/checks/no-todo.mjs
export default {
  id: 'no-todo',
  run(html, prevHtml) {
    return /\bTODO\b/.test(html) ? [{ level: 'warning', message: 'TODO left in the page' }] : [];
  },
};
```

`level` is `error` (blocks `publish` unless `--force`), `warning` or `hint`. Findings print with the check's id in brackets. A check that throws becomes a warning and never breaks a publish.

## Commands (`ext/commands/*.mjs`)

```js
// ~/.markup/ext/commands/plans-count.mjs  ->  node server.mjs plans-count <root>
import fs from 'node:fs';
export default {
  name: 'plans-count',
  run({ root }) { console.log(fs.readdirSync(`${root}/.markup`).filter((d) => !d.startsWith('.')).length); },
};
```

`run` receives `{ pos, opts, root, skillDir }`. A built-in command with the same name wins.

## When an extension is not enough

Some changes can only be made in the skill itself: the comments panel, the server API, the check engine. Open an issue or a pull request on the skill's repository instead of editing the installed copy. If you do edit it anyway, the upgrade balloon routes the next upgrade through the agent: it merges your edits with the new release and asks before writing, and it offers to move whatever fits into `~/.markup/ext/`.
