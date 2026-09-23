"""Tests for the rule-based Task 3 baseline.

The baseline is not told which data-quality rule a case belongs to, and
these tests exist mostly to keep it that way. An auditor handed a
suspicious figure works out what is wrong with it from the filing's own
calculation relationships and the taxonomy's element definitions; which
published rule that turns out to match is a conclusion, not an input.

So the fixtures here carry no rule identifier, and the routing assertions
check that the mechanism is chosen from where the concept sits in the
calculation linkbase.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from baselines.rule_baseline import (  # noqa: E402
    Target,
    balance_of,
    find_fact,
    matching_contexts,
    parse_question,
    predict,
    summation_children,
)

INSTANCE = """##Instance document
<?xml version='1.0' encoding='UTF-8'?>
<xbrl xmlns="http://www.xbrl.org/2003/instance" xmlns:us-gaap="http://fasb.org/us-gaap/2026">
    <context id="c-1">
        <entity><identifier scheme="http://www.sec.gov/CIK">0000005513</identifier></entity>
        <period><startDate>2026-04-01</startDate><endDate>2026-06-30</endDate></period>
    </context>
    <context id="c-dim">
        <entity>
          <identifier scheme="http://www.sec.gov/CIK">0000005513</identifier>
          <segment><xbrldi:explicitMember dimension="us-gaap:X">us-gaap:Y</xbrldi:explicitMember></segment>
        </entity>
        <period><startDate>2026-04-01</startDate><endDate>2026-06-30</endDate></period>
    </context>
    <context id="c-inst">
        <entity><identifier scheme="http://www.sec.gov/CIK">0000005513</identifier></entity>
        <period><instant>2026-06-30</instant></period>
    </context>
    <us-gaap:Parent contextRef="c-1" unitRef="usd" decimals="-5">900</us-gaap:Parent>
    <us-gaap:ChildA contextRef="c-1" unitRef="usd" decimals="-5">500</us-gaap:ChildA>
    <us-gaap:ChildB contextRef="c-1" unitRef="usd" decimals="-5">400</us-gaap:ChildB>
    <us-gaap:ChildA contextRef="c-dim" unitRef="usd" decimals="-5">111</us-gaap:ChildA>
    <us-gaap:Lonely contextRef="c-1" unitRef="usd" decimals="-5">-250</us-gaap:Lonely>
    <us-gaap:AtInstant contextRef="c-inst" unitRef="usd" decimals="-5">77</us-gaap:AtInstant>
    <us-gaap:NoBalance contextRef="c-1" unitRef="usd" decimals="-5">-42</us-gaap:NoBalance>
</xbrl>
"""

CALC = """##Calculation linkbase document
<link:linkbase xmlns:link="http://www.xbrl.org/2003/linkbase">
  <link:calculationArc xlink:arcrole="https://xbrl.org/2023/arcrole/summation-item"
      xlink:from="loc_us-gaap_Parent_aaa" xlink:to="loc_us-gaap_ChildA_bbb" weight="1.0" order="1"/>
  <link:calculationArc order="2" xlink:to="loc_us-gaap_ChildB_ccc" weight="-1.0"
      xlink:from="loc_us-gaap_Parent_aaa" xlink:arcrole="https://xbrl.org/2023/arcrole/summation-item"/>
  <link:calculationArc xlink:from="loc_us-gaap_Grand_ddd" xlink:to="loc_us-gaap_Lonely_eee"
      weight="1.0" order="1" xlink:arcrole="https://xbrl.org/2023/arcrole/summation-item"/>
</link:linkbase>
##Definition linkbase document
"""

TAXONOMY = """##US GAAP Taxonomy
[Concept Core]
ID: us-gaap:Lonely
Label: Lonely
Type: xbrli:monetaryItemType | Balance: debit | PeriodType: duration | Abstract: False

[Concept Core]
ID: us-gaap:Parent
Label: Parent
Type: xbrli:monetaryItemType | Balance: credit | PeriodType: duration | Abstract: False

