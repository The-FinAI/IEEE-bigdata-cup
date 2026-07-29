# FinReason Cup

Official public-information site for the FinReason Cup at IEEE Big Data Cup
2026.

The site presents the three planned technical tracks:

1. Verifiable Financial Chain Reasoning
2. Market-Neutral Hedging
3. Financial Audit Verification

Participant-facing dates, rules, registration, starter kits, and submission
links remain marked as provisional or coming soon until organizer review is
complete.

## Repository map

- `app/` — public GitHub Pages site
- `starter-kit/` — fail-closed organizer draft of participant contracts,
  validators, and release checks
- `docs/organizer-runbook.md` — common work that can proceed without waiting
  for task-specific scientific decisions
- `docs/claimable-work.md` — the small set of workstreams that contributors can
  claim for themselves
- `docs/official-alignment.md` — reconciliation of IEEE's public wording with
  the still-unconfirmed FinReason release decisions
- `docs/decision-log.md` — one source of truth for shared organizer decisions
- `.github/ISSUE_TEMPLATE/` — self-claim, participant-question, and
  release-blocker forms

Task 1 scientific direction is owned by Zhuohan. Task 2, Task 3, publicity and
outreach, reviewer coordination, and the three task baselines are open for
self-claiming. Contributors can use the repository's
[New issue](https://github.com/The-FinAI/IEEE-bigdata-cup/issues/new/choose)
page; no workstream is pre-assigned through the templates.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run check
```

`npm run check` validates the site and the starter-kit structural contracts.
It intentionally does not claim that the competition is ready to launch.

The stricter participant-release gate is:

```bash
npm run release:check
```

That command must fail while task definitions, data, baselines, scorers, rules,
or platform links remain unresolved. A participant release may be tagged only
after it passes.

## Deployment

Pushes to `main` build and deploy through
`.github/workflows/deploy-pages.yml`. The project Pages base path is
`/IEEE-bigdata-cup`, with the target URL:

<https://the-finai.github.io/IEEE-bigdata-cup/>

GitHub Pages does not provide an application backend. Until the organizers
publish a verified external registration form or service, this static site does
not collect personal or team information.
