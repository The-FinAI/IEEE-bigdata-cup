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
  <a href="https://the-finai.github.io/IEEE-bigdata-cup/task3/submit/"><strong>Submit Task 3 predictions</strong></a>
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

The starter kit, validator, and scorer are released in `finreason_task3/`, and
the practice phase is open: upload predictions over the 332 public FinMR cases
and the scoring workspace returns accuracy and the three error rates
immediately. Practice answers are public, so practice results are never ranked.
The development and test phases combine separately constructed held-out cases
subject to leakage review and open when those datasets are published.

## Evaluation status

| Task | Current evaluation |
| --- | --- |
| Task 1 · Reason | Final answer and Reasoning steps (live) |
| Task 2 · Hedge | Cumulative return, Sharpe ratio, and maximum drawdown (provisional) |
| Task 3 · Verify | Accuracy and structural, extraction, and calculation error rates (live for practice) |

Task 1 and Task 3 each use a frozen public schema, validator, and scorer linked
from their participant hubs. Task 2 formulas, tolerances, tie-break procedures,
submission contracts, and validity rules will be published with its public
scorer.

## Competition submissions and Working Notes

**Schedule update, 7 September 2026:** the previously published combined
15 November cutoff has been advanced. Final system submissions and required
solution materials for all three tasks are due on **15 October 2026, 23:59
Anywhere on Earth**. Working Notes are due separately on **23 October 2026,
23:59 Anywhere on Earth**.

Teams seeking final ranking and awards must submit Working Notes (a challenge paper) through
the official [FinReason Cup SC03 track in
CyberChair](https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03).

