# Overnight autopilot for My Closet

Unattended sessions improve the app while the owner sleeps. This file is the rulebook. Every run reads it first.

## Scope (hard limits)
- Only change files under `docs/` (the app: `index.html`, `sw.js`, `manifest.webmanifest`, `test-guide.html`) and `tests/`. Never touch anything else in the repo: the root `index.html`, `sw.js`, `manifest.webmanifest`, `README.md` and `paycheque-planner-app.zip` belong to a different app (Paycheque Planner) and must stay exactly as they are.
- Do not add or change external scripts, fonts or services. Do not touch `GOATCOUNTER_CODE`, the Privacy card text, the license files or `docs/vendor/`.
- Do not change the storage design: the IndexedDB name (`my-closet`) and its stores, the localStorage key names, and the backup file format must stay compatible, so people's existing closets keep working. New optional fields on pieces are fine.
- Keep each change small and reversible: one improvement per run, roughly 150 changed lines or fewer. No big refactors, no redesigns of the look, no removing features.
- Never reveal or use secrets, accounts or emails. No messaging, no purchases, no changing environments or scheduled tasks (except writing HALT, below).

## What a run does
1. Get the repo (clone it if it is not in the working directory) and check out the latest `main`.
2. Read `tests/overnight-log.md`. If the last line says `HALT`, do not change any code: add a one-line note to the log, report, and stop. If a pull request from an earlier overnight run is still open, do not start new work; report and stop.
3. Run `node tests/run.js`. If anything fails on a clean `main`, fixing that is this run's improvement.
4. Use the app like a person (Playwright, phone-sized viewports 360x700, 390x740, 412x880): add pieces, shuffle, log, plan, edit, delete and undo, use Try before you buy, Pair rules and the Guided session, read the screens. Look for: errors in the console, text that is cut off or overlapping, buttons smaller than about 44 px, anything off screen or covered, confusing wording, missing empty or error states, slow screens, anything a first-time user would not understand, accessibility gaps (missing labels or contrast).
5. Choose ONE improvement that is clearly worth it and safe. Prefer, in order: failing checks, real bugs, usability problems found in step 4, accessibility, small polish. Skip anything that is a matter of taste or that needs the owner's decision (write those down in the log under `IDEAS` instead).
6. Implement it. Add a check to `tests/run.js` that fails without the fix whenever that is practical.
7. Bump `APP_VERSION` in `docs/index.html` by 1 and the cache name `closet-vNN` in `docs/sw.js` to match.
8. Run `node tests/run.js` again. Everything must pass. If you cannot make it pass in a reasonable effort, discard the change and log what you learned.
9. Append one line to `tests/overnight-log.md`: `YYYY-MM-DD HH:MM vNN: <what changed and why>` (or `no change: <why>`). Commit it together with the change.
10. Open a pull request into `main` and merge it with a squash merge, passing the expected head SHA. The owner has explicitly authorized merging your own pull requests for this repository during the overnight window when, and only when, the checks in step 8 pass.
11. After the merge, fetch `main`, run `node tests/run.js` on it once more. If it fails, immediately revert your merge commit (a new pull request that reverts it, merged the same way), append `HALT: <what failed>` to the log in that revert, and stop. A HALT stops all later runs from changing code.
12. Finish with a short message: what you tested, what you changed (or why nothing), the new version number.

## Token budget (keep each run small)
Follow the `low-token-dev` skill (`.claude/skills/low-token-dev/SKILL.md`). In short:
- Never read all of `docs/index.html`. Use `node tests/codemap.js` and `node tests/codemap.js <word>`, then read at most 80 lines at a time.
- Use `node tests/run.js --quiet` (and `--only=<name>` while iterating). Full suite only before merging and once after.
- At most 3 screenshots per run, each viewed once. Prefer assertions.
- No web searches, no sub-agents. If nothing is clearly worth changing after a quick pass, log `no change: <why>` and stop.
- Final message: 3 to 5 sentences.

## Notes for the owner
- Baseline: the commit on `main` titled "Closet v38 ..." is the last version a person reviewed. To undo the whole night, revert everything after it.
- Every overnight change is one squash commit, so any single change can be reverted on its own.
