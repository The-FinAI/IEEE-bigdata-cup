# Draft evaluation protocol

## Task 1 — Verifiable Financial Chain Reasoning

Confirmed metric direction:

- final-answer accuracy
- ChainEval for step-level reasoning-trace alignment

Unresolved:

- TODO: numerical tolerance and normalization
- TODO: ChainEval version and trace schema
- TODO: ranking formula and tie-break

## Task 2 — Market-Neutral Hedging

Confirmed metric direction:

- Sharpe ratio
- cumulative return
- maximum drawdown
- validity checks for asset pairs, actions, and future information

Unresolved:

- TODO: batch simulation versus container or live-agent evaluation
- TODO: official primary ranking metric
- TODO: return definition, annualization, risk-free rate, costs, and slippage
- TODO: invalid-action penalty and provisional-versus-final leaderboard policy

## Task 3 — Financial Audit Verification

Confirmed metric direction:

- accuracy
- structural error rate
- extraction error rate
- calculation error rate

Unresolved:

- TODO: exact output and evidence schema
- TODO: unit, scale, sign, period, and tolerance handling
- TODO: primary ranking metric and tie-break

Official scorers must be deterministic, versioned, and tested against one
public gold fixture before the participant release.
