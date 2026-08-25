from typing import Any

from app.config import settings
from app.providers.mpesa.common import (
    build_stk_password,
    nairobi_timestamp,
    send_post_request,
)


def query_stk_push(checkout_request_id: str) -> dict[str, Any]:
    if not checkout_request_id.strip():
        raise ValueError("checkout_request_id cannot be empty")

    timestamp = nairobi_timestamp()
    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": build_stk_password(timestamp),
        "Timestamp": timestamp,
        "CheckoutRequestID": checkout_request_id.strip(),
    }

    return send_post_request(settings.MPESA_STK_QUERY_PATH, payload)
