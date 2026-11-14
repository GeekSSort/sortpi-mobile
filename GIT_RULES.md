# GIT_RULES.md

Git, branch, commit and pull request rules for GeekSSort. They apply to people and to AI coding agents.
Read this before any git or GitHub action. Reference it from `CLAUDE.md` or `AGENTS.md`:

> Follow `GIT_RULES.md` for all git and pull request work, and `TEAM_BOARD.md` for issues and the project board.

Why so strict: GitHub Free does not protect branches on our private repos. Nothing stops a wrong push, so these rules are the only guard.

## 0. Project config (fill in once per repo)

| Key | Value |
|---|---|
| LINEUP | `products` |
| BASE (where feature PRs go) | `dev` (this repo has only `dev` today; create `dev`/`staging` when the team adopts the full flow) |
| FLOW | products: `feature -> dev -> staging -> main` / services: `feature -> staging -> main` |
| SCOPES | _TODO: fill in a short fixed list for this repo_ |
| CHECKS | _TODO: command to run before every push_ |

If a value is missing, ask the user. Do not guess.

## 1. Never (hard rules)

- NEVER push to `dev`, `staging` or `main`. Change them only through a pull request.
- NEVER force-push a shared branch. On your own branch use `--force-with-lease`, and only after asking.
- NEVER skip hooks or checks (`--no-verify`, disabling CI, deleting a failing test).
- NEVER commit secrets, `.env` files, keys, database dumps or files over 5 MB. If a secret was committed, tell the user to rotate it. Deleting the commit is not enough.
- NEVER `git add -A` or `git add .` without reading `git status` first. Stage files by name.
- NEVER squash a promotion PR (`dev -> staging`, `staging -> main`). Use a merge commit.
- NEVER delete `dev`, `staging` or `main`, and never use `--delete-branch` on a promotion PR.
- NEVER edit a database migration that has already run anywhere. Add a new one.
- NEVER invent issue numbers, ticket IDs or client approvals.

## 2. Ask first (do not do these without a clear yes)

- Commit, push, open a PR, merge, tag or create a release. Do them only when the user asked for it in this session.
- Rewrite history (`rebase` of a pushed branch, `reset --hard`, `commit --amend` on a pushed commit).
- Delete any branch you did not create.
- Open a `staging -> main` PR on a services repo. It needs the client's approval link from the user.
- Change repo or organization settings.

## 3. Branches

Pattern: `type/issue-number-short-name`, lowercase, hyphens only. Example: `feat/42-compose-endpoint`.

| Prefix | Use |
|---|---|
| `feat/` | new behaviour |
| `fix/` | bug fix |
| `hotfix/` | urgent production fix (branch from `main`) |
| `perf/` `refactor/` | speed or restructuring, no new behaviour |
| `docs/` `chore/` `ci/` `test/` | the rest |

- Branch from the latest BASE: `git fetch origin && git switch -c feat/42-name origin/<BASE>`.
- One branch, one issue. Lives 1 to 3 working days, 1 week at most. If it grows, split the work.
- No personal branches (`name.dev`, `name-dev`). Rename tool-made branches (`claude/...`, `gitbutler/...`) to this pattern before opening a PR.
- Update your own branch with `git rebase origin/<BASE>`. If someone else uses it, use `git merge origin/<BASE>`.

## 4. Commits (Conventional Commits)

```
type(scope): summary

Body: why, not what. Wrap at 72 characters.

Closes #42
```

- Types: `feat fix perf refactor docs test build ci chore style revert`. Scope = part of the product, lowercase, from SCOPES.
- Summary: imperative ("add", "fix"), lowercase, no full stop, aim for 50 characters, never above 72 for the whole first line.
- One logical change per commit. If the summary needs "and", split it.
- Body explains the reason and trade-offs. Skip it only for trivial changes.
- Footer links the card: `Closes #42` or `Refs #42`. Other tickets: `Refs QA-055`. Breaking change: `type(scope)!:` plus a `BREAKING CHANGE:` footer.
- Keep the attribution trailer your tool adds (for example `Co-Authored-By: ...`).
- Write commit messages in English.

