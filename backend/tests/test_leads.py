"""Lead creation + qualification tests (mock provider path) and validation."""


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


def test_create_lead_runs_qualification_synchronously(client, auth_headers):
    response = _create_lead(client, auth_headers)
    assert response.status_code == 201, response.text
    body = response.json()

    assert body["name"] == "Jane Doe"
    assert body["email"] == "jane@example.com"

    assert body["qualification_result"] is not None
    qr = body["qualification_result"]
    assert qr["classification"] in ("hot", "warm", "cold")
    assert 0 <= qr["score"] <= 100
    assert qr["model_used"] == "mock"  # no GROQ_API_KEY in test env

    assert body["workflow_run"] is not None
    assert body["workflow_run"]["status"] == "success"


def test_create_lead_missing_required_field_returns_400(client, auth_headers):
    payload = {
        "email": "no-name@example.com",
        "message": "hello",
        "source": "website-form",
        # "name" is missing (required)
    }
    response = client.post("/api/v1/leads", json=payload, headers=auth_headers)
    assert response.status_code == 400
    assert "detail" in response.json()


def test_create_lead_invalid_email_returns_400(client, auth_headers):
    response = _create_lead(client, auth_headers, email="not-an-email")
    assert response.status_code == 400


def test_get_lead_detail_includes_audit_log(client, auth_headers):
    create_response = _create_lead(client, auth_headers)
    lead_id = create_response.json()["id"]

    response = client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == lead_id
    assert len(body["audit_log_entries"]) >= 2  # at least lead_received + qualification_started/succeeded
    events = [e["event"] for e in body["audit_log_entries"]]
    assert "lead_received" in events
    assert "qualification_succeeded" in events


def test_get_lead_not_found_returns_404(client, auth_headers):
    response = client.get("/api/v1/leads/999999", headers=auth_headers)
    assert response.status_code == 404


def test_list_leads_pagination_and_filter(client, auth_headers):
    _create_lead(client, auth_headers, email="a@example.com")
    _create_lead(client, auth_headers, email="b@example.com")

    response = client.get("/api/v1/leads?page=1&page_size=1", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["page"] == 1
    assert body["page_size"] == 1
    assert len(body["items"]) == 1
    assert body["total"] >= 2

    # newest first
    all_response = client.get("/api/v1/leads?page=1&page_size=10", headers=auth_headers)
    items = all_response.json()["items"]
    assert items[0]["email"] == "b@example.com"


def test_list_leads_filter_by_classification(client, auth_headers):
    _create_lead(client, auth_headers, email="hot@example.com", message="budget urgent demo pricing buy asap")
    response = client.get("/api/v1/leads?classification=hot", headers=auth_headers)
    assert response.status_code == 200
    for item in response.json()["items"]:
        assert item["qualification_result"]["classification"] == "hot"
