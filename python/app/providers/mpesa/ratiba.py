from typing import Any

from app.config import settings
from app.providers.mpesa.common import send_post_request


def create_ratiba_standing_order(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Ratiba payload cannot be empty")

    ratiba_payload = dict(payload)

    if not ratiba_payload.get("CallBackURL"):
        ratiba_payload["CallBackURL"] = settings.ratiba_callback_url

    return send_post_request(settings.MPESA_RATIBA_PATH, ratiba_payload)
