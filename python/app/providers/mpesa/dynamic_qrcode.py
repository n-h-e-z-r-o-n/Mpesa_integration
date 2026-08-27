from typing import Any

from app.config import settings
from app.providers.mpesa.common import resolve_mpesa_path, send_post_request


def generate_dynamic_qrcode(
    payload: dict[str, Any],
    *,
    path_override: str | None = None,
) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Dynamic QRCode payload cannot be empty")

    return send_post_request(
        resolve_mpesa_path(settings.dynamic_qrcode_generate_path, path_override),
        dict(payload),
    )
