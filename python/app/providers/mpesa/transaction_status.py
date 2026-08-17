from typing import Any

from app.config import settings
from app.providers.mpesa.common import require_initiator_credentials, send_post_request


def query_transaction_status(
    *,
    transaction_id: str,
    remarks: str,
    occasion: str = "",
    identifier_type: str = "4",
    command_id: str = "TransactionStatusQuery",
) -> dict[str, Any]:
    if not transaction_id.strip():
        raise ValueError("transaction_id cannot be empty")

    if not remarks.strip():
        raise ValueError("remarks cannot be empty")

    initiator_name, security_credential = require_initiator_credentials()

    payload = {
        "Initiator": initiator_name,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "TransactionID": transaction_id.strip(),
        "PartyA": settings.MPESA_SHORTCODE,
        "IdentifierType": identifier_type,
        "ResultURL": settings.transaction_status_result_url,
        "QueueTimeOutURL": settings.transaction_status_timeout_url,
        "Remarks": remarks.strip(),
        "Occasion": occasion.strip(),
    }

    return send_post_request("/mpesa/transactionstatus/v1/query", payload)
