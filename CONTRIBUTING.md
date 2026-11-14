# Contributing

## Branches
- Products: feature branch -> dev -> staging -> main
- Services: feature branch -> staging -> main (client approves before main)
- Name: type/issue-short-name   e.g. feat/42-compose-endpoint
- Never push straight to dev, staging or main.

## Commits and PR titles
type(scope): summary   e.g. fix(auth): keep the session on a slow refresh
Types: feat fix perf refactor docs test build ci chore style revert

## Pull requests
- One purpose, about 400 changed lines or fewer
- Fill in the template. Write "Closes #N"
- One approval from someone else. Green checks.
- Feature PRs: squash merge. Promotions: merge commit.

## Local setup
    git config core.hooksPath .githooks
    git config commit.template .gitmessage
