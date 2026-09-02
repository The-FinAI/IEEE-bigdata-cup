# Task 1 organizer baseline harness

This harness materializes complete Task 1 baseline artifacts without loading
private references or changing the evaluator. It has no model SDK dependency.
Provider adapters consume deterministic request JSONL and return response
envelopes; the harness remains the only component that creates participant
prediction rows.

## Baseline profiles

- `FR-T1-B1-RULE-v1` is the existing gold-free exact-prompt rule baseline.
- `FR-T1-B2-OPEN8B-STRUCT-v1` is a pinned 7–9B open instruct model with
  structured zero-shot inference and greedy decoding. It returns the final
  answer only.
- `FR-T1-B3-OPEN32B-PAL-v1` is a pinned 30–35B open instruct or reasoning
  model with deterministic retrieval from the public training questions and
  targets, greedy decoding, and a bounded exact `Decimal`/`Fraction` program
  executor. It must cover every published checkpoint in public order.

The concrete B2/B3 model IDs and immutable model revisions are intentionally
run-manifest fields rather than hard-coded defaults. Pin both after empirical
runner selection.

## Materialize B1

```bash
python3 scripts/task1_cli.py baseline-b1-materialize \
  --questions public/task1/data/development/leaderboard_questions.jsonl \
  --output-dir artifacts/b1-development \
  --implementation-revision COMMIT_SHA
```

The output directory must not exist. A successful run creates exactly these
side-by-side artifacts:

- `predictions.jsonl`, canonical and sorted by `case_id`;
- `submission.zip`, containing only `predictions.jsonl`;
- `diagnostics.jsonl`, empty for deterministic B1 materialization;
- `method-card.json`, with method, source, count, and artifact hashes.

## Create the canonical run manifest

Request generation and materialization consume the same canonical
`run-manifest.json`. It is one compact JSON object followed by one LF:

```json
{"generation_settings":{"do_sample":false,"max_new_tokens":512,"num_beams":1,"provider_options":{},"response_format":"prompted_json_object","seed":7,"stop":[],"strategy":"greedy","temperature":0,"top_k":0,"top_p":1},"method_id":"FR-T1-B2-OPEN8B-STRUCT-v1","model_id":"MODEL_ID","model_revision":"0123456789abcdef0123456789abcdef01234567","provider":"PROVIDER_OR_RUNTIME","runner_revision":"89abcdef0123456789abcdef0123456789abcdef","schema_version":"finreason.task1.baseline-run-manifest/1.0.0"}
```

`model_revision` and `runner_revision` must be immutable 40-to-64-character
lowercase hexadecimal content revisions, or a `sha256:` digest. The generation
object has exact required fields and records resolved greedy settings plus all
additional backend options under `provider_options`. It must not contain a
credential, authorization header, signed URL, or secret endpoint parameter.
The SHA-256 of the exact canonical manifest bytes is bound into every request,
response envelope, retained manifest artifact, and method card.

## Build provider-neutral B2/B3 requests

B2 requests contain only each complete public question and the final-answer
response contract:

```bash
python3 scripts/task1_cli.py baseline-llm-requests \
  --profile b2 \
  --questions public/task1/data/development/leaderboard_questions.jsonl \
  --run-manifest artifacts/b2-run-manifest.json \
  --output artifacts/b2-requests.jsonl
```

B3 requires the frozen public training questions and participant-shaped public
training targets. Retrieval uses token-multiset Jaccard similarity, masks
numeric tokens, and breaks ties by `case_id`:

```bash
python3 scripts/task1_cli.py baseline-llm-requests \
  --profile b3 \
  --questions public/task1/data/development/leaderboard_questions.jsonl \
  --run-manifest artifacts/b3-run-manifest.json \
  --train-questions public/task1/data/development/train_questions.jsonl \
  --train-targets public/task1/data/development/train_targets.jsonl \
  --retrieval-k 3 \
  --output artifacts/b3-requests.jsonl
```

Every request has a hash-bound `request_id`, the exact public question hash, the
run-manifest hash, provider-neutral messages, a response contract, and any
retrieved public case IDs. Request generation is complete-bundle only. It has
no partial-submission or `max-items` mode.

## Provider adapter boundary

An adapter implements the small `StructuredBaselineProvider` protocol in
`finreason_task1.baseline_harness`. It may use any local runtime or API, but it
must apply every setting in the bound run manifest and preserve the model output
without adding credentials, headers, endpoint query strings, or private data.

