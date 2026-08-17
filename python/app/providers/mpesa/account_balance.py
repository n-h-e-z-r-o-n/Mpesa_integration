from typing import Any

from app.config import settings
from app.providers.mpesa.common import require_initiator_credentials, send_post_request


def query_account_balance(
    *,
    remarks: str,
    identifier_type: str = "4",
    command_id: str = "AccountBalance",
) -> dict[str, Any]:
    if not remarks.strip():
        raise ValueError("remarks cannot be empty")

    initiator_name, security_credential = require_initiator_credentials()

    payload = {
        "Initiator": initiator_name,
        "SecurityCredential": security_credential,
        "CommandID": command_id,
        "PartyA": settings.MPESA_SHORTCODE,
        "IdentifierType": identifier_type,
        "Remarks": remarks.strip(),
        "QueueTimeOutURL": settings.account_balance_timeout_url,
        "ResultURL": settings.account_balance_result_url,
    }

    return send_post_request("/mpesa/accountbalance/v1/query", payload)
