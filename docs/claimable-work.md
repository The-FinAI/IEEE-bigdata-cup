# FinReason Cup self-claim work

> **Purpose:** allow contributors to opt into the few workstreams that benefit
> from a clear scientific or operational owner. This is not a full organizer
> assignment table.

Common organizer work is intentionally not listed here. It proceeds directly
through [the organizer runbook](./organizer-runbook.md) without waiting for
someone to claim a role.

## Fixed and claimable scope

- **Task 1 scientific ownership is fixed with Zhuohan and is not claimable.**
- The only claimable workstreams are:
  1. Task 2 scientific/task contract
  2. Task 3 scientific/task contract
  3. publicity and outreach
  4. reviewer coordination
  5. baseline implementation, claimable separately by task
- Claiming a workstream does not authorize a public announcement, rule change,
  release of private data, reviewer invitation, or final-result decision.

## How to self-claim

1. Open a GitHub issue titled `[CLAIM] <claim ID> — <workstream>`.
2. State the GitHub handle that will own the claim, the exact included
   deliverables, an expected first-checkpoint date, and any prerequisite that
   is still missing.
3. Link the issue in the claim register below by pull request. Change only the
   selected row from `Open` to `Claimed`; do not assign another person.
4. A maintainer acknowledges the claim after checking that it does not
   duplicate active work and that any private-data access is appropriate.
5. Post evidence at each checkpoint. If there is no update for seven days after
   the promised checkpoint, the maintainer may return the item to `Open`.
6. To release a claim, comment on the issue with the current artifact state and
   blockers, then return the register row to `Open`.

The first **acknowledged**, not merely posted, claim controls the workstream.
Two people may collaborate under one claim, but there must be one integration
contact and one Definition-of-Done checklist.

## Claim register

Do not pre-fill names. Contributors add their own identity through the claim
process.

| Claim ID | Workstream | Can be split? | Status | Claim issue |
|---|---|---:|---|---|
| `C-T2` | Task 2 — Market-Neutral Hedging | No; one integration claim | Open | — |
| `C-T3` | Task 3 — Financial Audit Verification | No; one integration claim | Open | — |
| `C-PUB` | Publicity and outreach | No; contributors may collaborate under one claim | Open | — |
| `C-REV` | Reviewer coordination | No; contributors may collaborate under one claim | Open | — |
| `C-B1` | Task 1 baseline implementation | No | Open | — |
| `C-B2` | Task 2 baseline implementation | No | Open | — |
| `C-B3` | Task 3 baseline implementation | No | Open | — |

## Claim definitions and completion criteria

### `C-T2` — Task 2 scientific/task contract

Scope:

- close organizer-runbook blockers `B04`, `B10`–`B13`, and `B29`–`B31`;
- freeze the data window, asset universe, timing, action, position, cost,
  slippage, validity, evaluation, ranking, and tie-break semantics;
- supply or approve one legally releasable genuine public fixture, its
  reference output, one valid submission, and one intentionally invalid
  submission;
- review the Task 2 specification, schemas, validator behavior, scorer tests,
  FAQ, and overview wording;
- document the organizer-only hidden-evaluation handoff without publishing
  hidden data.

Definition of Done:

- no Task 2 release marker remains;
- every semantic decision appears consistently in prose and machine-readable
  contracts;
- public examples pass the validator and official scorer as intended;
- future information is mechanically excluded or detected;
- a clean-environment end-to-end run is reproducible;
- the exact release tag is scientifically approved.

### `C-T3` — Task 3 scientific/task contract

Scope:

- close organizer-runbook blockers `B05`, `B14`–`B16`, and `B32`–`B34`;
- freeze the filing bundle, taxonomy, reporting period, unit, scale, sign,
  status, evidence, tolerance, evaluation, ranking, and tie-break semantics;
- supply or approve one legally releasable genuine SEC/XBRL case, its reference
  output, one valid submission, and one intentionally invalid submission;
