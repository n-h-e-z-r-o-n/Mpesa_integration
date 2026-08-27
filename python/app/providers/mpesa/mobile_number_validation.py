from typing import Any

from app.config import settings
from app.providers.mpesa.common import resolve_mpesa_path, send_post_request


def check_ati_mobile_number(payload: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Mobile Number Validation payload cannot be empty")

    return send_post_request(
        settings.mobile_number_validation_check_ati_path,
        dict(payload),
    )


def validate_mobile_number(
    payload: dict[str, Any],
    *,
    path_override: str | None = None,
) -> dict[str, Any]:
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Mobile Number Validation payload cannot be empty")

    return send_post_request(
        resolve_mpesa_path(settings.MPESA_MOBILE_NUMBER_VALIDATION_PATH, path_override),
        dict(payload),
    )
