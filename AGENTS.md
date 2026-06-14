# Agent Guidance

This repository uses platform-neutral, version-controlled documentation as the
source of truth for both humans and coding agents.

## Before Making Changes

1. Read `README.md` for the project overview and commands.
2. Read `CONTRIBUTING.md` for the branch, review, testing, and publishing
   workflow.
3. Inspect the current branch, working tree, and relevant code before editing.

## Project Constraints

- Keep the site simple, responsive, accessible, and useful to home espresso
  makers.
- Prefer existing Next.js, React, TypeScript, and plain CSS patterns.
- Do not add a backend, database, package, or abstraction without a clear need.
- Use sources that directly informed the guide. Prefer specific, practical
  resources over generic authority links.
- Use Exa for bounded web research when available. Verify important source
  titles, authors, dates, and URLs before publishing them.
- If Python tooling is introduced, use `uv` and commit its lockfile.
- Moderate dependency vulnerabilities are acceptable for this learning project.
  High or critical vulnerabilities are not.

## Required Verification

Run before publishing changes:

```bash
npm run lint
npm run build
```

Use `coderabbit review` locally for substantial or risky changes. Visually
verify user-facing changes in a browser when practical.

## Documentation Approach

- Keep durable project knowledge in repository documentation, not chat history.
- Keep `AGENTS.md` concise and platform-neutral.
- Put canonical workflow details in `CONTRIBUTING.md`.
- Update documentation when a change alters setup, architecture, workflow, or
  deployment behavior.
- Do not add editor-specific instruction files unless the project explicitly
  adopts that editor.
