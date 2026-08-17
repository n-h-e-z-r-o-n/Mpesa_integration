from typing import Any

from app.config import settings
from app.providers.mpesa.common import (
    build_stk_password,
    nairobi_timestamp,
    normalize_phone,
    send_post_request,
)


def initiate_stk_push(
    *,
    phone_number: str,
    amount: int,
    account_reference: str,
    transaction_desc: str,
    transaction_type: str = "CustomerPayBillOnline",
) -> dict[str, Any]:
    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not account_reference.strip():
        raise ValueError("account_reference cannot be empty")

    if not transaction_desc.strip():
        raise ValueError("transaction_desc cannot be empty")

    normalized_phone = normalize_phone(phone_number)
    timestamp = nairobi_timestamp()
    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": build_stk_password(timestamp),
        "Timestamp": timestamp,
        "TransactionType": transaction_type,
        "Amount": amount,
        "PartyA": normalized_phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": normalized_phone,
        "CallBackURL": settings.stk_callback_url,
        "AccountReference": account_reference.strip(),
        "TransactionDesc": transaction_desc.strip(),
    }

    return send_post_request("/mpesa/stkpush/v1/processrequest", payload)
