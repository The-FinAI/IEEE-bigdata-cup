# Task 2: one local pipeline, fourteen website snapshots

The sole website is https://the-finai.github.io/IEEE-bigdata-cup/task2/.
The Space `CarolynJiang/market-neutral-hedging-leaderboard` is an action/receipt
service only (despite its retained URL). It must not calculate or display CR.
The Dataset `CarolynJiang/Market-Neutral-Hedging-live-trading` holds only released
price/news Parquet files and `releases.json`. It must not hold actions or CR.

## Event contract (America/New_York, 2026)

| Events | Dates and times | Local work and public output |
| --- | --- | --- |
| 1 | Oct 14 09:30 | Collect prices/news, English summaries, publish Dataset; seal local baseline; website snapshot |
| 2–12 | Remaining releases on Oct 14–15 at 09:30, 10:30, 11:30, 12:30, 14:30, 15:30 | Same data publication; read immutable receipts, locally settle preceding round, update CR ranking |
| 13 | Oct 16 09:30 | Terminal valuation and last-round settlement; update website CR ranking; no data batch |
| 14 | Oct 16 10:30 | Final CR ranking and SVG curves after all 12 settlements; no data batch |

Exactly 14 single-occurrence native Codex tasks invoke `run_node.py --event N`.
No five-minute poller, cloud scorer, background GitHub crawler, or extra tasks.
The local machine, Codex app, credentials and network must be available at each
node. GitHub Pages publishes after its deployment finishes; a node time is the
job start, not a promise of zero-latency public availability.

## Local execution

Use the already configured local interpreter:
`/Users/Carolyn/Documents/Codex/2026-09-03/qin/work/parquet_venv/bin/python`.
Run `python task2_runtime/run_node.py --event 1 --check` for a non-mutating check.
The real command accepts only its specified event within 25 minutes of its start.
It never silently replays missed dates. Per-event publication is idempotent.

The OpenAI key is read only from the existing local file
`outputs/trading-private.env` outside this repository. Optional
`RECEIPT_API_URL=https://<verified-receipt-space>.hf.space` belongs in that same
local file once hosting is available. Do not place OpenAI credentials in Space
Secrets. HF and GitHub use their existing local authenticated sessions.

Private state, news evidence, baseline actions, and price audits remain under
`outputs/trading-local` (directory 0700, state/files 0600), outside Git history.
HF private `market-neutral-hedging-private-state` stores only inbox/control files
for the receipt service. Local CR never writes to its inbox; server writes use
parent-commit compare-and-swap to avoid lost submissions.

## Scoring and provenance

Use ten stocks NVDA, GOOG, META, MSFT, JPM, AMZN, AAPL, AMD, WMT, TSLA.
Each round permits one accepted submission for each unique team, no replacement;
Stock 1/Stock 2/Action are single choices and stocks differ. Server acceptance
timestamps enforce deadlines. Missing valid actions score F only after the
private receipt service and snapshot have been verified.

Half equity per leg, zero transaction costs, compound completed returns.
Entry is the action-deadline minute-bar proxy; exit is the next event proxy.
At 09:30 use that minute's open, otherwise the preceding minute's close. Require
exact bar timestamps, never a nearest future bar. These are simulation prices,
not brokerage fills. Missing prices block scoring rather than create zero CR.

The current Yahoo structured search adapter is capped and cannot reconstruct
the expanded 200-item page. Every news file explicitly labels coverage as a
partial retrieved sample. Zero retrieved articles is NOT proof of no news.
Each ticker has one factual English summary, validated to 30–50 cl100k_base
tokens. Baseline decisions use only that released data and are sealed locally
before the cutoff. Never retrospectively invent a missed baseline decision.

Public website snapshots allow only names, aggregate CR, service status, release
links, and event metadata. Stocks/actions, tokens, raw inboxes and keys never
enter GitHub. Curves are generated locally as SVG and released only at event 14
with all 12 verified settlements. Incomplete final settlement stays pending.

## Receipt Space deployment

`receipt_server.py`, `receipt.html`, `protocol.py`, and `Dockerfile` form the
minimal Docker service. No OpenAI library, summarizer, crawler or scorer is
installed in its image. Set only `STORE_REPO` (private receipt dataset) and a
write-scoped `HF_TOKEN` for that dataset. Initialize `inbox.json` privately with
schema `finreason.task2.receipts/1`, empty `teams` and `submissions`; `control.json`
contains published round IDs authorized locally. Verify `/health` before opening
submissions and setting the local API URL. Until HF permits Docker hosting, the
static Space is explicitly closed and does not issue receipts.
