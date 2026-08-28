from typing import Any

from app.config import settings
from app.providers.mpesa.common import resolve_mpesa_path, send_post_request


def _send_bill_manager_request(path: str, payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Bill Manager payload cannot be empty")

    return send_post_request(path, dict(payload))


def create_bill_manager_single_invoice(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.bill_manager_create_single_invoice_path,
        payload,
    )


def create_bill_manager_bulk_invoices(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.MPESA_BILL_MANAGER_CREATE_BULK_INVOICES_PATH,
        payload,
    )


def cancel_bill_manager_single_invoice(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.MPESA_BILL_MANAGER_CANCEL_SINGLE_INVOICE_PATH,
        payload,
    )


def cancel_bill_manager_bulk_invoices(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.MPESA_BILL_MANAGER_CANCEL_BULK_INVOICES_PATH,
        payload,
    )


def build_bill_manager_optin_payload(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    optin_payload = {
        "shortcode": settings.MPESA_SHORTCODE,
        "email": settings.MPESA_BILL_MANAGER_EMAIL,
        "officialContact": settings.MPESA_BILL_MANAGER_OFFICIAL_CONTACT,
        "sendReminders": settings.MPESA_BILL_MANAGER_SEND_REMINDERS,
        "logo": settings.MPESA_BILL_MANAGER_LOGO,
        "callbackurl": settings.bill_manager_callback_url,
    }

    if payload:
        optin_payload.update(payload)

    if not str(optin_payload.get("shortcode", "")).strip():
        raise ValueError("MPESA_SHORTCODE is required for Bill Manager opt-in")
    if not str(optin_payload.get("email", "")).strip():
        raise ValueError("MPESA_BILL_MANAGER_EMAIL is required for Bill Manager opt-in")
    if not str(optin_payload.get("officialContact", "")).strip():
        raise ValueError(
            "MPESA_BILL_MANAGER_OFFICIAL_CONTACT is required for Bill Manager opt-in"
        )
    if not str(optin_payload.get("callbackurl", "")).strip():
        raise ValueError(
            "MPESA_BILL_MANAGER_CALLBACK_URL or PUBLIC_BASE_URL is required for Bill Manager opt-in"
        )

    optin_payload["shortcode"] = str(optin_payload["shortcode"]).strip()
    optin_payload["email"] = str(optin_payload["email"]).strip()
    optin_payload["officialContact"] = str(optin_payload["officialContact"]).strip()
    optin_payload["callbackurl"] = str(optin_payload["callbackurl"]).strip()
    return optin_payload


def bill_manager_optin(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.MPESA_BILL_MANAGER_OPTIN_PATH,
        payload,
    )


def bill_manager_optin_from_settings(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    return bill_manager_optin(build_bill_manager_optin_payload(payload))


def change_bill_manager_optin_details(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.MPESA_BILL_MANAGER_CHANGE_OPTIN_DETAILS_PATH,
        payload,
    )


def change_bill_manager_optin_details_from_settings(
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    return change_bill_manager_optin_details(build_bill_manager_optin_payload(payload))


def reconcile_bill_manager(payload: dict[str, Any]) -> dict[str, Any]:
    return _send_bill_manager_request(
        settings.MPESA_BILL_MANAGER_RECONCILIATION_PATH,
        payload,
    )
