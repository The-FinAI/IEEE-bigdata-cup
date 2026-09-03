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
  <a href="https://forms.gle/D4VJqjgtmcaC77DL8"><strong>Submit Letter of Intent</strong></a>
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

Solve multi-step financial problems and return both a final answer and a
step-by-step reasoning trace. Predictions are checked against organizer references
generated from executable [FinChain](https://github.com/mbzuai-nlp/finchain)
templates. The released Task 1 package freezes the prediction schema, evaluator
contract, numerical tolerance policy, and development data.

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

The paper portal is separate from the competition submission path. The final
task rules will specify which solution materials each team must provide,
including any required predictions, source code, and reproducibility materials.
They will use the verified competition link published on the official challenge
website after organizer testing. Both routes share the 15 November deadline.

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

## Participant access

Teams planning to participate should submit **one Letter of Intent per team**:

**[Submit the FinReason Cup Letter of Intent →](https://forms.gle/D4VJqjgtmcaC77DL8)**

The LOI supports challenge planning, organizer communication, and aggregate
participation statistics. It does not replace either the challenge paper or the
final competition submission.

### Current release status

| Resource | Status |
| --- | --- |
| [Official challenge website](https://the-finai.github.io/IEEE-bigdata-cup/) | Live |
| [Letter of Intent](https://forms.gle/D4VJqjgtmcaC77DL8) | Open |
| Task 1 training, development, and test files | Live as 13 development files and 3 test files |
| Task 1 direct web upload | See the participant hub for current verified availability |
| [Task 1 step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/#how-to-submit) | Live |
| Task 1 validator, sample B0, and B1 baseline | Live in this repository |
| Task 1 organizer baseline scores | B0–B2 local-development references live on the leaderboard page |
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
- the development page accepts the 580-row predictions ZIP, returns final-answer
  and checkpoint scores immediately; participants select **Refresh leaderboard**
  to load the current best result and rank;
- the separate test workspace accepts the 928-row test predictions ZIP and
  returns only an acceptance receipt, with no score, rank, diagnostic, or test
  leaderboard;
- access codes and submission files are entered only inside the verified
  workspace, never into this GitHub Pages site;
- team access codes are issued by the organizers after registration and are
  entered only inside the verified submission workspace.

The [step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/#how-to-submit)
identifies the exact development and test input files, the five required JSONL
fields, the validator and packaging commands, and each phase's receipt behavior.
Every uploaded ZIP must contain exactly one root-level file named
`predictions.jsonl`; the paper PDF is submitted separately through CyberChair.

The public JSON feed uses the canonical aggregate-only development leaderboard
contract below. Its root and row fields are exact; it
must not expose predictions, attachments, email addresses, private evaluation
data, or additional metadata. The response must be no larger than 1 MiB.

```json
{
  "schema_version": "finreason.task1.development-leaderboard/1.0.0",
  "phase": "development",
  "rows": []
}
```

The Pages workflow builds the website, frozen public downloads, guarded links,
and the optional aggregate development leaderboard view. It never receives a
team code, submission archive, gold answer, or private evaluation record. Live
mode requires two distinct verified root `*.hf.space` URLs. Until then, the
public site shows the upload links as pending rather than publishing an
unverified route.

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
Participant support, privacy questions, and correction or deletion requests can
be sent to [zhuohan.xie@mbzuai.ac.ae](mailto:zhuohan.xie@mbzuai.ac.ae). See the
[Privacy Notice](https://the-finai.github.io/IEEE-bigdata-cup/privacy/) for the
public website boundary, public leaderboard fields, external services, and the
Task 1 retention policy. Private Task 1 submission archives and non-public
operational event records are retained for up to 120 days from acceptance,
subject to the exceptions stated in that notice.

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
