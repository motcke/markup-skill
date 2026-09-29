# Releasing a new version of markup

Written for the agent that cuts the release. Every step that writes to git or GitHub publishes code to every user of the skill, so run those steps only when the maintainer asked for this release in so many words, and stop to ask when a step fails.

## How releases reach users

| Piece | What it does |
| --- | --- |
| `manifest.json` | The version and a sha256 of every shipped file. Installs compare their files with it to tell "clean" from "modified", and `upgrade` verifies every downloaded file against it |
| Git tag `vX.Y.Z` | `upgrade` downloads the new files from the new tag, and the user's original files (the merge base) from the tag of the version they run. A tag is permanent once pushed |
| GitHub release | The update check reads `releases/latest` once a day; the release body is the "What's new" text in the page balloon. Drafts and pre-releases are not "latest" |
| `CHANGELOG.md` | The same notes, kept in the repo |

The check calls the GitHub API without a token, which works because the repository is public. A new release reaches users at their next daily check.

## Choosing the version (SemVer)

| Bump | When |
| --- | --- |
| patch `x.y.Z` | Fixes only. No CLI command, flag, file layout or extension API changes |
| minor `x.Y.0` | New features that old pages, old extensions and old agent habits keep working with: new commands, new components, new extension points |
| major `X.0.0` | Anything that breaks them: a removed or renamed command or flag, a changed `markup.register` / checks / commands signature, files moved inside `~/.markup/`, a content rule that makes old pages fail `check` |

## Steps

1. **Confirm the setting.** You are in the git checkout: `node server.mjs version .` prints `kind: dev`. The branch is `master`, and `git status` shows only what belongs in the release.
2. **Collect what changed.** `git log v<previous>..HEAD --oneline` (the first release has no previous tag: take the whole history). Read the diffs of anything that touches behaviour; do not write notes from commit titles alone.
3. **Write the notes** to a scratch file, in English, for users rather than developers. Sections, only those that apply: `New`, `Changed`, `Fixed`, `Upgrade notes` (anything a user with local changes should know, and every breaking change for a major). Short bullets: the balloon shows them in a small box.
4. **Pick the version** by the table above, from what the notes say.
5. **Check before you tag.**
   - `node --check server.mjs && for f in lib/*.mjs assets/plan.js; do node --check "$f"; done`
   - Publish a sample page and look at it. With a CDP browser on 9222: `node server.mjs check <root> <slug> --browser`.
   - If `lib/upgrade.mjs`, `lib/manifest.mjs` or `lib/source.mjs` changed, test an upgrade from the previous release against a local source: a folder with `latest.json` (`{"version":"X.Y.Z","tag":"vX.Y.Z","notes":"..."}`) and one subfolder per tag holding that release's files and `manifest.json`, named in `updateSource` of `~/.markup/config.json` of a test home (set `HOME` and `USERPROFILE` for the test process so the real `~/.markup` stays untouched). Cover a clean install, a changed file the release did not touch, and a file both sides changed.
6. **Stage the release content.** `git add` every file that ships. `release` hashes the working tree and refuses unstaged changes, because the tag must hold exactly the files the manifest describes. Untracked files do not ship.
7. **Write manifest and changelog.** `node server.mjs release X.Y.Z --notes-file <notes>`. It writes `manifest.json` and a `CHANGELOG.md` entry, changes no git state, and prints the commands below. Read the changelog entry.
8. **Commit and tag.** Nothing may change between step 7 and the commit.
   ```bash
   git add manifest.json CHANGELOG.md
   git commit -m "release: vX.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push && git push origin vX.Y.Z
   ```
9. **Publish the GitHub release**, marked as latest (the default):
   ```bash
   gh release create vX.Y.Z --repo motcke/markup-skill --title vX.Y.Z --notes-file <notes>
   ```
10. **Verify.**
    - `gh api repos/motcke/markup-skill/releases/latest --jq .tag_name` prints `vX.Y.Z`.
    - `curl -s https://raw.githubusercontent.com/motcke/markup-skill/vX.Y.Z/manifest.json` shows the new version.
    - On an install of the previous version: `node server.mjs update <root> --force` reports `available: true`, and the page shows the balloon.

## Rules

- Never move, delete or re-push a published tag, and never delete a published release. Users on that version download their merge base from it. A mistake is fixed by the next patch version.
- One release, one commit: the tagged commit is the one `release` prepared.
- A file that should not reach users (build output, private notes) stays out of git; everything git tracks is in the manifest.
