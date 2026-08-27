from fastapi.testclient import TestClient

from app.main import app
from app.api import mpesa as mpesa_api


client = TestClient(app)
HEADERS = {"x-api-key": "1"}


def test_pull_transactions_register_route(monkeypatch):
    captured = {}

    def fake_register_pull_transactions_from_settings(payload=None):
        captured["payload"] = payload
        return {"ok": True, "route": "register"}

    monkeypatch.setattr(
        mpesa_api,
        "register_pull_transactions_from_settings",
        fake_register_pull_transactions_from_settings,
    )

    response = client.post(
        "/api/v1/mpesa/pull-transactions/register",
        headers=HEADERS,
        json={"ShortCode": "174379", "CallBackURL": "https://example.com/callback"},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "route": "register"}
    assert captured["payload"]["ShortCode"] == "174379"


def test_pull_transactions_register_route_can_use_env_defaults(monkeypatch):
    captured = {}

    def fake_register_pull_transactions_from_settings(payload=None):
        captured["payload"] = payload
        return {"ok": True, "route": "register"}

    monkeypatch.setattr(
        mpesa_api,
        "register_pull_transactions_from_settings",
        fake_register_pull_transactions_from_settings,
    )

    response = client.post(
        "/api/v1/mpesa/pull-transactions/register",
        headers=HEADERS,
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "route": "register"}
    assert captured["payload"] is None


def test_build_pull_transactions_registration_payload_uses_required_env_defaults():
    payload = mpesa_api.build_pull_transactions_registration_payload()

    assert payload["ShortCode"] == "4329713"
    assert payload["RequestType"] == "Pull"
    assert "NominatedNumber" in payload
    assert "CallBackURL" in payload


def test_pull_transactions_query_route(monkeypatch):
    captured = {}

    def fake_query_pull_transactions(payload):
        captured["payload"] = payload
        return {"ok": True, "route": "query"}

    monkeypatch.setattr(
        mpesa_api,
        "query_pull_transactions",
        fake_query_pull_transactions,
    )

    response = client.post(
        "/api/v1/mpesa/pull-transactions/query",
        headers=HEADERS,
        json={
            "ShortCode": "174379",
            "StartDate": "2026-08-26 00:00:00",
            "EndDate": "2026-08-26 23:59:59",
            "OffSetValue": "0",
        },
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "route": "query"}
    assert captured["payload"]["OffSetValue"] == "0"


def test_bill_manager_cancel_bulk_route(monkeypatch):
    captured = {}

    def fake_cancel_bill_manager_bulk_invoices(payload):
        captured["payload"] = payload
        return {"ok": True, "route": "cancel-bulk"}

    monkeypatch.setattr(
        mpesa_api,
        "cancel_bill_manager_bulk_invoices",
        fake_cancel_bill_manager_bulk_invoices,
    )

    response = client.post(
        "/api/v1/mpesa/bill-manager/invoices/cancel-bulk",
        headers=HEADERS,
        json={"externalReference": "BILL-1001"},
    )

    assert response.status_code == 200
    assert response.json() == {"ok": True, "route": "cancel-bulk"}
    assert captured["payload"]["externalReference"] == "BILL-1001"
