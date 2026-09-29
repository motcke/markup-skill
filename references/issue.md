# Mode: issue

Read from `SKILL.md` for `/markup issue` and for threads marked `kind=issue` in `comments`. `SKILL`, `PROJECT` and `SESSION` mean what they mean there.

A report about markup itself goes to the skill's GitHub repository as an issue. The repository is public, so the user approves the exact text before anything is filed.

Reports arrive three ways: `/markup issue <text>` in the chat (from the home page it reads `/markup issue <type>: <title>` with the description below), or a thread marked `kind=issue` in `comments`. The page creates those from its help menu (the "?" in the top bar) and from the bottom of the table of contents; a report is about markup in general, never tied to a place on the page.

1. Understand the report. In a thread, the element and the quote show where the user saw the problem, and `attachment:` lines are usually screenshots: Read them. Ask back only when the report makes no sense without an answer.
2. Write the draft to a scratchpad file. `# <title>` goes on the first line, the body below it, in English (the repository's language). A bug gets what happened, steps to reproduce and what was expected. A request gets the need and the behaviour the user asks for. Add what you know and the user may not: the component or command involved, an error from `PROJECT/.markup/.server.log`, a `check` message.
   Nothing from the project goes in unless the user wrote it in the report: no code, file paths, page text, project or company names. Name the element by its kind ("a table with `data-heat`"), not by its text. `gh` cannot upload files, so a screenshot stays local. Say in the body that one exists, so the user can drag it into the issue on GitHub.
3. `node "SKILL/server.mjs" issue "PROJECT" --file <draft.md> [--type bug|feature|question|other] [--plan <dir> --thread <id>] --dry-run` prints the final title, body and labels. The command appends an environment table (markup version, Node, OS, and the browser recorded on the thread). The type defaults to the one the user picked on the page.
4. Show that output and ask for approval. In a thread: reply with the title and the body in a fenced block, and end with one line, in the page's language, asking the user to answer "approve" or say what to change. In the chat: show it and ask. An edit request means a new draft and a new approval. Never file without an explicit yes.
5. After the yes, run the same command without `--dry-run`. It files the issue with the user's own `gh` login, and with `--plan`/`--thread` it records the link on the thread (the card header shows `#<number>`). Reply with the issue URL in the thread or the chat.
   `ok: false` means `gh` is missing, not logged in, or refused. The output's `url` opens GitHub's new-issue form with every field filled in: give it to the user to submit.
