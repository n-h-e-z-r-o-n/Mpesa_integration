from typing import Any

from app.config import settings
from app.providers.mpesa.common import send_post_request


def register_c2b_urls(response_type: str = "Completed") -> dict[str, Any]:
    if response_type not in {"Completed", "Cancelled"}:
        raise ValueError("response_type must be Completed or Cancelled")

    payload = {
        "ShortCode": settings.MPESA_SHORTCODE,
        "ResponseType": response_type,
        "ConfirmationURL": settings.c2b_confirmation_url,
        "ValidationURL": settings.c2b_validation_url,
    }

    return send_post_request("/mpesa/c2b/v1/registerurl", payload)
