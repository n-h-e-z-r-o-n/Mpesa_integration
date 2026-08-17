from typing import Any

from app.config import settings
from app.providers.mpesa.common import require_initiator_credentials, send_post_request


def reverse_transaction(
    *,
    transaction_id: str,
    amount: int,
    remarks: str,
    occasion: str = "",
    receiver_party: str | None = None,
    receiver_identifier_type: str = "11",
    command_id: str = "TransactionReversal",
) -> dict[str, Any]:
    if not transaction_id.strip():
        raise ValueError("transaction_id cannot be empty")

    if amount <= 0:
        raise ValueError("Amount must be greater than zero")

    if not remarks.strip():
        raise ValueError("remarks cannot be empty")

    initiator_name, security_credential = require_initiator_credentials()

    payload = {
        "Initiator": initiator_name,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "TransactionID": transaction_id.strip(),
        "Amount": amount,
        "ReceiverParty": receiver_party or settings.MPESA_SHORTCODE,
        "RecieverIdentifierType": receiver_identifier_type,
        "ResultURL": settings.reversal_result_url,
        "QueueTimeOutURL": settings.reversal_timeout_url,
        "Remarks": remarks.strip(),
        "Occasion": occasion.strip(),
    }

    return send_post_request("/mpesa/reversal/v1/request", payload)
