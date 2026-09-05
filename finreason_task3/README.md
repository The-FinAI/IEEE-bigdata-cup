# FinReason Cup 2026 — Task 3: Financial Audit Verification

Read an SEC XBRL filing and report **two numbers**: the value the filing states
for a target concept, and the value its own calculation relationships imply.
This is targeted numeric-fact verification, not a full financial-statement audit.

> **Task 3 is method-agnostic. You do not need to train or fine-tune anything.**
> Prompting, agents, retrieval, symbolic reasoning, rule engines, fine-tuned
> models and hybrids are all welcome. You are scored on your predictions.

---

## 1. The task

Each case gives your system one long `query` string containing:

| section | content |
| --- | --- |
| instruction header | the task statement and the required JSON output format |
| `## Schema document` | the filing's XBRL schema |
| `## Presentation linkbase document` | how facts are laid out for display |
| `## Calculation linkbase document` | **parent/child sums with weights — the arithmetic** |
| `## Definition linkbase document` | dimensions, domains, hypercubes |
| `## Label linkbase document` | human-readable labels |
| `## Instance document` | **the reported facts, with contexts and periods** |
| `## US GAAP Taxonomy` | `[Concept Core]` and `[Concept Relations]` for the target |
| `Question1:` / `Question2:` | the two questions, then a trailing `Answer:` |

The two questions are always phrased like this:

```
Question1: What's the reported value of us-gaap:PaymentsToAcquirePropertyPlantAndEquipment
           in the Instance document for the period 2021-09-01 to 2021-11-30?
Question2: What's the actual value of us-gaap:PaymentsToAcquirePropertyPlantAndEquipment
           in the Instance document for the period 2021-09-01 to 2021-11-30,
           calculated based on the calculation relationship?
Answer:
```

So:

- **`extracted_value`** — find the fact for that concept and period in the
  **Instance document** and report it as filed.
- **`calculated_value`** — use the **Calculation linkbase**: find the concept's
  children and their weights, and compute what the value should be.

The gold answer for the case above:

```json
{"extracted_value": "-1284", "calculated_value": "1284"}
```

The filing reported `-1284`; the calculation relationships imply `1284`. The sign
is wrong — that is the audit finding.

### The three DQC rules

Every case is built around one flagged Data Quality Committee rule. What the gold
answers look like per rule:

| rule | cases | gold is a pure sign flip (`calculated = −extracted`) | `extracted_value` is `0` |
| --- | ---: | ---: | ---: |
| `DQC_US_0117` | 120 | 1 / 120 | 15 / 120 |
| `DQC_US_0015` | 110 | **110 / 110** | 0 / 110 |
| `DQC_US_0126` | 102 | 6 / 102 | 0 / 102 |

`DQC_US_0015` is the "negative values" rule and here it is entirely sign errors.
The other two are varied — the calculated value has to be derived from the
linkbase, not guessed from the sign. In `DQC_US_0117`, 15 cases have
`extracted_value = "0"`, meaning the concept is not reported at all.

In **all 332** public cases the two values disagree — these are DQC-flagged
filings by construction, so a system that always predicted agreement scores zero.

`dqc_id` is part of the input, so you may branch on it.

---

## 2. The data

```bash
cd finreason_task3
pip install -r requirements.txt
python scripts/prepare_public_dev.py
```

