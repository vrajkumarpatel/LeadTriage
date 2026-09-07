"""Analytics summary endpoint test."""


def test_analytics_summary(client, auth_headers):
    client.post(
        "/api/v1/leads",
        json={
            "name": "Jane Doe",
            "email": "jane@example.com",
            "message": "We have budget approved and need a demo ASAP, please send pricing.",
            "source": "website-form",
        },
        headers=auth_headers,
    )

    response = client.get("/api/v1/analytics/summary", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_leads"] >= 1
    assert set(body["by_classification"].keys()) == {"hot", "warm", "cold"}
    assert set(body["by_status"].keys()) == {"pending", "running", "success", "failed"}
    assert isinstance(body["avg_score"], (int, float))
