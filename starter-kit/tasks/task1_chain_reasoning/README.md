# Task 1 — Verifiable Financial Chain Reasoning

Given a natural-language financial problem generated from a parameterized
symbolic template, a system returns a final answer and a structured reasoning
trace.

The draft files in `schemas/` freeze only the outer envelope:

- `input.schema.json`: `instance_id` and `problem`
- `submission.schema.json`: `instance_id`, `final_answer`, and
  `reasoning_trace`

TODO: replace the permissive answer and trace types with the actual
FinChain/ChainEval contract before adding examples.
