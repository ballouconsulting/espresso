# Espresso Field Guide

A responsive, interactive guide to making more consistent espresso at home.

This project intentionally has no backend or database. That keeps the first
deployment focused on the core workflow: build locally, version with Git,
push to GitHub, and let a hosting platform deploy each change.

## Stack

- Next.js + React + TypeScript
- Plain CSS
- Vercel for deployment

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production workflow

1. Create a GitHub repository and push this project.
2. Sign in to [Vercel](https://vercel.com) with GitHub.
3. Choose **Add New → Project**, import the repository, and click **Deploy**.
4. Every future push to `main` creates a new production deployment. Pull requests get their own preview URL.

For a personal learning project, Vercel's Hobby plan is the simplest free option. A custom domain is optional and is normally the only cost.

### How deployment works

Vercel connects to the GitHub repository and listens for new commits. When you
push a commit, Vercel installs the locked dependencies, runs `npm run build`,
and puts the resulting site on its global network. The `main` branch maps to
the public production site; other branches and pull requests get temporary
preview URLs.

There are no servers for you to maintain for this project. Vercel provides a
free `*.vercel.app` address and HTTPS certificate. You can later buy a custom
domain and point it at the same deployment.

GitHub Actions is configured in `.github/workflows/ci.yml`. It runs lint and a
production build on pushes and pull requests, giving you a separate automated
check before deployment.

## Useful commands

```bash
npm run dev      # local development server
npm run lint     # code checks
npm run build    # production build
npm audit        # dependency security report
```

Dependencies are pinned in `package.json` and fully resolved in
`package-lock.json` so local, CI, and Vercel builds use the same versions.

## Change workflow

For normal changes, work on a feature branch and review the local diff before
publishing it:

```bash
git switch -c codex/short-description
npm run lint
npm run build
coderabbit review
git add .
git commit -m "Short description"
git push -u origin HEAD
gh pr create --draft --fill
```

CodeRabbit CLI requires a one-time `coderabbit auth login`. Use
`coderabbit review` for a readable terminal review or `coderabbit review
--agent` when a coding agent will process the findings. The local review
provides fast feedback before publishing; CodeRabbit's GitHub app then reviews
the pull request alongside GitHub Actions and Vercel's preview deployment.

## Content references

- [Understanding Espresso by James Hoffmann](https://www.youtube.com/playlist?list=PLxz0FjZMVOl3MuAzK5l3gjakoOGrmK8fP)
- [A Beginner's Guide To Fixing Bad Espresso by James Hoffmann](https://www.youtube.com/watch?v=MbTD42FvMVU)
- [The Best Espresso Tutorial (Part 2) by Lance Hedrick](https://www.youtube.com/watch?v=I6ti6NMCqsc)
