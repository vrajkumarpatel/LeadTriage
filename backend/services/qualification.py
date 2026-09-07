"""AI qualification layer — SPEC.md "AI Layer Contract".

Given a lead's message/company/source, produce a QualificationResult via a
Groq chat completion prompted for strict JSON. On invalid JSON, retry once
with a correction. On repeated failure or missing GROQ_API_KEY, fall back to
a deterministic mock classifier so the app always works without a live key.
"""
import json
import logging
import os
import re

from pydantic import ValidationError

from schemas import QualificationLLMOutput

logger = logging.getLogger(__name__)

GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_MODEL_LABEL = f"groq/{GROQ_MODEL}"
MOCK_MODEL_LABEL = "mock"

SYSTEM_PROMPT = (
    "You are a B2B sales lead qualification assistant. Given a lead's message, "
    "company, and source, classify how sales-ready they are. Respond with STRICT "
    "JSON ONLY — no markdown, no code fences, no commentary before or after — "
    "matching exactly this shape:\n"
    '{"classification": "hot|warm|cold", "score": <integer 0-100>, '
    '"reasoning_summary": "<1-2 sentence explanation>", '
    '"recommended_next_action": "<short actionable next step>", '
    '"suggested_follow_up": "<a short follow-up message/email draft>"}\n'
    'classification must be exactly one of "hot", "warm", or "cold". '
    "score must be an integer between 0 and 100 inclusive. Output nothing but "
    "the JSON object."
)

CORRECTION_SUFFIX = (
    "\n\nYour previous response was not valid JSON matching the required shape. "
    "Return valid JSON only — a single JSON object, no markdown, no extra text."
)


def _build_user_prompt(message: str, company: str | None, source: str) -> str:
    return (
        f"Lead message: {message}\n"
        f"Company: {company or 'unknown'}\n"
        f"Source: {source}\n\n"
        "Classify this lead and respond with the JSON object described above."
    )


def _extract_json(raw: str) -> dict:
    """Best-effort extraction of a JSON object from an LLM response."""
    raw = raw.strip()
    # Strip markdown code fences if the model added them anyway.
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fence_match:
        raw = fence_match.group(1)
    else:
        # Fall back to the first {...} block in the text.
        brace_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if brace_match:
            raw = brace_match.group(0)
    return json.loads(raw)


def _call_groq_once(client, message: str, company: str | None, source: str, correction: bool = False) -> QualificationLLMOutput:
    user_prompt = _build_user_prompt(message, company, source)
    if correction:
        user_prompt += CORRECTION_SUFFIX

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=500,
    )

    usage = getattr(response, "usage", None)
    approx_tokens = getattr(usage, "total_tokens", None) if usage else None
    logger.info(
        "Groq qualification call completed",
        extra={"extra_fields": {"event": "groq_call", "approx_tokens": approx_tokens, "correction_retry": correction}},
    )

    content = response.choices[0].message.content or ""
    parsed = _extract_json(content)
    return QualificationLLMOutput.model_validate(parsed)


def qualify_with_groq(message: str, company: str | None, source: str) -> QualificationLLMOutput | None:
    """Attempt a real Groq call with one retry on invalid JSON.

    Returns None if the API key is missing or both attempts fail, signalling
    the caller to fall back to the mock classifier.
    """
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None

    try:
        from groq import Groq
    except ImportError:
        logger.error("groq package not installed; falling back to mock classifier")
        return None

    client = Groq(api_key=api_key)

    try:
        return _call_groq_once(client, message, company, source, correction=False)
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.warning("Groq response failed JSON validation, retrying once: %s", exc)
    except Exception as exc:
        logger.error("Groq API call failed: %s", exc)
        return None

    try:
        return _call_groq_once(client, message, company, source, correction=True)
    except (json.JSONDecodeError, ValidationError) as exc:
        logger.error("Groq response failed JSON validation on retry, falling back to mock: %s", exc)
        return None
    except Exception as exc:
        logger.error("Groq API call failed on retry: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Deterministic mock classifier
# ---------------------------------------------------------------------------

_HOT_KEYWORDS = ("budget", "urgent", "demo", "pricing", "buy", "purchase", "contract", "asap", "ready to start")
_WARM_KEYWORDS = ("interested", "learn more", "evaluating", "considering", "question", "info", "trial")
_COLD_KEYWORDS = ("just browsing", "not sure", "no budget", "maybe later", "unsubscribe", "just curious")


def mock_qualify(message: str, company: str | None, source: str) -> QualificationLLMOutput:
    """Deterministic heuristic scoring — no external calls, no randomness.

    Scores by keyword signals and message characteristics so results are
    sensible rather than a trivial constant stub.
    """
    text = (message or "").lower()

    score = 30  # baseline
    matched_hot = [kw for kw in _HOT_KEYWORDS if kw in text]
    matched_warm = [kw for kw in _WARM_KEYWORDS if kw in text]
    matched_cold = [kw for kw in _COLD_KEYWORDS if kw in text]

    score += 12 * len(matched_hot)
    score += 6 * len(matched_warm)
    score -= 15 * len(matched_cold)

    # Longer, more detailed messages tend to signal more serious intent.
    word_count = len(text.split())
    if word_count >= 40:
        score += 15
    elif word_count >= 15:
        score += 8
    elif word_count < 5:
        score -= 10

    if company:
        score += 5

    if "?" in text:
        score += 3

    score = max(0, min(100, score))

    if score >= 70:
        classification = "hot"
        next_action = "Route to sales rep for immediate outreach (call within 1 business day)."
    elif score >= 40:
        classification = "warm"
        next_action = "Add to nurture sequence and follow up within 3-5 business days."
    else:
        classification = "cold"
        next_action = "Add to long-term drip campaign; no immediate outreach required."

    signal_bits = []
    if matched_hot:
        signal_bits.append(f"hot-intent keywords ({', '.join(matched_hot)})")
    if matched_warm:
        signal_bits.append(f"warm-intent keywords ({', '.join(matched_warm)})")
    if matched_cold:
        signal_bits.append(f"cold-intent keywords ({', '.join(matched_cold)})")
    signal_summary = "; ".join(signal_bits) if signal_bits else "no strong keyword signals"

    reasoning_summary = (
        f"Heuristic score {score}/100 from source '{source}', {word_count}-word message, "
        f"{signal_summary}."
    )

    suggested_follow_up = (
        f"Hi, thanks for reaching out{f' about {company}' if company else ''}. "
        "We'd love to learn more about what you're looking for — could we schedule "
        "a quick call this week?"
    )

    return QualificationLLMOutput(
        classification=classification,
        score=score,
        reasoning_summary=reasoning_summary,
        recommended_next_action=next_action,
        suggested_follow_up=suggested_follow_up,
    )


def qualify_lead(message: str, company: str | None, source: str) -> tuple[QualificationLLMOutput, str]:
    """Top-level entry point used by the workflow service.

    Returns (result, model_used).
    """
    result = qualify_with_groq(message, company, source)
    if result is not None:
        return result, GROQ_MODEL_LABEL

    logger.info(
        "Using mock classifier",
        extra={"extra_fields": {"event": "mock_classifier_used"}},
    )
    return mock_qualify(message, company, source), MOCK_MODEL_LABEL
