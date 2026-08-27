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


def send_bill_manager_request(
    payload: dict[str, Any],
    *,
    path_override: str | None = None,
) -> dict[str, Any]:
    return _send_bill_manager_request(
        resolve_mpesa_path(settings.MPESA_BILL_MANAGER_PATH, path_override),
        payload,
    )
