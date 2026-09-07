"""Outbound notification dispatch.

Posts a Slack-compatible JSON payload to NOTIFICATION_WEBHOOK_URL when a lead
is qualified (new-lead alert) or when a follow-up is generated. If the env
var is unset, we log the payload instead of making a network call — this is
the "mock webhook" / demo-mode behavior described in SPEC.md, so the app
never hard-fails just because no notification target is configured.
"""
import logging
import os

import requests

logger = logging.getLogger(__name__)

_TIMEOUT_SECONDS = 5


def _webhook_url() -> str | None:
    url = os.getenv("NOTIFICATION_WEBHOOK_URL", "").strip()
    return url or None


def _dispatch(payload: dict, kind: str) -> None:
    url = _webhook_url()
    if not url:
        logger.info(
            "Notification webhook not configured; logging only",
            extra={"extra_fields": {"event": "notification_log_only", "kind": kind, "payload": payload}},
        )
        return

    try:
        response = requests.post(url, json=payload, timeout=_TIMEOUT_SECONDS)
        response.raise_for_status()
        logger.info(
            "Notification dispatched",
            extra={"extra_fields": {"event": "notification_sent", "kind": kind, "status_code": response.status_code}},
        )
    except requests.RequestException as exc:
        # Notification failures must never break the qualification flow.
        logger.warning(
            "Notification dispatch failed",
            extra={"extra_fields": {"event": "notification_failed", "kind": kind, "error": str(exc)}},
        )


def notify_new_lead(lead, qualification_result) -> None:
    classification = qualification_result.classification
    classification_value = classification.value if hasattr(classification, "value") else classification
    payload = {
        "text": (
            f":rotating_light: New lead — *{lead.name}* ({lead.email}) from {lead.source}\n"
            f"Classification: *{classification_value}* (score {qualification_result.score})\n"
            f"{qualification_result.reasoning_summary}"
        ),
        "lead_id": lead.id,
        "classification": classification_value,
        "score": qualification_result.score,
        "type": "new_lead",
    }
    _dispatch(payload, kind="new_lead")


def notify_follow_up(lead, qualification_result) -> None:
    payload = {
        "text": (
            f":envelope: Follow-up ready for *{lead.name}* ({lead.email})\n"
            f"{qualification_result.suggested_follow_up}"
        ),
        "lead_id": lead.id,
        "suggested_follow_up": qualification_result.suggested_follow_up,
        "type": "follow_up",
    }
    _dispatch(payload, kind="follow_up")
