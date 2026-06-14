# Contributing

This repository is both a working espresso guide and a learning project for a
modern development workflow. Humans and coding agents should follow the same
version-controlled process.

## Sources Of Truth

- `README.md`: project purpose, stack, setup, deployment, and useful commands
- `CONTRIBUTING.md`: canonical change, review, and publishing workflow
- `AGENTS.md`: concise, platform-neutral instructions for coding agents
- Git history and pull requests: decisions and the review record

Important project knowledge should be added to one of these sources instead of
being left only in an editor thread or chat.

## Start A Change

Begin a new change from the latest `main`:

```bash
git switch main
git pull --ff-only
git switch -c feature/short-description
```

If you are already on the correct feature branch, continue there. Do not switch
branches unnecessarily when uncommitted changes exist.

Keep changes focused. Prefer existing code patterns and avoid unrelated
refactors.

## Verify Locally

Always run:

```bash
npm test
npm run lint
npm run build
```

For user-facing changes, inspect the relevant desktop and mobile layouts in a
browser. For substantial or risky changes, also run:

```bash
coderabbit review
```

The CodeRabbit CLI reviews local Git changes before publishing. CodeRabbit's
GitHub integration separately reviews the final pull request diff.

Dependencies are pinned in `package.json` and `package-lock.json`. Moderate
dependency vulnerabilities are acceptable for this learning project; high or
critical vulnerabilities must be addressed before merging.

## Publish And Review

```bash
git add <changed-files>
git commit -m "Short description"
git push -u origin HEAD
gh pr create --draft --fill
```

A pull request triggers:

- GitHub Actions to lint and build
- Vercel to create a preview deployment
- CodeRabbit to review the committed diff

Review the Vercel preview for user-facing changes. Address valid review
comments in the feature branch, rerun local checks, and push the fixes. Merge
only after required checks pass.

After merging:

```bash
git switch main
git pull --ff-only
git branch -d feature/short-description
```

## Research And Content

- Use sources that genuinely informed the guide.
- Prefer direct, specific resources over generic landing pages.
- Use Exa for bounded discovery and clean extraction when available.
- Verify source metadata before adding links.
- Keep quotations short and write original summaries.

## Agentic Coding And Context

Start a new editor or agent thread for each coherent feature, fix, or pull
request. This keeps conversational context small while the repository preserves
durable context.

At the start of a new thread, ask the agent to read `AGENTS.md`,
`CONTRIBUTING.md`, and the relevant code. A short task prompt should then be
enough; the agent can recover project state from the repository, Git history,
and current pull requests.

Do not create platform-specific instruction files by default. If an agent does
not automatically read `AGENTS.md`, explicitly direct it there in the opening
prompt.
