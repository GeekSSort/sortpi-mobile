# TEAM_BOARD.md

How GeekSSort plans and tracks work on GitHub issues and the org project boards. It applies to people and to AI coding agents.
Reference it from `CLAUDE.md` or `AGENTS.md`:

> Follow `TEAM_BOARD.md` for issues and the project board, and `GIT_RULES.md` for git work.

## 0. Setup an agent needs

- GitHub CLI signed in with the `project` scope: `gh auth refresh -h github.com -s project`.
- Check: `gh project list --owner GeekSSort` must list the boards.
- If it fails, do not guess. Tell the user and continue without board changes.

## 1. The two boards

| Lineup | Board | Number | For |
|---|---|---|---|
| Products | GeekSSort Products | `3` | SortPi, Sortorium and our other own products |
| Services | GeekSSort Services | `4` | Client work (the client list is on the board's Client field) |

URLs: `https://github.com/orgs/GeekSSort/projects/3` and `.../projects/4`.
**This repo is on the Products board (3).**
Every piece of work is an issue on exactly one board. If it is not on a board, it is not planned.

## 2. Columns (Status)

| Status | Meaning | Who moves a card here |
|---|---|---|
| Backlog | idea or request, not committed | whoever adds it |
| Ready | clear and small, can start tomorrow | the lead |
| In progress | someone is working on it now | the owner (or the agent doing the task) |
| In review | a pull request is open | the owner (or the agent that opened the PR) |
| QA | merged to staging, waiting for test | the reviewer |
| Done | tested and released | QA only |

## 3. Fields and labels

- **Assignee:** exactly one person. Never assign two.
- **Priority:** Urgent (stop other work), High (this week), Medium (this month), Low (whenever).
- **Size:** S (under 1 day), M (1 to 3 days), L (over 3 days: split it).
- **Services only:** **Client** (which client) and **Due date**.
- **Labels:** `bug`, `enhancement`, `performance`, `mvp`, `blocked`, `needs-info`.

## 4. Rules

1. One owner per card. The column must always be true.
2. At most 2 cards In progress per person.
3. Nobody tests their own work. QA is a different person.
4. Bigger than 3 days (Size L): split it before starting.
5. Blocked: add the `blocked` label and comment why. Leave the card where it is.
6. A PR with `Closes #N` links the card. Do not close issues by hand.
7. Do not change Priority, Size, Assignee or Status of a card you do not own unless the user asked.

## 5. Issue format

Every issue has these three headings:

```md
## Problem
What is wrong or needed, and who feels it.

## What done looks like
- [ ] First thing that must be true
- [ ] Second thing that must be true

## How to check
Steps to try, a link to staging, or a number to measure.
```

Title says what will be true when it is done ("Add atomic compose endpoint"). Write issues in English. Services issues also name the client and the due date.

Epics are issues whose title starts with `EPIC:`. They hold a goal and a checklist, and link the smaller issues as sub-issues. Use an epic only when many issues serve one goal.

## 6. Agent workflow

**Start of a task**
1. Find the issue. If none exists, search first (`gh issue list -R GeekSSort/<repo> -S "<words>"`). If still none, ask the user before creating one. Never create duplicates.
2. Read the issue: Problem, "What done looks like", linked PRs, comments.
3. If it is not on the board, add it. Set Status to **In progress**. Then follow `GIT_RULES.md` to create the branch.

**While working**
- Stay inside "What done looks like". Found something else? Open a new issue for it, do not widen this one.
- Blocked or unclear? Comment on the issue with the exact question, add `needs-info` or `blocked`, and tell the user.

**When the PR is open**
- The PR body contains `Closes #N`. Set Status to **In review**. Comment on the issue with the PR link, one line.

**Never**
- Never move a card to **QA** or **Done**. QA does that after testing on staging, or the PR merge workflow does.
- Never move a card backwards without a comment saying why.

## 7. Commands

Replace `3` with the board number (`4` for Services), `GeekSSort/REPO` and `42` with the real values.

```sh
BOARD=3; OWNER=GeekSSort; REPO=GeekSSort/REPO; ISSUE=42

# add an issue to the board (prints the item id)
gh project item-add $BOARD --owner $OWNER --url https://github.com/$REPO/issues/$ISSUE --format json --jq .id

# find the item id of an issue already on the board
gh project item-list $BOARD --owner $OWNER --limit 300 --format json \
  --jq ".items[] | select(.content.number==$ISSUE and .content.repository==\"$REPO\") | .id"

# set a single-select field (Status, Priority, Size, Client). IDs are looked up, never hard-coded.
set_field() {  # usage: set_field ITEM_ID "Status" "In progress"
  local item="$1" field="$2" value="$3"
  local pid fid oid
  pid=$(gh project view $BOARD --owner $OWNER --format json --jq .id)
  fid=$(gh project field-list $BOARD --owner $OWNER --format json --jq ".fields[] | select(.name==\"$field\") | .id")
  oid=$(gh project field-list $BOARD --owner $OWNER --format json --jq ".fields[] | select(.name==\"$field\") | .options[] | select(.name==\"$value\") | .id")
  gh project item-edit --project-id "$pid" --id "$item" --field-id "$fid" --single-select-option-id "$oid"
}
set_field "$ITEM_ID" "Status" "In progress"

# create an issue from a file with the three headings
gh issue create -R $REPO --title "feat(scope): what will be true" --body-file issue.md --label enhancement

# link a child issue to an epic (sub-issue)
CHILD_ID=$(gh api repos/$REPO/issues/$ISSUE --jq .id)
gh api -X POST repos/$REPO/issues/$EPIC/sub_issues -F sub_issue_id=$CHILD_ID

# comment, label, assign
gh issue comment $ISSUE -R $REPO --body "PR opened: <link>"
gh issue edit $ISSUE -R $REPO --add-label blocked
gh issue edit $ISSUE -R $REPO --add-assignee <login>
```

If a field value is not found (empty id), stop and report it. Options are named exactly: Status `Backlog, Ready, In progress, In review, QA, Done`; Priority `Urgent, High, Medium, Low`; Size `S, M, L`.

## 8. Team and ownership (update when it changes)

| Person | GitHub | Owns |
|---|---|---|
| Jubayer | `jubayer17` | frontend and backend |
| Sirajul | `siraajul` | QA, frontend (business site, CMS), mobile app |
| Baizid | `baizidkhan` | MVP |

Do not assign an issue to someone because of this table alone. Assign only when the user says who, or when the issue already has an owner.

## 9. Rhythm (for humans)

- **Monday (15 min):** the lead moves cards Backlog to Ready and assigns them. Services cards due within two weeks come first.
- **Daily:** update your own card. No stand-up needed if the board is true.
- **Friday (20 min):** review Done, tell clients what shipped, re-rank.

## 10. Definition of Done

A card is Done only when: the PR is merged, QA tested it on staging against "What done looks like", it is released, and (Services) the client was told what shipped.
