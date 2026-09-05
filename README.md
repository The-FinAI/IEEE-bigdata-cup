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
  <a href="https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03"><strong>Submit challenge paper</strong></a>
  ·
  <a href="https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/"><strong>Submit Task 1 predictions</strong></a>
  ·
  <a href="https://the-finai.github.io/IEEE-bigdata-cup/terms/"><strong>Terms</strong></a>
  ·
  <a href="https://the-finai.github.io/IEEE-bigdata-cup/privacy/"><strong>Privacy</strong></a>
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

Solve multi-step financial problems and return both a final answer and values
for the published intermediate-step slots. The frozen scorer reports **Final
answer** and **Reasoning steps** separately. The released Task 1 package freezes
the prediction schema, evaluator contract, numerical tolerance policy, and
participant data. The hub publishes the validator and current submission guide.

### Task 2 · Market-Neutral Hedging

Select an asset pair and manage a zero-net-dollar position over time using
point-in-time prices, news, and corporate filings. The task is designed to
reward relative-value reasoning rather than unhedged directional exposure.

Training data is available from [HERCULEAN](https://huggingface.co/datasets/TheFinAI/Herculean/tree/main/data).
Download `prices.parquet`, `news.parquet`, and `filings.parquet` from the
[Task 2 training data hub](https://the-finai.github.io/IEEE-bigdata-cup/task2/).
Development and private evaluation splits, exact market windows, eligible assets,
execution assumptions, transaction costs, and position-validity rules will be
published with the scorer.

### Task 3 · Financial Audit Verification

Perform targeted numeric-fact verification on organizer-packaged SEC EDGAR
XBRL filing materials by comparing reported values with values derived from
their calculation context. This task is **not** a full financial-statement
audit.

The planned release combines public filing cases and separately constructed
held-out cases subject to leakage review.

## Evaluation status

| Task | Current evaluation |
| --- | --- |
| Task 1 · Reason | Final answer and Reasoning steps (live) |
| Task 2 · Hedge | Cumulative return, Sharpe ratio, and maximum drawdown (provisional) |
| Task 3 · Verify | Accuracy and structural, extraction, and calculation error rates (provisional) |

Task 1 uses the frozen public schema, validator, and scorer linked from its
participant hub. Task 2 and Task 3 formulas, tolerances, tie-break procedures,
submission contracts, and validity rules will be published with their public
scorers.

## Final paper and solution submission

Teams seeking final ranking and awards must submit a challenge paper through
the official [FinReason Cup SC03 track in
CyberChair](https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03).

- Length: up to 6 pages total, including references
- Format: [IEEE two-column conference
  template](https://www.ieee.org/conferences/publishing/templates.html)
- Deadline: 15 November 2026, 23:59 Anywhere on Earth

CyberChair has not yet updated its displayed deadline and currently shows a
10-page upload limit. The FinReason Cup organizer deadline is 15 November 2026,
23:59 Anywhere on Earth, and FinReason teams should follow the challenge
requirement above and submit no more than 6 pages total, including references.

The paper portal is separate from the competition submission path. Task 1 does
not require pre-registration, organizer approval, an access code, or an account.
Teams upload predictions through the verified development and test pages linked
from the participant hub. Development immediately returns two scores, a receipt,
and a current rank, and the team's best eligible result appears on the public
leaderboard. Test returns only an acceptance receipt. Task 2 and Task 3 solution materials
and submission routes will be published after organizer testing. All routes
share the 15 November deadline.

Submission does not guarantee publication. Any publication is subject to
conference peer review, acceptance, camera-ready submission, registration, and
presentation requirements.

## Certificates and prizes

FinReason does not offer cash prizes. Registration support is not confirmed at
this time. A team will receive a participation certificate if it completes both:

1. at least one valid final solution submission under the applicable task
   rules; and
2. a challenge paper submission through CyberChair SC03 by 15 November 2026,
   23:59 Anywhere on Earth.

Winning teams will receive a winner certificate. Additional award categories
remain provisional until published. Certificates do not imply challenge-paper
acceptance or publication.

## Direct participation

Task 1 is open for direct participation. Choose one consistent Team Name and
follow the [step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/#how-to-submit).
Development requires Team Name and a canonical ZIP. Test requires the same Team
Name, a private Contact Email, and a canonical ZIP. Contact Email is not a login
and is used only for submission identification, submission-related support,
matching final results to the related challenge paper, and enforcing test
submission quotas and replay protection through a non-public pseudonymous
identifier.

### Current release status

| Resource | Status |
| --- | --- |
| [Official challenge website](https://the-finai.github.io/IEEE-bigdata-cup/) | Live |
| Task 1 training, development, and test files | Live as 13 development files and 3 test files |
| Task 1 direct web upload | See the participant hub for current verified availability |
| [Task 1 step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/#how-to-submit) | Live |
| Task 1 validator, sample B0, and B1 baseline | Live in this repository |
| Task 1 organizer baseline scores | B0–B2 local-development references live on the leaderboard page |
| [Task 2 training data](https://the-finai.github.io/IEEE-bigdata-cup/task2/) | Live: prices, news, and filings (Parquet) |
| Task 2 and Task 3 starter kits and baselines | Coming soon |
| Participant support | [zhuohan.xie@mbzuai.ac.ae](mailto:zhuohan.xie@mbzuai.ac.ae) |
| Terms of Participation | Live |
| Privacy Notice | Live |
| [Challenge paper submission](https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03) | Open |
| [Task 1 participant hub](https://the-finai.github.io/IEEE-bigdata-cup/task1/) | Public downloads live; direct-upload status published here |
| [Task 1 leaderboard](https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/) | Development only |

The participant hub publishes only organizer-verified competition-platform and
submission links and records their current availability.

## Schedule

| Milestone | Date |
| --- | --- |
| Final challenge paper and solution materials | **15 November 2026, 23:59 AoE** |
| Winning teams announced | **25 November 2026** |
| IEEE Big Data 2026, Phoenix, Arizona | **14–17 December 2026** |

Task 2, Task 3, and remaining private-evaluation dates will be published on the
official challenge website after organizer testing.

## Repository scope

This repository contains the organizer-maintained FinReason Cup website and the
released Task 1 participant data and tools. Task 2 and Task 3 participant
resources will be linked here after organizer verification.

Please use only links marked as verified on the
[official challenge website](https://the-finai.github.io/IEEE-bigdata-cup/).

### Task 1 participant hub

The public `/task1/` route is the stable participant entry point:

- exactly 13 development files and three public test files are
  downloadable from Pages with their frozen manifests;
- `/task1/submit/` publishes two distinct organizer-verified direct-upload links
  after both workspaces pass deployment checks;
- the development page accepts Team Name and the 580-row predictions ZIP, then
  immediately returns Final answer, Reasoning steps, a receipt, and current rank;
- each team's best eligible development result appears on the public leaderboard;
- the separate test workspace accepts the 928-row test predictions ZIP and
  requires Team Name and Contact Email, then returns only an acceptance receipt,
  with no score, rank, diagnostic, score-derived signal, or test leaderboard;
- Contact Email, submission files, gold answers, and private evaluation records
  stay inside the verified private submission boundary and are never published.

The [step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/#how-to-submit)
identifies the exact development and test input files, the five required JSONL
fields, the validator and packaging commands, and each phase's receipt behavior.
Every uploaded ZIP must contain exactly one root-level file named
`predictions.jsonl`; the paper PDF is submitted separately through CyberChair.

The public JSON feed uses a frozen aggregate-only development leaderboard
contract. It publishes only Team Name, rank, the two aggregate scores, and
acceptance time. It must not expose predictions, attachments, Contact Email,
receipts, private identifiers, test results, or additional metadata. The
response must be no larger than 1 MiB.

The Pages workflow builds the website, frozen public downloads, guarded links,
and the aggregate development leaderboard view. It never receives a Contact
Email, submission archive, gold answer, or private evaluation record. Live mode
requires two distinct verified root `*.hf.space` URLs and the verified public
development leaderboard endpoint. Until then, the public site shows the upload
links as pending rather than publishing an unverified route.

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

Participant support, privacy questions, and correction or deletion requests can
be sent to [zhuohan.xie@mbzuai.ac.ae](mailto:zhuohan.xie@mbzuai.ac.ae). See the
[Privacy Notice](https://the-finai.github.io/IEEE-bigdata-cup/privacy/) for the
public website boundary, public leaderboard fields, external services, and the
Task 1 retention policy. Readable Contact Email is kept only while needed for
the stated purposes, then deleted or minimized. Encrypted submission archives
and non-public operational event records may remain in restricted
organizer-private repository history for challenge administration and audit;
the Privacy Notice explains this boundary and its exceptions.

## Organizers

The organizer team is led by [The Fin AI](https://thefin.ai/), with
contributors affiliated with MBZUAI, McGill University, Stevens Institute of
Technology, Yale University, and the University of Manchester. Affiliations do
not imply institutional sponsorship.

Task-specific dates, platform settings, award categories, and resource licenses
are published only after organizer verification. The
[Terms of Participation](https://the-finai.github.io/IEEE-bigdata-cup/terms/)
describe the current organizer-maintained participation rules.

---

Last reviewed: 3 September 2026.
