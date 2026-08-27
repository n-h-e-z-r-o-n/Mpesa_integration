from typing import Any

from app.config import settings
from app.providers.mpesa.common import resolve_mpesa_path, send_post_request


def _send_pull_transactions_request(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Pull Transactions payload cannot be empty")

    return send_post_request(path, dict(payload))


def query_pull_transactions(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_pull_transactions_request(
        settings.pull_transactions_query_path,
        payload,
    )


def register_pull_transactions(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_pull_transactions_request(
        settings.MPESA_PULL_TRANSACTIONS_REGISTER_PATH,
        payload,
    )


def build_pull_transactions_registration_payload(
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    registration_payload = {
        "ShortCode": settings.MPESA_SHORTCODE,
        "RequestType": settings.MPESA_PULL_TRANSACTIONS_REQUEST_TYPE,
        "NominatedNumber": settings.MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER,
        "CallBackURL": settings.pull_transactions_callback_url,
    }

    if payload:
        registration_payload.update(payload)

    if not str(registration_payload.get("ShortCode", "")).strip():
        raise ValueError("MPESA_SHORTCODE is required for pull transactions registration")

    callback_url = str(registration_payload.get("CallBackURL", "")).strip()
    if not callback_url:
        raise ValueError(
            "MPESA_PULL_TRANSACTIONS_CALLBACK_URL or PUBLIC_BASE_URL is required for pull transactions registration"
        )

    nominated_number = str(registration_payload.get("NominatedNumber", "")).strip()
    if not nominated_number:
        raise ValueError(
            "MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER is required for pull transactions registration"
        )

    registration_payload["ShortCode"] = str(registration_payload["ShortCode"]).strip()
    registration_payload["RequestType"] = str(
        registration_payload.get("RequestType", "Pull"),
    ).strip() or "Pull"
    registration_payload["NominatedNumber"] = nominated_number
    registration_payload["CallBackURL"] = callback_url
    return registration_payload


def register_pull_transactions_from_settings(
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return register_pull_transactions(
        build_pull_transactions_registration_payload(payload),
    )


def pull_transactions(
    payload: dict[str, Any],
    *,
    path_override: str | None = None,
) -> dict[str, Any]:
    return _send_pull_transactions_request(
        resolve_mpesa_path(settings.MPESA_PULL_TRANSACTIONS_PATH, path_override),
        payload,
    )
