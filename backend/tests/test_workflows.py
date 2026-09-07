"""Workflow list/detail tests, and the retry endpoint's success + 409 cases."""
from services import workflow_service


def _create_lead(client, auth_headers, **overrides):
    payload = {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "phone": "555-1234",
        "company": "Acme Corp",
        "message": "We have budget approved and need a demo ASAP, please send pricing.",
        "source": "website-form",
    }
    payload.update(overrides)
    return client.post("/api/v1/leads", json=payload, headers=auth_headers)


def test_list_workflows(client, auth_headers):
    _create_lead(client, auth_headers)
    response = client.get("/api/v1/workflows", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["status"] in ("pending", "running", "success", "failed")


def test_get_workflow_detail_not_found(client, auth_headers):
    response = client.get("/api/v1/workflows/999999", headers=auth_headers)
    assert response.status_code == 404


def test_retry_returns_409_when_not_failed(client, auth_headers):
    create_response = _create_lead(client, auth_headers)
    assert create_response.json()["workflow_run"]["status"] == "success"
    workflow_run_id = create_response.json()["workflow_run"]["id"]

    retry_response = client.post(f"/api/v1/workflows/{workflow_run_id}/retry", headers=auth_headers)
    assert retry_response.status_code == 409


def test_retry_not_found_returns_404(client, auth_headers):
    response = client.post("/api/v1/workflows/999999/retry", headers=auth_headers)
    assert response.status_code == 404


def test_retry_succeeds_after_a_simulated_failure(client, auth_headers, monkeypatch):
    """Force the first qualification attempt to fail, then verify /retry recovers it."""
    original_qualify_lead = workflow_service.qualify_lead
    call_count = {"n": 0}

    def flaky_qualify_lead(*args, **kwargs):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("simulated qualification failure")
        return original_qualify_lead(*args, **kwargs)

    monkeypatch.setattr(workflow_service, "qualify_lead", flaky_qualify_lead)

    create_response = _create_lead(client, auth_headers)
    assert create_response.status_code == 201
    body = create_response.json()
    assert body["workflow_run"]["status"] == "failed"
    assert body["qualification_result"] is None
    workflow_run_id = body["workflow_run"]["id"]

    # Retrying now (still patched, but call #2 uses the real path) should succeed.
    retry_response = client.post(f"/api/v1/workflows/{workflow_run_id}/retry", headers=auth_headers)
    assert retry_response.status_code == 200, retry_response.text
    retry_body = retry_response.json()
    assert retry_body["status"] == "success"
    assert retry_body["retry_count"] == 1
    events = [e["event"] for e in retry_body["audit_log_entries"]]
    assert "retry_triggered" in events
    assert "qualification_succeeded" in events

    # A second retry attempt should now 409 since the workflow is no longer failed.
    second_retry = client.post(f"/api/v1/workflows/{workflow_run_id}/retry", headers=auth_headers)
    assert second_retry.status_code == 409
