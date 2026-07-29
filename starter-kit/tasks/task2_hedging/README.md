# Task 2 — Market-Neutral Hedging

Given a market environment, a system selects an ordered asset pair and manages
a dollar-neutral position over time.

The proposal confirms four action labels:

- `LONG_SHORT`
- `SHORT_LONG`
- `HOLD`
- `CLOSE`

The batch CSV contract is provisional. If the final evaluation uses a
containerized or live agent, the same action object should be preserved behind
an `act(observation, state)` interface.

TODO: freeze the asset universe, information timing, position sizing, trading
costs, corporate actions, missing-day behavior, and evaluation mode.
