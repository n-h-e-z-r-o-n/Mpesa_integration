from typing import Any

from app.config import settings
from app.providers.mpesa.common import require_initiator_credentials, send_post_request


def send_b2b_payment(
    *,
    receiver_shortcode: str,
    amount: int,
    remarks: str,
    command_id: str = "BusinessPayBill",
    account_reference: str = "",
    sender_identifier_type: str = "4",
    receiver_identifier_type: str = "4",
) -> dict[str, Any]:
    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not receiver_shortcode.strip():
        raise ValueError("receiver_shortcode cannot be empty")

    if not remarks.strip():
        raise ValueError("remarks cannot be empty")

    initiator_name, security_credential = require_initiator_credentials()

    payload = {
        "Initiator": initiator_name,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "SenderIdentifierType": sender_identifier_type,
        "RecieverIdentifierType": receiver_identifier_type,
        "Amount": amount,
        "PartyA": settings.MPESA_SHORTCODE,
        "PartyB": receiver_shortcode.strip(),
        "Remarks": remarks.strip(),
        "QueueTimeOutURL": settings.b2b_timeout_url,
        "ResultURL": settings.b2b_result_url,
        "AccountReference": account_reference.strip(),
    }

    return send_post_request(settings.MPESA_B2B_PATH, payload)
