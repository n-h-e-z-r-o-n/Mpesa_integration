import base64
import logging
import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from app.config import settings


logger = logging.getLogger(__name__)


class MpesaError(Exception):
    """Base M-Pesa exception."""


class MpesaAuthenticationError(MpesaError):
    """Raised when OAuth fails."""


class MpesaRequestError(MpesaError):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        response: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.response = response


class MpesaIndeterminateError(MpesaError):
    """Raised when it is unclear whether Safaricom received the request."""


_session: requests.Session | None = None


def build_mpesa_error_message(
    default_message: str,
    *,
    status_code: int | None = None,
    response: dict[str, Any] | None = None,
) -> str:
    message_parts = [default_message]

    if status_code is not None:
        message_parts.append(f"(status {status_code})")

    if response:
        upstream_message = next(
            (
                response.get(key)
                for key in (
                    "errorMessage",
                    "ResponseDescription",
                    "responseDescription",
                    "ResultDesc",
                    "ResultDescription",
                    "CustomerMessage",
                )
                if isinstance(response.get(key), str) and response.get(key).strip()
            ),
            None,
        )
        upstream_code = next(
            (
                response.get(key)
                for key in (
                    "errorCode",
                    "ResponseCode",
                    "responseCode",
                    "ResultCode",
                )
                if response.get(key) not in (None, "")
            ),
            None,
        )

        if upstream_code is not None:
            message_parts.append(f"code={upstream_code}")

        if upstream_message:
            message_parts.append(f"message={upstream_message}")

    return " ".join(message_parts)


def get_session() -> requests.Session:
    global _session

    if _session is not None:
        return _session

    retry = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
        respect_retry_after_header=True,
    )

    adapter = HTTPAdapter(
        max_retries=retry,
        pool_connections=20,
        pool_maxsize=50,
    )

    session = requests.Session()
    session.mount("https://", adapter)
    _session = session
    return session


def normalize_phone(phone_number: str) -> str:
    cleaned = re.sub(r"\D", "", phone_number)

    if cleaned.startswith("0"):
        cleaned = f"254{cleaned[1:]}"
    elif cleaned.startswith("7") or cleaned.startswith("1"):
        cleaned = f"254{cleaned}"

    if not re.fullmatch(r"254(?:7|1)\d{8}", cleaned):
        raise ValueError("Invalid Kenyan mobile number")

    return cleaned


def nairobi_timestamp() -> str:
    return datetime.now(ZoneInfo("Africa/Nairobi")).strftime("%Y%m%d%H%M%S")


def build_stk_password(timestamp: str) -> str:
    raw_value = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    return base64.b64encode(raw_value.encode("utf-8")).decode("utf-8")


def require_initiator_credentials() -> tuple[str, str]:
    if not settings.MPESA_INITIATOR_NAME:
        raise ValueError("MPESA_INITIATOR_NAME is required for this endpoint")

    if not settings.MPESA_SECURITY_CREDENTIAL:
        raise ValueError("MPESA_SECURITY_CREDENTIAL is required for this endpoint")

    return settings.MPESA_INITIATOR_NAME, settings.MPESA_SECURITY_CREDENTIAL


def parse_json_response(response: requests.Response) -> dict[str, Any]:
    try:
        return response.json()
    except ValueError as error:
        raise MpesaRequestError(
            "M-Pesa returned invalid JSON",
            status_code=response.status_code,
        ) from error


def send_post_request(
    path: str,
    payload: dict[str, Any],
    *,
    retry_on_401: bool = True,
) -> dict[str, Any]:
    from app.providers.mpesa.auth import clear_access_token, get_access_token

    url = f"{settings.MPESA_BASE_URL.rstrip('/')}{path}"

    headers = {
        "Authorization": f"Bearer {get_access_token()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        response = get_session().post(
            url,
            json=payload,
            headers=headers,
            timeout=(
                settings.HTTP_CONNECT_TIMEOUT,
                settings.HTTP_READ_TIMEOUT,
            ),
        )
    except (requests.Timeout, requests.ConnectionError) as error:
        raise MpesaIndeterminateError(
            "Unable to confirm whether Safaricom received the request",
        ) from error
    except requests.RequestException as error:
        raise MpesaRequestError("Unable to reach M-Pesa") from error

    data = parse_json_response(response)

    if response.status_code == 401 and retry_on_401:
        clear_access_token()
        return send_post_request(path, payload, retry_on_401=False)

    if not response.ok:
        logger.warning(
            "M-Pesa request failed",
            extra={
                "mpesa_path": path,
                "mpesa_status_code": response.status_code,
                "mpesa_response": data,
            },
        )
        raise MpesaRequestError(
            build_mpesa_error_message(
                "M-Pesa request failed",
                status_code=response.status_code,
                response=data,
            ),
            status_code=response.status_code,
            response=data,
        )

    return data
