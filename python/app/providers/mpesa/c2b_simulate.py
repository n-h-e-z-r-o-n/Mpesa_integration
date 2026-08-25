from typing import Any

from app.config import settings
from app.providers.mpesa.common import normalize_phone, send_post_request


def simulate_c2b_payment(
    *,
    amount: int,
    phone_number: str,
    bill_ref_number: str,
    command_id: str = "CustomerPayBillOnline",
    shortcode: str | None = None,
) -> dict[str, Any]:
    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not bill_ref_number.strip():
        raise ValueError("bill_ref_number cannot be empty")

    payload = {
        "ShortCode": shortcode or settings.MPESA_SHORTCODE,
        "CommandID": command_id,
        "Amount": amount,
        "Msisdn": normalize_phone(phone_number),
        "BillRefNumber": bill_ref_number.strip(),
    }

    return send_post_request(settings.MPESA_C2B_SIMULATE_PATH, payload)