- Length: up to 10 pages total, including references
- Format: [IEEE two-column conference
  template](https://www.ieee.org/conferences/publishing/templates.html)
- Working Notes deadline: 23 October 2026, 23:59 Anywhere on Earth
- Paper review feedback and organizer acceptance decisions: 6 November 2026
- Camera-ready deadline for accepted papers: 13 November 2026, 23:59 Anywhere on Earth

CyberChair currently displays its deadline as to be announced and allows up to
10 pages including references. Follow the FinReason organizer schedule above
while the portal display is being updated.

The paper portal is separate from the competition submission path. Task 1 does
not require pre-registration, organizer approval, an access code, or an account.
Teams upload predictions through the verified development and test pages linked
from the participant hub. Development immediately returns two scores, a receipt,
and a current rank, and the team's best eligible result appears on the public
leaderboard. Test shows format feedback and an acceptance receipt. Task 3 follows the same shape, with
its practice route open now and its development and test routes opening with
their datasets. Task 2 solution materials and submission routes will be
published after organizer testing. Competition submissions close on 15 October;
the later Working Notes deadline does not extend the competition cutoff.

The organizers review the Working Notes and decide paper acceptance. Selected
accepted papers may be included in the conference proceedings, subject to
conference publication, camera-ready, registration, and presentation
requirements. Submission, ranking, or a certificate does not guarantee paper
acceptance or proceedings publication.

## Certificates and prizes

FinReason does not offer cash prizes. Registration support is not confirmed at
this time, and the organizers do not promise registration funding. A team will
receive a participation certificate if it completes both:

1. at least one valid final solution submission under the applicable task
   rules by 15 October 2026, 23:59 Anywhere on Earth; and
2. a Working Notes submission through CyberChair SC03 by 23 October 2026,
   23:59 Anywhere on Earth.

Winning teams will receive a winner certificate. Additional award categories
remain provisional until published. Certificates do not imply challenge-paper
acceptance or publication.

## Direct participation

Task 1 and the Task 3 practice phase are open for direct participation. Choose
one consistent Team Name and follow the step-by-step submission guide for
[Task 1](https://the-finai.github.io/IEEE-bigdata-cup/task1/submit/#how-to-submit)
or [Task 3](https://the-finai.github.io/IEEE-bigdata-cup/task3/submit/#how-to-submit).
In Task 1, development requires Team Name and a canonical ZIP. Test requires the same Team
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
| Task 1 organizer baseline scores | Lite Baseline, Standard Baseline, and Advanced Baseline ranked on the 580-question development set |
| [Task 2 training data](https://the-finai.github.io/IEEE-bigdata-cup/task2/) | Live: prices, news, and filings (Parquet) |
| [Task 3 starter kit, validator, and scorer](finreason_task3/) | Live in this repository |
| Task 3 practice phase (332 public FinMR cases) | Live — scored on upload, never ranked |
| Task 3 development and test datasets | Coming soon |
| Task 2 starter kit and baselines | Coming soon |
| Participant support | [zhuohan.xie@mbzuai.ac.ae](mailto:zhuohan.xie@mbzuai.ac.ae) |
| Terms of Participation | Live |
| Privacy Notice | Live |
| [Challenge paper submission](https://wi-lab.com/cyberchair/2026/bigdata26/scripts/submit.php?subarea=SC03) | Open |
| [Task 1 participant hub](https://the-finai.github.io/IEEE-bigdata-cup/task1/) | Public downloads live; direct-upload status published here |
| [Task 1 leaderboard](https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/) | Development only |
| [Task 3 participant hub](https://the-finai.github.io/IEEE-bigdata-cup/task3/) | Live; per-phase status published here |
| [Task 3 step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task3/submit/#how-to-submit) | Live |
| [Task 3 leaderboard](https://the-finai.github.io/IEEE-bigdata-cup/task3/leaderboard/) | Opens with the development dataset |

The participant hub publishes only organizer-verified competition-platform and
submission links and records their current availability.

## Schedule

| Milestone | Date |
| --- | --- |
| Competition closes for Tasks 1, 2, and 3: final system submissions and required solution materials | **15 October 2026, 23:59 AoE** |
| Final competition results | **16 October 2026**, after 12:00 UTC (16:00 Abu Dhabi time) |
| Team Working Notes through CyberChair SC03, up to 10 pages including references | **23 October 2026, 23:59 AoE** |
| Paper review feedback and organizer acceptance decisions | **6 November 2026** |
| Camera-ready papers | **13 November 2026, 23:59 AoE** |
| Organizer overview due to the conference | **20 November 2026** |
| Winning teams announced (awards) | **25 November 2026** |
| IEEE Big Data 2026, Phoenix, Arizona | **14–17 December 2026** |

AoE means Anywhere on Earth (UTC−12). The 15 October competition cutoff passes
at 12:00 UTC on 16 October, so final results will not be released before that
time. Task 2 and Task 3 development/test release dates will be published after
organizer testing; their final competition cutoff remains 15 October.

## Repository scope

This repository contains the organizer-maintained FinReason Cup website and the
released Task 1 and Task 3 participant data and tools. Task 2 participant
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
- each team's best eligible development result is ranked alongside Lite Baseline,
  Standard Baseline, and Advanced Baseline on the same 580 development questions;
  Financial Rules remains a reference in the expandable score guide; baseline rows are marked
  as references, while participant-only team ranks continue to match submission receipts;
- the separate test workspace accepts the 928-row test predictions ZIP and
  requires Team Name and Contact Email, then shows public-format validation feedback
  and an acceptance receipt when accepted, with no score, rank, answer-correctness
  feedback, or score-derived signal;
- the leaderboard hub has Dev and [Test submission status](https://the-finai.github.io/IEEE-bigdata-cup/task1/leaderboard/test/) tabs;
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

### Task 3 participant hub

The public `/task3/` route follows the same boundary with three phases instead
of two:

- **practice** runs on the 332 public FinMR cases whose answers ship with the
  starter kit. Upload `predictions.jsonl` — or a ZIP containing exactly one
  root-level file of that name — with a Team Name only, and the scoring
  workspace returns accuracy, the structural, extraction, and calculation error
  rates, and a receipt. Because the answers are public, practice results are
  never ranked and never reach the leaderboard: a practice ranking would measure
  who read them;
- **development** runs on organizer-held gold and is the phase that ranks. It
  additionally requires a Contact Email, which is stored only as a salted hash;
- **test** runs on a separate receipt-only workspace that returns an acceptance
  receipt and nothing else — no score, rank, diagnostic, or score-derived
  signal. That workspace serves no scoring or leaderboard route at all, and
  refuses to start if it is configured in a way that could return one.

Each phase reports its own status on the hub, and a phase whose dataset does not
exist reports itself as pending rather than accepting work it cannot score. The
[step-by-step submission guide](https://the-finai.github.io/IEEE-bigdata-cup/task3/submit/#how-to-submit)
covers preparing the public cases, the three required JSONL fields, and the
validator and local scorer in `finreason_task3/`.

The public JSON feed uses the frozen aggregate-only development leaderboard
contract `finreason.task3.development-leaderboard/1.0.0`. It publishes only Team
Name, rank, the four aggregate rates as two-decimal percentages, and acceptance
time. Rows are ordered by accuracy descending, then by calculation, extraction,
and structural error rates ascending, then by Team Name.

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

Last reviewed: 7 September 2026.
