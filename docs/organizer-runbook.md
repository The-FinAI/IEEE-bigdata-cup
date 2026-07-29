# FinReason Cup organizer runbook

> **Status:** public organizer working procedure, not the participant rulebook.
> Participant-facing dates, rules, links, and metrics are official only after
> they pass the release gates below and appear consistently on the competition
> website and in the tagged starter kit.

## Operating model

The default Codex/organizer lane should complete common organizer work directly
from this runbook. It does not need to be divided into named roles before work
starts.

- **Task 1 scientific decisions are fixed with Zhuohan.**
- Task 2, Task 3, publicity/outreach, reviewer coordination, and baseline
  implementation are the only self-claimable workstreams. See
  [claimable-work.md](./claimable-work.md).
- A self-claim is an execution commitment, not authority to publish a rule,
  release private data, or announce a result.
- Everything else in this runbook is common organizer work: take the next
  unblocked gate item, implement it, attach evidence, and continue.
- No gate passes on a verbal confirmation. The evidence must be a reviewed
  file, test result, tagged artifact, frozen snapshot, or stable public link.

## Current release baseline

Snapshot date: **2026-07-29**.

The public website is available, but registration, the participant starter kit,
and the submission platform are still marked `coming soon`. In the starter-kit
repository:

```bash
python3 -m unittest discover -s tests
python3 scripts/release_readiness.py
```

The contract tests currently pass, while the release-readiness command reports
`NOT READY: 34 unresolved release markers found.` Passing structural tests does
not make the competition ready for participants.

## Release gates

Gates are sequential. Preparation for a later gate may happen early, but no
participant-facing launch or result announcement may skip its preceding gate.

| Gate | Required work | Exit evidence |
|---|---|---|
| **G0 — Pre-launch audit** | Run site tests and starter-kit tests; run the release-readiness check; inventory every provisional statement, missing asset, and public/private boundary. | A current blocker list with no unexplained discrepancy between the website and starter kit. |
| **G1 — Task contracts frozen** | Freeze the input, output, evidence, metric, tie-break, invalid-submission, and information-availability semantics for all three tasks. Provide one genuine reviewed public fixture per task. | Versioned task specifications and schemas; valid and invalid examples; task-owner approval recorded in the release evidence. |
| **G2 — Shared competition contract frozen** | Decide eligibility, team size, schedule and timezone, platform, submission limits, external-resource rules, public/private evaluation, finalist obligations, awards, support, replacement, withdrawal, and appeal handling. | One internally approved participant rulebook with all links and dates resolved; no conflicting wording across public artifacts. |
| **G3 — Release candidate proven** | Package licensed data, manifests, checksums, validators, official scorers, minimal baselines, clean-environment instructions, and the organizer-only hidden-evaluation handoff. Run an end-to-end dummy-team rehearsal. | Release gate returns zero unresolved markers; all clean-environment commands pass; two organizers approve the exact tag and archive checksum. |
| **G4 — Registration and launch** | Publish the stable registration, starter-kit, data, submission, rules, schedule, support, and privacy links. Replace all `coming soon` placeholders. Release only the publicity material that matches the frozen contract. | A participant can register, download, run a baseline, validate, submit, receive a score/error, and find support by following public links only. |
| **G5 — Live competition operations** | Triage support, update the FAQ and changelog, monitor submissions and scoring, enforce limits, record exceptions, issue reminders, and protect hidden evaluation material. | Timestamped incident/decision log; reproducible platform state; every public change has a version and participant notice. |
| **G6 — Submission freeze and final evaluation** | Freeze accepted submissions and the public leaderboard; export immutable inputs; run private evaluation and reproducibility checks; resolve invalid or duplicate submissions under the published rules. | Signed-off frozen leaderboard snapshot, scorer version, input hashes, run logs, and finalist eligibility record. |
| **G7 — Reports, review, awards, and event** | Apply the confirmed report requirements; perform technical review and organizer validation; check conflicts, citations, format, and reproducibility; finalize awards and presentation logistics. | Decision record for every eligible finalist; final ranking approval; winner notice, report status, and presentation schedule all agree. |
| **G8 — Archive** | Tag public code and data, preserve rules and scorers, publish results and permitted reports, archive checksums and overview material, remove stale provisional instructions, and document how results can be reproduced. | Durable public archive plus organizer-only preservation record for hidden assets, decisions, and evaluation evidence. |

## The 34 current release blockers

These blocker IDs mirror the current `TODO` markers reported by
`scripts/release_readiness.py` in the starter-kit repository. When the source
changes, rerun the command and update this inventory rather than treating the
count as permanent.

### Release status and data

1. **B01 — Draft status:** replace the starter-kit statement that real reviewed
   samples and task-owner decisions are still missing.
2. **B02 — Data licenses:** freeze licenses and redistribution terms.
3. **B03 — Data manifest:** publish real filenames, split sizes, and checksums.
4. **B04 — Task 2 data contract:** freeze time windows, asset universe, and
   information-availability rules.
