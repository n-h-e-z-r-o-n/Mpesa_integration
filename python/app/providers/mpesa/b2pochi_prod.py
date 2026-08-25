from typing import Any
from uuid import uuid4

from app.config import settings
from app.providers.mpesa.common import (
    normalize_phone,
    require_initiator_credentials,
    send_post_request,
)


def send_b2pochi_payment(
    *,
    phone_number: str,
    amount: int,
    remarks: str,
    command_id: str = "BusinessPayment",
    occasion: str = "",
    originator_conversation_id: str | None = None,
) -> dict[str, Any]:
    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not remarks.strip():
        raise ValueError("remarks cannot be empty")

    initiator_name, security_credential = require_initiator_credentials()

    payload = {
        "OriginatorConversationID": originator_conversation_id or str(uuid4()),
        "InitiatorName": initiator_name,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "Amount": amount,
        "PartyA": settings.MPESA_SHORTCODE,
        "PartyB": normalize_phone(phone_number),
        "Remarks": remarks.strip(),
        "QueueTimeOutURL": settings.b2c_timeout_url,
        "ResultURL": settings.b2c_result_url,
        "Occasion": occasion.strip(),
    }

    return send_post_request(settings.MPESA_B2POCHI_PATH, payload)
