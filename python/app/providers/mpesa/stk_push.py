import re
from typing import Any

from app.config import settings
from app.providers.mpesa.common import (
    build_stk_password,
    nairobi_timestamp,
    normalize_phone,
    send_post_request,
)


def _sanitize_str(text: str, max_length: int) -> str:
    """Removes non-alphanumeric characters and enforces length limits."""
    cleaned = re.sub(r"[^a-zA-Z0-9]", "", text)
    return cleaned[:max_length]


def initiate_stk_push(
    *,
    phone_number: str,
    amount: int,
    account_reference: str,
    transaction_desc: str,
    transaction_type: str = "CustomerBuyGoodsOnline",
    till_number: str | None = None,
) -> dict[str, Any]:
    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    # Sanitize inputs to prevent M-Pesa schema rejection
    sanitized_ref = _sanitize_str(account_reference, max_length=12)
    sanitized_desc = _sanitize_str(transaction_desc, max_length=13)

    if not sanitized_ref:
        raise ValueError("account_reference must contain at least one alphanumeric character")

    if not sanitized_desc:
        raise ValueError("transaction_desc must contain at least one alphanumeric character")

    normalized_phone = normalize_phone(phone_number)
    timestamp = nairobi_timestamp()

    # Determine PartyB based on payment type
    if transaction_type == "CustomerBuyGoodsOnline":
        party_b = str(settings.MPESA_TILL_NO).strip()
    else: #CustomerPayBillOnline
        party_b = str(settings.MPESA_SHORTCODE).strip()

    payload = {
        "BusinessShortCode": str(settings.MPESA_SHORTCODE).strip(),
        "Password": build_stk_password(timestamp),
        "Timestamp": timestamp,
        "TransactionType": transaction_type,
        "Amount": int(amount),
        "PartyA": normalized_phone,
        "PartyB": party_b,
        "PhoneNumber": normalized_phone,
        "CallBackURL": settings.stk_callback_url.strip(),
        "AccountReference": sanitized_ref,
        "TransactionDesc": sanitized_desc,
    }



    print(payload)

    return send_post_request("/mpesa/stkpush/v1/processrequest", payload)