- review the Task 3 specification, schemas, validator behavior, scorer tests,
  FAQ, and overview wording;
- document the organizer-only hidden-evaluation handoff without publishing
  hidden filings or labels.

Definition of Done:

- no Task 3 release marker remains;
- the public case has completed legal and redistribution review;
- prose and schemas represent the same period, unit, value, status, and
  evidence rules;
- public examples pass the validator and official scorer as intended;
- a clean-environment end-to-end run is reproducible;
- the exact release tag is scientifically approved.

### `C-PUB` — Publicity and outreach

Scope:

- prepare a single source sheet for the official name, one-sentence
  description, task summaries, eligibility, dates and timezone, registration,
  starter-kit, submission, support, report, and event links;
- prepare launch, reminder, deadline, results, and correction templates for the
  website and approved communication channels;
- maintain a publication calendar and a record of what was published, when,
  where, and from which frozen source;
- verify every draft against the current website, rulebook, and release tag.

Definition of Done:

- all copy uses the same dates, task names, links, eligibility rules, and
  claims;
- no launch copy is published before Gate G4 and no result copy before Gate G7;
- each message has a target audience, channel, approval state, publication
  time, and canonical-source link;
- corrections have a prepared process and never silently overwrite a material
  rule change;
- no participant or reviewer personal data appears in the public repository.

### `C-REV` — Reviewer coordination

Scope:

- prepare the reviewer criteria, conflict-of-interest policy, invitation and
  reminder templates, workload model, review form, citation/format check, and
  organizer validation checklist;
- maintain the candidate pool, contact details, conflicts, invitations,
  responses, assignments, and review status in organizer-only storage;
- propose assignments only after the report requirement, eligible report
  count, and review timeline are confirmed;
- track overdue or conflicted reviews and preserve an auditable decision trail.

Definition of Done:

- the public process explains review purpose and criteria without exposing
  reviewer identities, contact details, conflicts, or assignments;
- every eligible report has the required independent technical review and
  organizer validation, with conflicts checked before assignment;
- workload and deadlines are feasible for the confirmed report count;
- missing, late, or conflicting reviews have a documented resolution;
- final decisions link to complete review and validation evidence.

Do not send reviewer invitations merely because this claim has been accepted.
Invitation begins only after the report mechanism and expected review volume
are confirmed.

### `C-B1`, `C-B2`, `C-B3` — Baseline implementation

Each baseline is claimed and completed independently. Task 1 baseline semantics
require Zhuohan's approval; Task 2 and Task 3 baselines require their respective
scientific/task-contract approval.

Scope for each task:

- implement the smallest useful no-key baseline against the frozen public
  fixture and contract;
- provide deterministic setup and run commands, pinned dependencies, expected
  output shape, runtime/resource notes, and a valid sample submission;
- add tests that run the baseline, validate its output, and score it with the
  released scorer;
- keep the baseline intentionally simple and describe its limitations without
  presenting it as a competitive target.

Definition of Done:

- the baseline requires no secret, paid API, private data, or undeclared
  network access;
- it runs from a clean environment using only documented commands;
- repeated runs under the same environment produce equivalent submissions and
  scores;
- its output passes the official structural and semantic validator;
- the released scorer returns the documented smoke-test result;
- CI or an equivalent recorded clean-environment run covers the full path;
- the task's scientific owner and the release reviewer approve the exact tag.

## Work that is not claimable

The following remains common organizer execution and must not become an
assignment-planning exercise:

- running readiness checks and closing shared documentation inconsistencies;
- drafting shared rules for approval;
- website and starter-kit integration;
- manifests, checksums, release packaging, CI, and clean-environment QA;
- registration and submission-path setup;
- dummy-team rehearsal and live operational checks;
- support log, FAQ integration, changelog, and incident records;
- leaderboard freeze, final-evaluation evidence, release tagging, and archive
  preparation.

Anyone performing common work should follow the next failing gate in the
organizer runbook, produce reviewable evidence, and continue without waiting
for a named role assignment.
