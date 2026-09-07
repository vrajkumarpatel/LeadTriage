"""Unit tests for the deterministic mock classifier (services/qualification.py)."""
from services.qualification import mock_qualify


def test_hot_keywords_push_score_up():
    result = mock_qualify(
        "We have budget approved and need a demo ASAP, pricing info please, ready to start this week.",
        company="Acme Corp",
        source="website-form",
    )
    assert result.classification == "hot"
    assert result.score >= 70


def test_cold_signals_push_score_down():
    result = mock_qualify("just browsing, not sure, maybe later", company=None, source="website-form")
    assert result.classification == "cold"
    assert result.score < 40


def test_short_message_scores_low():
    result = mock_qualify("hi", company=None, source="website-form")
    assert result.score < 40


def test_longer_detailed_message_scores_higher_than_short_generic_one():
    short = mock_qualify("hi there", company=None, source="website-form")
    long = mock_qualify(
        "Hello, I'm reaching out because our team has been evaluating solutions like "
        "yours for the past month and we think this could be a great fit for our "
        "upcoming project. Could we set up a call to discuss further details?",
        company=None,
        source="website-form",
    )
    assert long.score > short.score


def test_company_present_increases_score_slightly():
    without_company = mock_qualify("Interested in learning more, please send info.", company=None, source="web")
    with_company = mock_qualify("Interested in learning more, please send info.", company="Acme Corp", source="web")
    assert with_company.score >= without_company.score


def test_score_is_always_within_bounds():
    for msg in ["", "budget " * 50, "not sure maybe later " * 20, "a"]:
        result = mock_qualify(msg, company=None, source="test")
        assert 0 <= result.score <= 100


def test_result_has_all_required_fields_populated():
    result = mock_qualify("We need pricing and a demo soon.", company="Acme", source="n8n-webhook")
    assert result.classification in ("hot", "warm", "cold")
    assert result.reasoning_summary
    assert result.recommended_next_action
    assert result.suggested_follow_up
