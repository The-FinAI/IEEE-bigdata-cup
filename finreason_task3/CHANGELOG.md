# Changelog

Changes to the frozen official evaluation configuration. The config names
this file, so every bump of `evaluation_version` is recorded here.

## 1.1

`dataset_version` was `task3-public-dev-v1.0`, which named the public
practice set. The same config scores whichever phase it is pointed at, so
every official development and test score carried provenance claiming it
had been measured on the practice data. It is now `task3-2026`; the phase a
run covers is identified by its gold file and by `num_cases` in
`evaluation_metadata.json`.

Scoring behaviour is unchanged. The judge, the prompt, the tolerances and
the missing-prediction policy are all untouched, so scores produced under
1.0 and 1.1 are comparable.

`configs/deterministic_evaluation.yaml` carried the same wrong value and was
corrected with it. `configs/local_dev_evaluation.yaml` keeps
`task3-public-dev-v1.0`, which is accurate: it exists for local runs against
the public set.

## 1.0

Initial frozen configuration.