5. **B05 — Task 3 legal/package review:** approve SEC/XBRL redistribution and
   the filing packaging method.
6. **B06 — Distribution:** publish the final download location and release
   date.

### Evaluation decisions

7. **B07 — Task 1 numeric handling:** freeze numerical tolerance and answer
   normalization.
8. **B08 — Task 1 trace evaluation:** freeze the ChainEval version and trace
   schema.
9. **B09 — Task 1 ranking:** freeze the ranking formula and tie-break.
10. **B10 — Task 2 runtime:** choose batch simulation, container evaluation, or
    live-agent evaluation.
11. **B11 — Task 2 ranking:** choose the official primary ranking metric.
12. **B12 — Task 2 finance semantics:** define return, annualization, risk-free
    rate, costs, and slippage.
13. **B13 — Task 2 validity and leaderboard:** define invalid-action penalties
    and provisional-versus-final leaderboard policy.
14. **B14 — Task 3 output contract:** freeze the output and evidence schema.
15. **B15 — Task 3 numeric semantics:** define unit, scale, sign, period, and
    tolerance handling.
16. **B16 — Task 3 ranking:** freeze the primary metric and tie-break.

### Participant and submission policy

17. **B17 — Participation:** decide team-size and eligibility rules.
18. **B18 — Late entry:** decide the late-LOI policy.
19. **B19 — Submission access:** publish platform and submission URLs.
20. **B20 — Submission limits:** set daily and total limits.
21. **B21 — Submission lifecycle:** define replacement, withdrawal, and
    failed-upload handling.
22. **B22 — External resources:** define permitted data, models, APIs, tools,
    and network access.
23. **B23 — Leaderboards:** freeze public/private split and tie-break policy.
24. **B24 — Package rules:** define file-size limits, archive layout, and
    naming.
25. **B25 — Finalists:** freeze report requirements and award eligibility.

### Task schemas and examples

26. **B26 — Task 1 answer/trace types:** replace permissive draft types with
    the reviewed contract.
27. **B27 — Task 1 input metadata:** freeze organizer-approved FinChain metadata
    fields after reviewing the real export.
28. **B28 — Task 1 submission schema:** freeze answer normalization and the
    ChainEval-compatible reasoning trace.
29. **B29 — Task 2 core contract:** freeze asset universe, timing, position
    sizing, trading, and related task semantics.
30. **B30 — Task 2 action schema:** decide whether position size is a weight or
    quantity and define `HOLD`/`CLOSE` pair semantics.
31. **B31 — Task 2 environment schema:** replace placeholders with reviewed
    physical files and freeze frequency, timezone, and information timing.
32. **B32 — Task 3 core contract:** freeze filing-bundle layout, taxonomy,
    period, unit, and related task semantics.
33. **B33 — Task 3 input schema:** freeze the reporting-period object and
    approved filing metadata.
34. **B34 — Task 3 submission schema:** freeze value, unit, status, and evidence
    semantics against a reviewed compatible case.

## Default organizer execution loop

1. Run the site and starter-kit checks and identify the earliest failing gate.
2. Select the smallest unblocked common-work item or an acknowledged
   self-claimed workstream.
3. Change the canonical source, not a copied description.
4. Add or update a test whenever the contract can be checked mechanically.
5. Run the narrow test, then the full relevant suite and release-readiness
   check.
6. Record evidence in the pull request or decision log: decision, artifact,
   command/result, reviewer, and affected public wording.
7. Update every public surface that repeats the changed fact.
8. Advance the gate only after its exit evidence exists.

## Definition of Done

A gate item is done only when all applicable conditions below are true.

- The decision is explicit; `TODO`, placeholder, permissive draft, and
  `coming soon` language are removed where the decision is now official.
- Specification, schema, example, validator, scorer, baseline, and website
  wording agree at the same tagged version.
- At least one valid and one intentionally invalid case exercise the contract.
- Commands work from a clean environment without organizer credentials or
  undeclared local files.
- Data has a documented source, license, manifest, split size, and checksum.
- Scoring is deterministic and reports validation failures separately from
  scores.
- Private labels, future windows, credentials, participant data, reviewer
  identities/contact details, and hidden evaluation instructions are absent
  from public artifacts.
- A reproducible evidence link or log exists, and required scientific or
  release approval has been recorded.
- Downstream participant instructions and launch material have been updated or
  explicitly held back until their gate opens.

## Change and incident control

- Participant-visible semantic changes require a version, changelog entry, and
  effective time. Never silently replace a released scorer, dataset, or rule.
- Security, leakage, scoring, and data-integrity incidents pause the affected
  task. Preserve evidence before applying a fix.
- Exceptions must cite the published rule or document the approved amendment;
  they must not be handled only in private messages.
- Hidden evaluation assets, reviewer personal data, conflict declarations, and
  credentials remain in organizer-controlled storage. Public documentation may
  describe the process, but must not contain those records.
