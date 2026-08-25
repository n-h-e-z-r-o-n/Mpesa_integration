import threading
import time
from typing import Any

import requests

from app.config import settings
from app.providers.mpesa.common import (
    MpesaAuthenticationError,
    get_session,
)


TOKEN_REFRESH_MARGIN_SECONDS = 60

_token_lock = threading.Lock()
_access_token: str | None = None
_token_expires_at: float = 0.0


def clear_access_token() -> None:
    global _access_token, _token_expires_at
    _access_token = None
    _token_expires_at = 0.0


def get_access_token() -> str:
    global _access_token

    if _access_token and time.monotonic() < _token_expires_at:
        return _access_token

    with _token_lock:
        if _access_token and time.monotonic() < _token_expires_at:
            return _access_token

        _access_token = fetch_access_token()
        return _access_token


def fetch_access_token() -> str:
    global _token_expires_at

    url = f"{settings.MPESA_BASE_URL.rstrip('/')}{settings.MPESA_AUTH_PATH}"

    try:
        response = get_session().get(
            url,
            auth=(
                settings.MPESA_CONSUMER_KEY,
                settings.MPESA_CONSUMER_SECRET,
            ),
            timeout=(
                settings.HTTP_CONNECT_TIMEOUT,
                settings.HTTP_READ_TIMEOUT,
            ),
        )
    except requests.RequestException as error:
        raise MpesaAuthenticationError(
            "Unable to contact M-Pesa OAuth endpoint",
        ) from error

    data = parse_auth_response(response)

    if not response.ok:
        raise MpesaAuthenticationError(f"M-Pesa authentication failed: {data}")

    access_token = data.get("access_token")
    if not access_token:
        raise MpesaAuthenticationError("M-Pesa response did not include access_token")

    try:
        expires_in = int(data.get("expires_in", 3599))
    except (TypeError, ValueError):
        expires_in = 3599

    _token_expires_at = (
        time.monotonic() + expires_in - TOKEN_REFRESH_MARGIN_SECONDS
    )

    print("OAuth URL:", url)
    print("OAuth status:", response.status_code)
    print("OAuth response keys:", list(data.keys()))
    print("Token length:", len(access_token))
    print("Expires in:", expires_in)
    print("Token prefix:", access_token[:8])
    print("Token suffix:", access_token[-4:])

    return access_token


def parse_auth_response(response: requests.Response) -> dict[str, Any]:
    try:
        return response.json()
    except ValueError as error:
        raise MpesaAuthenticationError(
            "M-Pesa OAuth returned invalid JSON",
        ) from error