Good: `fix(stock): refuse a sale that would take stock below zero`
Bad: `fixed stuff`, `WIP`, `Update file.py`, `Received -> Cancelled (stock out, payments voided, bills cancelled; old purchases too)`

Before committing: run `git status` and `git diff --staged`. Check that only intended files are staged and no debug code or secrets are in the diff.

## 5. Pull requests

- Title = a commit message: `type(scope): summary`. On squash merge it becomes the commit on the base branch.
- Body = `.github/PULL_REQUEST_TEMPLATE.md`, filled in. Always include `Closes #N`.
- Size: one purpose. Aim for 400 changed lines or fewer (excluding generated files). Over 800 needs a written reason, or split it. Check with `git diff --shortstat origin/<BASE>...HEAD`.
- Before opening: run CHECKS, rebase on BASE, read your own diff, remove debug code.
- Needs one approval from someone else and green checks. You cannot approve your own PR.
- Do not merge a PR yourself unless the user told you to.

Merge method:

| PR | Base | Method |
|---|---|---|
| feature, fix, chore | BASE | Squash: `gh pr merge N --squash --delete-branch` |
| promotion | `staging` or `main` | Merge commit: `gh pr merge N --merge` (no `--delete-branch`) |
| hotfix | `main` | Squash |
| hotfix back-merge | `staging`, `dev` | Merge commit |

Promotion PR titles start with `chore(release):`, for example `chore(release): promote dev to staging`. List the included changes in the body.

## 6. Flows

**Products:** `feature -> dev` (squash) `-> staging` (merge commit; testers and QA) `-> main` (merge commit; only after QA signs off). Then tag the release.

**Services:** `feature -> staging` (squash; the client reviews here) `-> main` (merge commit; only after the client approves, with the approval linked in the PR). Then tag the release.

**Hotfix (both):** branch from `main`, fix with a test that fails without the fix, PR into `main` (squash), tag a patch version, then back-merge `main` into `staging` and `dev` with merge commits. Skipping the back-merge deletes the fix at the next promotion.

**Releases:** products use SemVer tags (`v1.4.0`). Services use date tags (`2026.11.14`). Create with `gh release create <tag> --generate-notes`.

## 7. Agent behaviour

1. Work from an issue. If there is none, ask the user whether to create one (see `TEAM_BOARD.md`). Do not invent a number.
2. Read the repo's `CLAUDE.md` / `AGENTS.md`, this file and the issue's "What done looks like" before coding.
3. If hooks exist, enable them: `git config core.hooksPath .githooks` (only if `.githooks/` exists). Do not edit hooks to make a commit pass.
4. Keep the diff small and on topic. Do not reformat or refactor unrelated code in the same PR.
5. Run CHECKS. If a check fails, fix the cause. Never weaken a check.
6. After pushing, report: branch name, PR link, size (`+/- lines`), checks status, and anything the user must decide.
7. If a rule here blocks the task, stop and tell the user. Do not work around it.

## 8. Quick commands

```sh
git fetch origin
git switch -c feat/42-short-name origin/dev          # services: origin/staging
git add path/to/file && git commit                    # message: type(scope): summary
git fetch origin && git rebase origin/dev
git push -u origin feat/42-short-name
gh pr create --base dev --title "feat(scope): summary" --body-file .github/PULL_REQUEST_TEMPLATE.md
git diff --shortstat origin/dev...HEAD                # PR size
gh pr merge 57 --squash --delete-branch               # feature PR, only if the user asked
gh pr merge 60 --merge                                 # promotion PR, never --delete-branch
```

Optional commit-msg hook (`.githooks/commit-msg`, any language) rejects anything that is not `type(scope): summary` or longer than 72 characters on the first line.

## 9. Done means

A git task is done only when: the branch name and commit messages follow this file, CHECKS pass, the PR links its issue, the PR is under the size limit or explains why not, and the user knows what was pushed.
