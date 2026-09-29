# Changelog

## 1.0.0 (2026-09-29)

First public release.

### New
- `/markup` turns the conversation into a local page of tables, mermaid diagrams and Chart.js charts, served on a stable port per project. No npm dependencies and no CDN, so it works offline.
- Comment on anything: select words and press "Comment", right-click an element, or press `C`. Cards float next to the text they belong to. Paste a screenshot or attach a file.
- "Wake the agent" sends the round to the session that published the page. The agent replies in each card (with `code`, **bold**, links and bullets), edits the plan and publishes a new version. With no agent listening, the button copies `/markup comments <page>` for you to paste.
- Questions with options to pick. Several in a row become a guide with steps, and `1`-`9` and `Enter` work from the keyboard.
- Every republish is a version with a note, and changed sections carry an "updated" tag until you mark them seen.
- The page follows the language of the content. Hebrew, Arabic and Persian switch to right-to-left by themselves.
- Dark mode follows the system or a toggle, diagrams included. Printing gives A4 pages with page numbers, tables that do not split, and a landscape page for a wide diagram.
- Update chip: the page tells you when a newer release is out. An unchanged install upgrades in place; a changed one goes through your agent, which merges your edits and asks before writing. `upgrade <project> rollback` undoes an upgrade.
- Your own layer in `~/.markup/`: preferences, lessons, styles, components, libraries, check rules and commands. Upgrades never touch it (docs/extensions.md).
- `/markup issue <text>`, or "?" in the top bar, reports a bug or an idea as a GitHub issue. The agent shows you the draft and files it with your `gh`; without `gh` you get a prefilled link.