That downloads the public [FinMR](https://huggingface.co/datasets/TheFinAI/FinMR)
benchmark — the Financial Mathematical Reasoning task of
[FinAuditing](https://doi.org/10.1145/3805712.3808578) (SIGIR '26), alongside
FinSM (semantic matching) and FinRE (relationship extraction) — and writes:

| file | contents | size |
| --- | --- | --- |
| `data/public_dev.jsonl` | 332 cases **with** gold answers — score against this | ~36 MB |
| `data/public_dev_inputs.jsonl` | the same cases, **no** answers — feed this to your system | ~36 MB |
| `data/public_dev_manifest.json` | counts, DQC distribution, SHA-256 hashes | small |

To pin a dataset revision, or reuse a snapshot you already have:

```bash
python scripts/prepare_public_dev.py --revision <commit-sha>
python scripts/prepare_public_dev.py --input /path/to/local/snapshot
```

These 332 cases are your **development set** — use them for prompt engineering,
agent design, retrieval, few-shot selection, error analysis, and optionally
fine-tuning. They are **not** the leaderboard: FinMR is public and predates the
competition. The leaderboard runs on new, unreleased cases built the same way.
Test **inputs** will be released; the gold answers stay with the organizers.

---

## 3. Input and output format

### Input

`data/public_dev_inputs.jsonl`, one JSON object per line:

```json
{
  "id": "DEV_000000",
  "dqc_id": "DQC_US_0015",
  "query": "You are an auditor for XBRL filings. \n...\n##Schema document\n...\nQuestion1: ...\nQuestion2: ...\nAnswer:"
}
```

| field | type | notes |
| --- | --- | --- |
| `id` | string | unique. **The only key used to match your predictions.** |
| `dqc_id` | string | one of the three rules above |
| `query` | string | the full prompt described in §1 |

`data/public_dev.jsonl` is the same plus `answer` and `source`.

**These queries are long:** median ~115,000 characters (~29,000 tokens), max
~167,000 (~42,000 tokens). XBRL text runs about **2.2 characters per token**, so
estimating a token budget from character counts will overflow your model.

### Output

`predictions.jsonl`, one JSON object per line, one line per case:

```json
{"id": "DEV_000000", "extracted_value": "-1284", "calculated_value": "1284"}
{"id": "DEV_000001", "extracted_value": "-2,881,000", "calculated_value": "2,881,000"}
{"id": "DEV_000002", "extracted_value": "0", "calculated_value": "0"}
```

| field | type | required | notes |
| --- | --- | --- | --- |
| `id` | string | **yes** | must exactly match an input `id` |
| `extracted_value` | string | **yes** | non-empty |
| `calculated_value` | string | **yes** | non-empty |
| `raw_output` | string | no | your own audit trail; never affects your score |

- **Matching is by `id`, never by row order.** Write lines in any order.
- **Number formatting is free.** `"-1,284"`, `"-1284"` and `"(1,284)"` are read as
  the same number. Gold answers themselves mix these styles.
- **Emit `"0"` when your system cannot determine a value.** Never omit a line: a
  missing id invalidates the whole submission.
- You never submit reasoning, tool traces or explanations.

---

## 4. Quick start

```bash
cd finreason_task3
pip install -r requirements.txt
python scripts/prepare_public_dev.py

# a baseline that needs no GPU, no key and no network
python baselines/dummy_baseline.py \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl

python scripts/validate_submission.py \
    --predictions predictions.jsonl \
    --reference data/public_dev_inputs.jsonl

python scripts/score_submission.py \
    --predictions predictions.jsonl \
    --gold data/public_dev.jsonl \
    --judge deterministic
```

[`examples/run_public_evaluation.py`](examples/run_public_evaluation.py) is the
same loop in one self-contained file.

---

## 5. Running a model

The baselines are **starting points, not strong systems**. Pick the section that
matches what you want to run; each is standalone. All of them write the same
`predictions.jsonl`, so validation and scoring afterwards are identical.

| you want to run | use |
| --- | --- |
| nothing — just check the pipeline | `baselines/dummy_baseline.py` |
| **OpenAI / ChatGPT** | `baselines/llm_api_template.py` |
| **Claude** | `baselines/claude_api_template.py` |
| **DeepSeek** (and other OpenAI-compatible APIs) | `baselines/llm_api_template.py --base-url ...` |
| **a local model, fast** | `baselines/vllm_template.py` |
| **a local model, simple** | `baselines/hf_template.py` |

Common flags: `--limit N` (only the first N cases — **always start here**),
`--workers N` (parallel API calls), `--save-raw` (keep raw model text),
`--resume` (skip cases already in the output file).

### 5.1 OpenAI / ChatGPT

```bash
export OPENAI_API_KEY=sk-...

python baselines/llm_api_template.py \
    --model gpt-5-mini \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl \
    --workers 4 --limit 20
```

Drop `--limit` for the full 332.

**Reasoning models** (the `gpt-5` family) spend the output budget on hidden
reasoning *before* writing an answer, so too small a budget returns an empty
string. `--max-output-tokens` defaults to 8192 for this reason, and the template
warns when a case still runs out. Control the depth with `--reasoning`:

```bash
--reasoning off     # fastest and cheapest
--reasoning high    # slowest and most thorough
--reasoning auto    # default: send nothing, let the model decide
```

You do not need to know whether your model is a reasoning model. These endpoints
disagree about parameter names — the `gpt-5` family rejects `max_tokens` and
refuses a non-default `temperature` — so the template starts with the widely
supported form, adapts to the provider's own error, and prints what it settled
on.

Check the model's context window against the ~29k-token median. If it is
smaller, truncate deliberately with `--max-query-chars`; `--truncate-mode tail`
(the default) keeps the instruction header and the trailing questions.

Azure OpenAI and other gateways work through the same template — point
`--base-url` at your endpoint.

### 5.2 Claude

Anthropic's API is not OpenAI-shaped, so Claude has its own template.

```bash
pip install 'anthropic>=1.0'
export ANTHROPIC_API_KEY=sk-ant-...

python baselines/claude_api_template.py \
    --model claude-opus-5 \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl \
    --workers 4 --limit 20
```

Model ids: `claude-opus-5`, `claude-sonnet-5` (cheaper), `claude-haiku-4-5`
(cheapest).

- **Nothing is truncated.** The 1M-token context fits the longest query with room
  to spare.
- **Adaptive thinking is on by default**, because deriving a value from a
  calculation linkbase is multi-step reasoning. Thinking tokens count against
  `--max-tokens` (default 8192).
- Tune cost with `--effort low|medium|high|xhigh|max`. To disable thinking
  entirely use `--reasoning off` — but prefer lowering `--effort` first: the API
  rejects disabled thinking above effort `high` (the template clamps it and says
  so), and a thinking-off model is likelier to narrate instead of answering.

### 5.3 DeepSeek and other OpenAI-compatible APIs

Same template as OpenAI; only `--base-url` and `--model` change.

```bash
export DEEPSEEK_API_KEY=sk-...

python baselines/llm_api_template.py \
    --base-url https://api.deepseek.com/v1 \
    --api-key-env DEEPSEEK_API_KEY \
    --model deepseek-v4-pro \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl \
    --workers 4 --limit 20
```

`--api-key-env` names the environment variable holding the key, so a DeepSeek key
does not have to live in `OPENAI_API_KEY`. Model ids are `deepseek-v4-flash` and
`deepseek-v4-pro`; both reason by default. Ask any provider for its own current
list rather than trusting a name from elsewhere:

```bash
curl -s https://api.deepseek.com/v1/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

`--reasoning off` works here too. Providers spell "no reasoning" differently and
the spellings are mutually exclusive — `gpt-5` wants `minimal` and rejects
`none`, DeepSeek wants `none` and keeps reasoning under `minimal` — so the
template tries both and drops the parameter for models that know neither. One
flag, same effect everywhere.

The same pattern covers other compatible providers, for example Qwen via
DashScope (`https://dashscope.aliyuncs.com/compatible-mode/v1`).

### 5.4 A local model with vLLM

The faster local option — it batches all the cases.

```bash
pip install vllm    # needs a CUDA build matching your GPU

python baselines/vllm_template.py \
    --model Qwen/Qwen2.5-7B-Instruct \
    --max-model-len 32768 \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl
```

Set `--max-model-len` as high as your GPU memory allows; queries longer than the
served context are truncated automatically and the script reports how many. Add
`--tensor-parallel-size N` for multiple GPUs.

A vLLM **server** is OpenAI-compatible, so the API template drives it:

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct --max-model-len 32768 &

export OPENAI_API_KEY=dummy    # the server ignores it, the client needs it set
python baselines/llm_api_template.py \
    --base-url http://localhost:8000/v1 \
    --model Qwen/Qwen2.5-7B-Instruct \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl
```

### 5.5 A local model with Hugging Face transformers

Simpler, no vLLM install, but one case at a time.

```bash
pip install torch transformers accelerate

python baselines/hf_template.py \
    --model Qwen/Qwen2.5-7B-Instruct \
    --input data/public_dev_inputs.jsonl \
    --output predictions.jsonl \
    --resume
```

It reads the model's own context limit, reserves room for the output, truncates
what does not fit and reports how many cases were affected:

```
Model context limit: 32,768 tokens -> input budget 32,640
NOTE: 243/332 queries were truncated to 32,640 tokens (tail mode).
```

Override with `--max-input-tokens`. Use `--dtype bfloat16` on a modern GPU. Keep
`--resume`: predictions are appended as they are produced, so a run killed by a
wall-clock limit can pick up where it stopped.

### 5.6 Before a full run

A full pass is ~9.6M input tokens (332 cases × ~29k). Multiply by your provider's
input rate before launching it, and start with `--limit 20`. Both API templates
append as they go and support `--resume`, so an interrupted paid run is not
repurchased.

**Writing your own system:** only two things are required — read `id` and `query`
from the input JSONL, and write one line per case with `id`, `extracted_value`
and `calculated_value`. `parse_model_output()` in
`baselines/llm_api_template.py` is reusable if your system ends in an LLM call.

---

## 6. Evaluation

### The A/S/E/C rubric

Every case receives exactly one of four labels, decided in a strict order. The
first check that fails wins:

```
Is the answer a valid {extracted_value, calculated_value} object?
      │ no ─────────────────────────────────────────────► S   Structural error
      │ yes
      ▼
Is extracted_value numerically equal to gold?
      │ no ─────────────────────────────────────────────► E   Extraction error
      │ yes
      ▼
Is calculated_value numerically equal to gold?  (zero tolerance)
      │ no ─────────────────────────────────────────────► C   Calculation error
      │ yes
      ▼
                                                          A   Accurate
```

**The hierarchy short-circuits.** If `extracted_value` is wrong the case is `E`
even when `calculated_value` happens to be right — getting the reported value
right is the gate to everything else.

| gold | prediction | label | why |
| --- | --- | --- | --- |
| `{"extracted_value": "5,000", "calculated_value": "5,000"}` | `{"extracted_value": "5000", "calculated_value": "5000"}` | `A` | numeric meaning, not string form |
| `{"extracted_value": "123", "calculated_value": "456"}` | `{"extracted_value": "124", "calculated_value": "456"}` | `E` | extracted wrong |
| `{"extracted_value": "-1,286", "calculated_value": "1,286"}` | `{"extracted_value": "-1286", "calculated_value": "0"}` | `C` | extracted right, calculated wrong |
| `{"extracted_value": "100", "calculated_value": "200"}` | `{"wrong_key": "100", "calculate_value": "200"}` | `S` | not the required structure |

### Metrics

| metric | numerator | denominator |
| --- | --- | --- |
| Parsing Success Rate | cases that received a valid label | cases evaluated |
| **ACC** (headline) | cases labelled `A` | cases with a valid label |
| SER / EER / CER | cases labelled `S` / `E` / `C` | cases with a valid label |

### Running the evaluator

```bash
# official judge — an LLM, needs a key
export OPENAI_API_KEY=sk-...
python scripts/score_submission.py \
    --predictions predictions.jsonl \
    --gold data/public_dev.jsonl \
    --output-dir results/

# rule-based judge — free, instant, offline, NOT the official metric
python scripts/score_submission.py \
    --predictions predictions.jsonl \
    --gold data/public_dev.jsonl \
    --judge deterministic
```

Output:

```
FinReason Cup 2026 - Task 3 Evaluation
======================================

Submission: predictions

Total cases:             332
Successfully evaluated:  332

Parsing Success Rate:   100.00%
ACC:                      1.81%
Structural Error Rate:    0.00%
Extraction Error Rate:   49.10%
Calculation Error Rate:  49.10%

Per DQC rule:

  rule           n     ACC     SER     EER     CER
  DQC_US_0015  110   0.00%   0.00%  64.55%  35.45%
  DQC_US_0117  120   5.00%   0.00%  63.33%  31.67%
  DQC_US_0126  102   0.00%   0.00%  15.69%  84.31%
```

Useful flags:

| flag | effect |
| --- | --- |
| `--judge deterministic` | rule-based scoring: free, instant, offline |
| `--output-dir DIR` | write the full audit trail |
| `--workers N` | judge concurrency |
| `--resume` | reuse cached judgements after an interruption |
| `--limit N` | score only the first N cases while debugging |
| `--format lm-eval` | read lm-evaluation-harness output instead |

With `--output-dir` you also get `case_results.jsonl` — a per-case record with
the gold, your prediction and the label, which is the fastest way to see *what*
your system got wrong — plus `evaluation_summary.json` and
`evaluation_metadata.json`.

The official judge is an LLM (`gpt-5-mini`) prompted with
[`prompts/finmr_judge_v1.txt`](prompts/finmr_judge_v1.txt), version-controlled
here so you can read exactly how you are being judged. Judgements are cached in
SQLite, so re-scoring an unchanged submission costs nothing.

You may evaluate the public set as often as you like. You cannot score against
the hidden test set — you do not have those answers.

### Before submitting

```bash
python scripts/validate_submission.py \
    --predictions predictions.jsonl \
    --reference public_test_inputs.jsonl
```

ID-based: it catches missing ids, duplicate ids, unknown ids, missing fields,
empty values and malformed JSON. Exit code `0` = valid, `1` = invalid.
**An incomplete final submission is rejected, not partially scored.**

---

## 7. Directory structure

```
finreason_task3/
├── README.md
├── requirements.txt              participant dependencies
├── pyproject.toml                optional extras: anthropic / hf / vllm
├── .env.example                  the API keys the kit can use
│
├── scripts/                      the three commands you run
│   ├── prepare_public_dev.py       build data/public_dev*.jsonl   <- start here
│   ├── validate_submission.py      check predictions.jsonl before scoring
│   └── score_submission.py         run the A/S/E/C evaluation
│
├── baselines/                    one template per way of running a model
│   ├── dummy_baseline.py           constant "0" — checks the pipeline
│   ├── llm_api_template.py         OpenAI / DeepSeek / any compatible API
│   ├── claude_api_template.py      Claude via the Anthropic API
│   ├── vllm_template.py            local model, batched with vLLM
│   └── hf_template.py              local model, Hugging Face transformers
│
├── evaluation/                   the scoring engine the CLI calls into
│   ├── evaluator.py                orchestration: id alignment, concurrency
│   ├── judge.py                    the LLM judge, retries, offline judge
│   ├── prompt.py                   versioned judge prompts
│   ├── parser.py                   A/S/E/C parsing, numeric normalisation
│   ├── deterministic.py            rule-based evaluator
│   ├── metrics.py                  ACC / SER / EER / CER
│   ├── cache.py                    SQLite judgement cache
│   └── config.py                   configuration loading
│
├── task3_core/                   importable helpers
│   ├── schema.py                   record definitions
│   ├── io.py                       JSONL reading and writing
│   └── validation.py               ID-based submission validation
│
├── configs/                      official / local-dev / deterministic configs
├── prompts/                      the official judge prompt
├── examples/                     a worked end-to-end example, sample files
└── data/                         generated by prepare_public_dev.py (git-ignored)
```

The `scripts/` files are thin command-line wrappers; the work lives in
`evaluation/` and `task3_core/`. Both are plain Python with no framework, so
you can skip the CLI and call them from your own code.

---

## 8. Citation

Task 3 is built on **FinMR**, one of the three tasks in the FinAuditing
benchmark. Please cite the FinAuditing paper when you use this data:

```bibtex
@inproceedings{10.1145/3805712.3808578,
author = {Wang, Yan and Wang, Keyi and Yang, Shanshan and Patel, Jaisal and Zhao, Jeff and Mo, Fengran and Peng, Xueqing and Qian, Lingfei and Chen, Yankai and Guti{\'e}rrez-Basulto, V{\'i}ctor and Huang, Jimin and Xiong, Guojun and Liu, Xiao-Yang and Nie, Jian-Yun},
title = {FinAuditing: A Financial Taxonomy-Structured Multi-Document Benchmark for Evaluating LLMs},
year = {2026},
isbn = {9798400725999},
publisher = {Association for Computing Machinery},
address = {New York, NY, USA},
url = {https://doi.org/10.1145/3805712.3808578},
doi = {10.1145/3805712.3808578},
booktitle = {Proceedings of the 49th International ACM SIGIR Conference on Research and Development in Information Retrieval},
pages = {3456--3463},
numpages = {8},
keywords = {xbrl auditing, benchmark, large language model, information retrieval, information extraction, question answering},
location = {Australia},
series = {SIGIR '26}
}
```

Dataset: <https://huggingface.co/datasets/TheFinAI/FinMR>

A citation for FinReason Cup 2026 Task 3 will be added at launch.
