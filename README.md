# FinReason Cup

Official public-information site for the FinReason Cup at IEEE Big Data Cup
2026.

The site presents the three planned technical tracks:

1. Verifiable Financial Chain Reasoning
2. Market-Neutral Hedging
3. Financial Audit Verification

The Letter of Intent is live at
<https://forms.gle/D4VJqjgtmcaC77DL8>. Teams planning to participate are
invited to submit one response per team. The responses support organizer
planning, communication, and aggregate participation statistics.
Participant-facing dates, rules, starter kits, and submission links remain
marked as provisional or coming soon until organizer review is complete.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm test
```

`npm test` produces the same static export used by GitHub Pages and checks the
rendered HTML contract.

## Deployment

Pushes to `main` build and deploy through
`.github/workflows/deploy-pages.yml`. The project Pages base path is
`/IEEE-bigdata-cup`, with the target URL:

<https://the-finai.github.io/IEEE-bigdata-cup/>

GitHub Pages does not provide an application backend. The site links to an
external Google Form for the Letter of Intent; the static site itself does not
collect personal or team information.
