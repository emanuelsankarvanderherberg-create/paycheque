---
name: low-token-dev
description: Keep token and context use small when working on the My Closet web app (docs/index.html), especially in unattended overnight runs. Use at the start of any session that edits or tests docs/index.html, or when context is running low.
---

# Low-token development for My Closet

`docs/index.html` is about 3,500 lines (hundreds of KB). Reading it whole wastes most of a session. Follow these rules.

## Find code without reading the file
- `node tests/codemap.js` prints the section index and every function with its line number (about 60 lines).
- `node tests/codemap.js <word>` prints up to 25 lines that mention `<word>`.
- Then Read only what you need: `offset` and `limit` of 80 lines or fewer around the line you found. Never Read the whole file.
- Edit with small exact replacements (the Edit tool or `edits`), not by rewriting the file.

## Test without flooding the context
- `node tests/run.js --quiet` prints only failures and the total. Use `--only=<part of a check name>` to run one check while iterating, and the full suite once before merging and once after.
- Prefer measurable assertions (positions, counts, text) over looking at screenshots. If you must look, take at most 3 screenshots in a run, at device scale factor 1, clipped to the area in question, and view each once.
- Pipe long output through `tail -20` or `grep`. Do not print whole HTML, JSON or logs.

## Keep the session lean
- No web searches, no sub-agents, no exploring unrelated files. Everything needed is in `docs/`, `tests/` and `tests/OVERNIGHT.md`.
- Decide early. If after a quick pass (a few checks and one pass over the screens) nothing is clearly worth changing, log "no change: <why>" and stop. A run that does nothing is cheaper and safer than a marginal change.
- One improvement per run, about 150 changed lines or fewer. Do not rewrite or reformat code you are not changing.
- Write the final message in 3 to 5 sentences.
- If the context is getting full, finish the current step (tests, commit, merge or revert), write the log line, and stop. Do not start a second improvement.
