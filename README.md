<p align="center">
  <img src="public/og.png" alt="FinReason Cup 2026 — Financial AI should show its work" width="100%">
</p>

<h1 align="center">FinReason Cup 2026</h1>

<p align="center">
  <strong>Agentic Financial Reasoning, Hedging &amp; Audit</strong><br>
  IEEE Big Data Cup 2026 · Phoenix, Arizona · 14–17 December 2026
</p>

<p align="center">
  <a href="https://the-finai.github.io/IEEE-bigdata-cup/"><strong>Official website</strong></a>
  ·
  <a href="https://forms.gle/D4VJqjgtmcaC77DL8"><strong>Submit Letter of Intent</strong></a>
  ·
  <a href="https://bigdataieee.org/BigData2026/cup/"><strong>IEEE Cup overview</strong></a>
</p>

## About the challenge

FinReason Cup is Challenge 03 of the [IEEE Big Data Cup
2026](https://bigdataieee.org/BigData2026/cup/). It asks a central question for
financial AI: **can a system's reasoning be executed, checked, and
reproduced—not merely presented as a plausible answer?**

The competition brings together three complementary tasks spanning symbolic
reasoning, sequential financial decisions, and structured verification.

## Competition tasks

### Task 1 · Verifiable Financial Chain Reasoning

Solve multi-step financial problems and return both a final answer and a
step-by-step reasoning trace. Predictions are planned to be checked against
gold traces generated from executable [FinChain](https://github.com/mbzuai-nlp/finchain)
templates.

The exact problem subset, trace schema, ChainEval version, and numerical
tolerance policy will be frozen with the starter kit.

### Task 2 · Market-Neutral Hedging

Select an asset pair and manage a zero-net-dollar position over time using
point-in-time prices, news, and corporate filings. The task is designed to
reward relative-value reasoning rather than unhedged directional exposure.

The planned data are derived from
[HERCULEAN](https://arxiv.org/abs/2605.14355). Exact market windows, eligible
assets, execution assumptions, transaction costs, and position-validity rules
will be published with the dataset and scorer.

### Task 3 · Financial Audit Verification

Perform targeted numeric-fact verification on organizer-packaged SEC EDGAR
XBRL filing materials by comparing reported values with values derived from
their calculation context. This task is **not** a full financial-statement
audit.

The planned release combines public filing cases and separately constructed
held-out cases subject to leakage review.

## Planned evaluation

| Task | Provisional evaluation |
| --- | --- |
| Task 1 · Reason | Final-answer accuracy and step-level ChainEval |
| Task 2 · Hedge | Cumulative return, Sharpe ratio, and maximum drawdown |
| Task 3 · Verify | Accuracy and structural, extraction, and calculation error rates |

Final scoring formulas, tolerances, tie-break procedures, submission contracts,
and validity rules will be published with the public scorers.

## Participant access

Teams planning to participate should submit **one Letter of Intent per team**:

**[Submit the FinReason Cup Letter of Intent →](https://forms.gle/D4VJqjgtmcaC77DL8)**

The LOI supports challenge planning, organizer communication, and aggregate
participation statistics. Technical participation and submission instructions
will be released separately.

### Current release status

| Resource | Status |
| --- | --- |
| [Official challenge website](https://the-finai.github.io/IEEE-bigdata-cup/) | Live |
| [Letter of Intent](https://forms.gle/D4VJqjgtmcaC77DL8) | Open |
| Datasets and development splits | Coming soon |
| Starter kits, schemas, validators, and baselines | Coming soon |
| Participant support channel | Coming soon |
| Submission workflow | Under organizer validation |

The IEEE overview currently lists Kaggle with an organizer-run Docker
evaluation path. Final verified platform and submission links will be posted on
the official challenge website after workflow testing.

## Schedule

The confirmed conference dates are **14–17 December 2026** in **Phoenix,
Arizona, USA**. Competition release dates, submission deadlines, and private
evaluation milestones remain to be confirmed and will be published on the
official challenge website.

## Repository scope

This repository currently contains the source for the organizer-maintained
FinReason Cup website. Verified participant resources—including datasets,
starter kits, schemas, validators, baselines, and submission links—will be
linked here as they are released.

Please use only links marked as verified on the
[official challenge website](https://the-finai.github.io/IEEE-bigdata-cup/).

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

Run the same checks used by the GitHub Pages workflow:

```bash
npm run lint
npm test
```

`npm test` builds the static GitHub Pages export and validates its rendered HTML
contract. Pushes to `main` deploy through
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

## Data-use notice

The Letter of Intent is hosted on Google Forms. Responses are available to the
organizer team and are used for challenge operations, communication permitted
by the form, and aggregate reporting. Do not include sensitive information.
Participant support and the correction or deletion process will be published
with the participant guidance.

## Organizers

The organizer team is led by [The Fin AI](https://thefin.ai/), with
contributors affiliated with MBZUAI, McGill University, Stevens Institute of
Technology, Yale University, and the University of Manchester. Affiliations do
not imply institutional sponsorship.

Competition dates, eligibility, platform rules, awards, and data terms remain
subject to organizer and IEEE confirmation.

---

Last reviewed: 30 July 2026.