For audit replay, place the unmodified model text in the envelope's `response`
string. The outer response JSONL row is:

```json
{
  "schema_version": "finreason.task1.baseline-response/2.0.0",
  "method_id": "FR-T1-B2-OPEN8B-STRUCT-v1",
  "request_id": "frreq_...",
  "case_id": "t1_...",
  "run_manifest_sha256": "...",
  "response": "{\"final_answer\":{\"value\":\"12.34\"}}"
}
```

B2 model output has exactly one field:

```json
{"final_answer":{"value":"12.34"}}
```

`final_answer` may be `null`. The harness always emits `steps: []` for B2 and
injects the schema version, dataset version, and case ID from the validated
question.

B3 arithmetic output uses a bounded straight-line exact program:

```json
{
  "kind": "pal",
  "instructions": [
    {"id": "v1", "op": "literal", "value": "127"},
    {"id": "v2", "op": "literal", "value": "55"},
    {"id": "v3", "op": "div", "args": ["v1", "v2"]}
  ],
  "final_output": {"value_ref": "v3"},
  "slot_outputs": [
    {"slot_id": "trace_1", "value_ref": "v3"}
  ]
}
```

Supported operations are `literal`, `add`, `sub`, `mul`, `div`, `neg`, `abs`,
`min`, `max`, and bounded integer `pow_int`. References may point only to prior
instructions. The executor permits at most 96 instructions, uses exact
arithmetic, and applies the public result specification only when rendering the
final answer and checkpoints.

B3 routes output schemas consistently:

| Published output schema | Required response |
| --- | --- |
| Final answer and every checkpoint are enum | `kind: prediction` with exact `final_answer` and `slot_values` |
| Any final answer or checkpoint is decimal | `kind: pal` |

For `kind: pal`, `final_output` and every item in ordered `slot_outputs` use
`{"value_ref":"v..."}` for a decimal output and `{"value":"enum_token"}`
for an enum output. This typed binding supports mixed decimal/enum questions
without permitting any decimal value to bypass the exact executor. A direct
prediction for a numeric or mixed case fails closed to an abstention.

The harness never extracts JSON from Markdown, finds numbers with a regular
expression, coerces a value, selects one duplicate, fills a missing checkpoint,
or retries invalid content. An invalid or missing response produces one valid
B0 abstention for that case and one sanitized diagnostic outside the submission
ZIP.

## Materialize B2 or B3

```bash
python3 scripts/task1_cli.py baseline-llm-materialize \
  --profile b2 \
  --questions public/task1/data/development/leaderboard_questions.jsonl \
  --run-manifest artifacts/b2-run-manifest.json \
  --requests artifacts/b2-requests.jsonl \
  --responses artifacts/b2-responses.jsonl \
  --output-dir artifacts/b2-development
```

For B3, materialization also requires the same authoritative public training
inputs and retrieval count used for request generation:

```bash
python3 scripts/task1_cli.py baseline-llm-materialize \
  --profile b3 \
  --questions public/task1/data/development/leaderboard_questions.jsonl \
  --run-manifest artifacts/b3-run-manifest.json \
  --requests artifacts/b3-requests.jsonl \
  --responses artifacts/b3-responses.jsonl \
  --train-questions public/task1/data/development/train_questions.jsonl \
  --train-targets public/task1/data/development/train_targets.jsonl \
  --retrieval-k 3 \
  --output-dir artifacts/b3-development
```

Before reading responses, the materializer rebuilds the complete canonical
request JSONL from the exact question, manifest, and, for B3, training bytes and
retrieval count. The supplied request file must match that rebuild byte for
byte. It then parses each response independently, validates every constructed
prediction against the frozen public contract, validates the complete bundle,
builds the deterministic ZIP, and re-admits that ZIP. The method card records
hashes of the exact question, manifest, request, and response bytes; B3 cards
also record both authoritative public training hashes. The output retains the
canonical manifest as `run-manifest.json`. It does not include raw model output,
secrets, scores, or private references.

Generated B2/B3 responses, predictions, diagnostics, method cards, and ZIPs are
run artifacts. Do not add them to `public/task1/data` without a separately
authorized release update. Test outputs must not be published before official
results publication.

The current branch must not be merged or published until the Task 1 data and
release owner confirms the exact new and changed license scope recorded in
`public/task1/RIGHTS_AND_PROVENANCE.md`. The existing attestation was not changed
by this implementation work.
