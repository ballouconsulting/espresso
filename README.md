# Espresso Field Guide

A responsive, interactive guide to making more consistent espresso at home,
with a small set of stateless API helpers.

The project has no database or separately managed backend. Next.js route
handlers provide the API endpoints and run with the rest of the site on Vercel.

## Project Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) is the canonical development, review, and
  publishing workflow.
- [AGENTS.md](AGENTS.md) gives platform-neutral guidance to coding agents.

## Stack

- Next.js + React + TypeScript
- Plain CSS
- Stateless Next.js API route handlers
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

GitHub Actions is configured in `.github/workflows/ci.yml`. It runs tests, lint,
and a production build on pushes and pull requests, giving you a separate
automated check before deployment.

## Useful commands

```bash
npm run dev      # local development server
npm test         # API and calculation tests
npm run lint     # code checks
npm run build    # production build
npm audit        # dependency security report
```

Dependencies are pinned in `package.json` and fully resolved in
`package-lock.json` so local, CI, and Vercel builds use the same versions.

## API

All endpoints return JSON. Invalid requests use this error shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Check the request fields.",
    "fields": {
      "zip": "Must be a five-digit US ZIP code."
    }
  }
}
```

### Dial-in advisor

`POST /api/dial-in` assesses a shot from its measured recipe and optional taste
note. Taste can be `sour`, `bitter`, `both`, or `balanced`.

```bash
curl -X POST http://localhost:3000/api/dial-in \
  -H 'Content-Type: application/json' \
  -d '{"doseGrams":18,"yieldGrams":36,"timeSeconds":22,"taste":"sour"}'
```

The response includes the measured ratio, extraction and pace assessments, and
concrete next-shot suggestions. Taste takes priority over time.

### Brew calculator

`POST /api/brew-calculator` accepts exactly two of `dose`, `yield`, and `ratio`,
then calculates the missing value. `unit` and `outputUnit` can be `g` or `oz`
and default to grams.

```bash
curl -X POST http://localhost:3000/api/brew-calculator \
  -H 'Content-Type: application/json' \
  -d '{"dose":18,"ratio":2,"outputUnit":"oz"}'
```

### Altitude-aware brew temperature

`GET /api/brew-temperature?zip=80302` looks up a US ZIP-code centroid, obtains
its terrain elevation, estimates the local boiling point, and returns a
practical starting temperature and range.

```bash
curl 'http://localhost:3000/api/brew-temperature?zip=80302'
```

ZIP centroid data comes from [Zippopotam.us](https://docs.zippopotam.us/),
which uses GeoNames data. Terrain elevation comes from the
[Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api).
Because a ZIP centroid is only an approximation, the response includes the
location and a caveat that local elevation, machine accuracy, and roast level
can change the useful setting. Upstream lookup failures return a `502`
`location_service_unavailable` error.

## Change Workflow

Use focused feature branches and pull requests for normal changes. Local tests,
lint, and build checks run before publishing; GitHub Actions, CodeRabbit, and
Vercel then verify the pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) for
the complete workflow.

## Content references

- [Understanding Espresso by James Hoffmann](https://www.youtube.com/playlist?list=PLxz0FjZMVOl3MuAzK5l3gjakoOGrmK8fP)
- [A Beginner's Guide To Fixing Bad Espresso by James Hoffmann](https://www.youtube.com/watch?v=MbTD42FvMVU)
- [The Best Espresso Tutorial (Part 2) by Lance Hedrick](https://www.youtube.com/watch?v=I6ti6NMCqsc)
- [Defining the Ever-Changing Espresso by David Fasman](https://sca.coffee/sca-news/25-magazine/issue-3/defining-ever-changing-espresso-25-magazine-issue-3)
- [High Elevation Food Preparation Guide by Colorado State University Extension](https://extension.colostate.edu/resource/high-elevation-food-preparation-guide/)
