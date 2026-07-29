# FinReason Cup starter kit

> **Status: organizer draft — not a participant release.**

This repository freezes the first public interfaces for FinReason Cup without
inventing data, official rules, or evaluation details that the organizers have
not approved. It is intended to become the participant starter kit after each
task owner supplies a real, reviewed sample and the remaining `TODO` decisions
are resolved.

FinReason Cup evaluates three complementary capabilities:

1. **Verifiable Financial Chain Reasoning** — produce a final answer and a
   structured reasoning trace for a multi-step financial problem.
2. **Market-Neutral Hedging** — select an ordered asset pair and issue
   market-neutral actions over time.
3. **Financial Audit Verification** — extract and verify reported values using
   XBRL calculation networks and US-GAAP taxonomy relationships.

## What is included now

- draft input and submission schemas for all three tasks
- structural submission validators
- scorer interfaces that deliberately refuse to emit unofficial scores
- data, evaluation, and submission-policy decision records
- a release-readiness check that blocks publication while unresolved markers
  remain

No competition data, hidden labels, baseline predictions, leaderboard
credentials, or private evaluation artifacts are included.

## Draft validation commands

The validators check file structure only. Passing them does **not** mean that a
submission is eligible or correctly scored.

```bash
python3 -m validators.cli --task task1 --submission path/to/submission.jsonl
python3 -m validators.cli --task task2 --submission path/to/actions.csv
python3 -m validators.cli --task task3 --submission path/to/submission.jsonl
```

Run contract tests:

```bash
python3 -m unittest discover -s tests
```

Run the release gate:

```bash
python3 scripts/release_readiness.py
```

The release gate is expected to fail while this repository is an organizer
draft.

## Required next inputs from task owners

1. One genuine FinChain-derived Task 1 development instance, reference, and
   valid submission.
2. One Task 2 organizer-approved toy or public market window with a frozen time
   and action contract.
3. One legally reviewed Task 3 SEC/XBRL case, reference, and valid submission.
4. The official scorer definition and ranking formula for each task.
5. Confirmed data licenses, checksums, release URLs, platform links, schedule,
   and participant rules.

Private test exports must remain in organizer-only storage and must never be
added to this public kit.