[Concept Core]
ID: us-gaap:NoBalance
Label: No balance
Type: xbrli:stringItemType | Balance: None | PeriodType: duration | Abstract: False
"""


def query_for(concept, period="2026-04-01 to 2026-06-30"):
    return (
        INSTANCE + CALC + TAXONOMY
        + f"\nQuestion1: What's the reported value of {concept} in the Instance "
          f"document for the period {period}?\n"
          f"Question2: What's the actual value of {concept} in the Instance document "
          f"for the period {period}, calculated based on the calculation relationship?\nAnswer:\n"
    )


class TestParseQuestion:
    def test_reads_the_concept_and_a_duration(self):
        t = parse_question(query_for("us-gaap:Parent"))
        assert t == Target("us-gaap:Parent", "2026-04-01", "2026-06-30")

    def test_reads_an_instant(self):
        t = parse_question(query_for("us-gaap:AtInstant", period="2026-06-30"))
        assert t == Target("us-gaap:AtInstant", "2026-06-30", None)

    def test_returns_none_when_there_is_no_question(self):
        assert parse_question("no question here") is None


class TestMatchingContexts:
    def test_matches_a_duration_context(self):
        assert "c-1" in matching_contexts(INSTANCE, Target("x", "2026-04-01", "2026-06-30"))

    def test_matches_an_instant_context(self):
        assert "c-inst" in matching_contexts(INSTANCE, Target("x", "2026-06-30", None))

    def test_excludes_dimensional_contexts(self):
        # A segment-qualified fact is a breakdown, not the consolidated figure
        # the question asks about. Including it silently answers a different
        # question and the error is invisible in the output.
        assert "c-dim" not in matching_contexts(INSTANCE, Target("x", "2026-04-01", "2026-06-30"))

    def test_no_match_for_an_unknown_period(self):
        assert matching_contexts(INSTANCE, Target("x", "1999-01-01", "1999-12-31")) == set()


class TestFindFact:
    def test_reads_the_reported_value(self):
        ctxs = matching_contexts(INSTANCE, Target("x", "2026-04-01", "2026-06-30"))
        assert find_fact(INSTANCE, "us-gaap:Parent", ctxs) == "900"

    def test_ignores_a_fact_in_a_dimensional_context(self):
        ctxs = matching_contexts(INSTANCE, Target("x", "2026-04-01", "2026-06-30"))
        assert find_fact(INSTANCE, "us-gaap:ChildA", ctxs) == "500"

    def test_returns_none_for_an_absent_concept(self):
        ctxs = matching_contexts(INSTANCE, Target("x", "2026-04-01", "2026-06-30"))
        assert find_fact(INSTANCE, "us-gaap:Missing", ctxs) is None


class TestSummationChildren:
    def test_finds_children_with_their_weights_whatever_the_attribute_order(self):
        # The two arcs in the fixture deliberately list their attributes in
        # different orders. Assuming one order silently finds half the arcs.
        assert sorted(summation_children(CALC, "us-gaap:Parent")) == [
            ("us-gaap:ChildA", 1.0),
            ("us-gaap:ChildB", -1.0),
        ]

    def test_a_concept_that_is_only_a_child_has_no_children(self):
        assert summation_children(CALC, "us-gaap:Lonely") == []


class TestBalanceOf:
    def test_reads_debit(self):
        assert balance_of(TAXONOMY, "us-gaap:Lonely") == "debit"

    def test_reads_credit(self):
        assert balance_of(TAXONOMY, "us-gaap:Parent") == "credit"

    def test_none_is_not_a_balance(self):
        assert balance_of(TAXONOMY, "us-gaap:NoBalance") is None

    def test_absent_concept(self):
        assert balance_of(TAXONOMY, "us-gaap:Nowhere") is None


class TestPredict:
    def test_sums_the_children_when_the_target_is_a_parent(self):
        # 500 * 1.0 + 400 * -1.0 = 100, against a reported 900.
        p = predict(query_for("us-gaap:Parent"))
        assert p.extracted_value == "900"
        assert p.calculated_value == "100"
        assert p.mechanism == "summation"

    def test_corrects_the_sign_when_the_target_is_not_a_parent(self):
        # Lonely is a debit-balance child carried at weight +1.0 but reported
        # negative, so the value its own definition implies is the magnitude.
        p = predict(query_for("us-gaap:Lonely"))
        assert p.extracted_value == "-250"
        assert p.calculated_value == "250"
        assert p.mechanism == "sign"

    def test_leaves_a_negative_alone_when_the_element_has_no_balance(self):
        """The balance attribute is the guard, not the discriminator.

        Both debit and credit monetary items are reported as magnitudes, so
        neither one tells you a negative is wrong on its own -- what the
        balance says is that the element has a direction at all. An element
        without one may legitimately be negative, and "negative, so negate it"
        is the blind shortcut this baseline is meant to sit above.
        """
        p = predict(query_for("us-gaap:NoBalance"))
        assert p.extracted_value == "-42"
        assert p.calculated_value == "-42"
        assert p.mechanism == "agree"

    def test_extract_mode_answers_only_the_first_question(self):
        p = predict(query_for("us-gaap:Parent"), mode="extract")
        assert (p.extracted_value, p.calculated_value) == ("900", "900")
        assert p.mechanism == "extract-only"

    def test_negate_mode_ignores_every_relationship(self):
        # Same case the summation mechanism gets right: negate must get it
        # wrong, or the two references are not measuring different things.
        p = predict(query_for("us-gaap:Parent"), mode="negate")
        assert (p.extracted_value, p.calculated_value) == ("900", "-900")
        assert p.mechanism == "negate"
        assert predict(query_for("us-gaap:Parent")).calculated_value == "100"

    def test_never_consults_a_rule_identifier(self):
        # The routing must come from the filing. A query carrying a rule id
        # must predict exactly the same thing as one without it.
        plain = predict(query_for("us-gaap:Parent"))
        labelled = predict(query_for("us-gaap:Parent") + "\nDQC_US_0015 DQC_US_0117 DQC_US_0126\n")
        assert (plain.extracted_value, plain.calculated_value, plain.mechanism) == (
            labelled.extracted_value, labelled.calculated_value, labelled.mechanism
        )

    def test_falls_back_to_a_well_formed_answer_when_nothing_is_found(self):
        # A missing line invalidates a whole submission, so the baseline must
        # always emit something parseable.
        p = predict("Question1: What's the reported value of us-gaap:Ghost in the "
                    "Instance document for the period 2026-04-01 to 2026-06-30?")
        assert p.extracted_value == "0"
        assert p.calculated_value == "0"
        assert p.mechanism == "unresolved"


class TestInputsWithoutARuleLabel:
    """The ranked phases ship inputs with no ``dqc_id``.

    Requiring it meant the starter kit's own loader rejected the very files
    participants are told to download -- validate_submission.py and every
    baseline included.
    """

    def test_loader_accepts_a_record_with_no_rule_label(self, tmp_path):
        import json

        from task3_core.io import load_inputs

        path = tmp_path / "inputs.jsonl"
        path.write_text(json.dumps({"id": "DEV3_000000", "query": "q"}) + "\n")
        loaded = load_inputs(path)
        assert list(loaded) == ["DEV3_000000"]
        assert loaded["DEV3_000000"].dqc_id is None
        assert loaded["DEV3_000000"].query == "q"

    def test_loader_still_accepts_the_practice_shape(self, tmp_path):
        import json

        from task3_core.io import load_inputs

        path = tmp_path / "inputs.jsonl"
        path.write_text(
            json.dumps({"id": "DEV_000000", "dqc_id": "DQC_US_0015", "query": "q"}) + "\n"
        )
        assert load_inputs(path)["DEV_000000"].dqc_id == "DQC_US_0015"

    def test_a_gold_field_is_still_refused(self, tmp_path):
        import json

        from task3_core.io import DataError, load_inputs

        path = tmp_path / "inputs.jsonl"
        path.write_text(
            json.dumps({"id": "X", "query": "q", "extracted_value": "1"}) + "\n"
        )
        with pytest.raises(DataError):
            load_inputs(path)
