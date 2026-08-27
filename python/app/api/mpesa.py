import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Header, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.providers.mpesa.account_balance import query_account_balance
from app.providers.mpesa.auth import get_access_token
from app.providers.mpesa.b2b import send_b2b_payment
from app.providers.mpesa.b2c import send_b2c_payment
from app.providers.mpesa.b2pochi_prod import send_b2pochi_payment
from app.providers.mpesa.bill_manager import (
    cancel_bill_manager_bulk_invoices,
    cancel_bill_manager_single_invoice,
    create_bill_manager_bulk_invoices,
    create_bill_manager_single_invoice,
)
from app.providers.mpesa.c2b_register import register_c2b_urls
from app.providers.mpesa.c2b_simulate import simulate_c2b_payment
from app.providers.mpesa.common import MpesaError
from app.providers.mpesa.dynamic_qrcode import generate_dynamic_qrcode
from app.providers.mpesa.mobile_number_validation import (
    check_ati_mobile_number,
)
from app.providers.mpesa.pull_transactions import (
    build_pull_transactions_registration_payload,
    query_pull_transactions,
    register_pull_transactions_from_settings,
)
from app.providers.mpesa.ratiba import create_ratiba_standing_order
from app.providers.mpesa.reversal import reverse_transaction
from app.providers.mpesa.stk_push import initiate_stk_push
from app.providers.mpesa.stk_query import query_stk_push
from app.providers.mpesa.transaction_status import query_transaction_status


router = APIRouter(prefix="/mpesa", tags=["mpesa"])
logger = logging.getLogger(__name__)


def verify_internal_api_key(x_api_key: str = Header(...)) -> None:
    if x_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )


def handle_mpesa_error(error: Exception) -> None:
    if isinstance(error, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

    if isinstance(error, MpesaError):
        if hasattr(error, "response"):
            logger.warning(
                "M-Pesa upstream returned an error",
                extra={
                    "mpesa_status_code": getattr(error, "status_code", None),
                    "mpesa_response": getattr(error, "response", None),
                },
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={
                    "message": str(error),
                    "mpesa_status_code": getattr(error, "status_code", None),
                    "mpesa_response": getattr(error, "response", None),
                },
            ) from error

        logger.warning("M-Pesa request failed: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    raise error


class StkPushRequest(BaseModel):
    phone_number: str  = "254714415034"
    amount: int = Field(gt=0)
    account_reference: str
    transaction_desc: str
    transaction_type: str = "CustomerPayBillOnline"

    model_config = {
        "json_schema_extra": {
            "example": {
                "phone_number": "254714415034",
                "amount": 10,
                "account_reference": "INV1001",
                "transaction_desc": "Payment for order INV1001",
                "transaction_type": "CustomerPayBillOnline",
            },
        },
    }


class StkQueryRequest(BaseModel):
    checkout_request_id: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "checkout_request_id": "ws_CO_260820261200001234567890",
            },
        },
    }


class C2BRegisterRequest(BaseModel):
    response_type: str = "Completed"

    model_config = {
        "json_schema_extra": {
            "example": {
                "response_type": "Completed",
            },
        },
    }


class C2BSimulateRequest(BaseModel):
    amount: int = Field(gt=0)
    phone_number: str
    bill_ref_number: str
    command_id: str = "CustomerPayBillOnline"
    shortcode: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "amount": 10,
                "phone_number": "254714415034",
                "bill_ref_number": "INV1001",
                "command_id": "CustomerPayBillOnline",
                "shortcode": "600000",
            },
        },
    }


class B2CRequest(BaseModel):
    phone_number: str = "254714415034"
    amount: int = 10
    remarks: str
    command_id: str = "BusinessPayment"
    occasion: str = ""
    originator_conversation_id: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "phone_number": "254714415034",
                "amount": 10,
                "remarks": "Payout for August promotion",
                "command_id": "BusinessPayment",
                "occasion": "Promo payout",
                "originator_conversation_id": "payout-001",
            },
        },
    }


class B2PochiProdRequest(BaseModel):
    phone_number: str = "254714415034"
    amount: int = 10
    remarks: str
    command_id: str = "BusinessPayToPochi"
    occasion: str = ""
    originator_conversation_id: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "phone_number": "254714415034",
                "amount": 10,
                "remarks": "B2Pochi wallet payout",
                "command_id": "BusinessPayToPochi",
                "occasion": "Wallet payout",
                "originator_conversation_id": "pochi-001",
            },
        },
    }


class B2BRequest(BaseModel):
    receiver_shortcode: str
    amount: int = Field(gt=0)
    remarks: str
    command_id: str = "BusinessPayBill"
    account_reference: str = ""
    sender_identifier_type: str = "4"
    receiver_identifier_type: str = "4"

    model_config = {
        "json_schema_extra": {
            "example": {
                "receiver_shortcode": "600000",
                "amount": 10,
                "remarks": "B2B settlement",
                "command_id": "BusinessPayBill",
                "account_reference": "SETTLEMENT-001",
                "sender_identifier_type": "4",
                "receiver_identifier_type": "4",
            },
        },
    }


class TransactionStatusRequest(BaseModel):
    transaction_id: str
    remarks: str = "Transaction status query"
    occasion: str = ""
    identifier_type: str = "4"
    command_id: str = "TransactionStatusQuery"

    model_config = {
        "json_schema_extra": {
            "example": {
                "transaction_id": "OEI2AK4Q16",
                "remarks": "Transaction status query",
                "occasion": "",
                "identifier_type": "4",
                "command_id": "TransactionStatusQuery",
            },
        },
    }


class ReversalRequest(BaseModel):
    transaction_id: str
    amount: int = Field(gt=0)
    remarks: str
    occasion: str = ""
    receiver_party: str | None = None
    receiver_identifier_type: str = "11"
    command_id: str = "TransactionReversal"

    model_config = {
        "json_schema_extra": {
            "example": {
                "transaction_id": "OEI2AK4Q16",
                "amount": 10,
                "remarks": "Reverse duplicate payment",
                "occasion": "",
                "receiver_party": "600000",
                "receiver_identifier_type": "11",
                "command_id": "TransactionReversal",
            },
        },
    }


class AccountBalanceRequest(BaseModel):
    remarks: str = "Account balance query"
    identifier_type: str = "4"
    command_id: str = "AccountBalance"

    model_config = {
        "json_schema_extra": {
            "example": {
                "remarks": "Account balance query",
                "identifier_type": "4",
                "command_id": "AccountBalance",
            },
        },
    }


class RatibaRequest(BaseModel):
    payload: dict[str, Any]

    model_config = {
        "json_schema_extra": {
            "example": {
                "payload": {
                    "StandingOrderName": "Rent Collection",
                    "StartDate": "20260827090000",
                    "Frequency": "Monthly",
                    "Amount": "1000",
                    "CallBackURL": "https://example.com/callbacks/payments/ratiba",
                },
            },
        },
    }


class DynamicQrCodeGenerateRequest(BaseModel):
    MerchantName: str
    RefNo: str
    Amount: str
    TrxCode: str
    CPI: str
    Size: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "MerchantName": "Demo Store",
                "RefNo": "INV1001",
                "Amount": "10",
                "TrxCode": "BG",
                "CPI": "174379",
                "Size": "300",
            },
        },
    }


class BillManagerCreateSingleInvoiceRequest(BaseModel):
    externalReference: str
    billedFullName: str
    billedPhoneNumber: str
    billedPeriod: str
    invoiceName: str
    dueDate: str
    accountReference: str
    amount: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "externalReference": "INV-1001",
                "billedFullName": "Jane Doe",
                "billedPhoneNumber": "254714415034",
                "billedPeriod": "2026-08",
                "invoiceName": "Utility Bill",
                "dueDate": "2026-08-31",
                "accountReference": "ACC-1001",
                "amount": "1500",
            },
        },
    }


class BillManagerCreateBulkInvoicesRequest(BaseModel):
    invoices: list[dict[str, Any]]

    model_config = {
        "json_schema_extra": {
            "example": {
                "invoices": [
                    {
                        "externalReference": "INV-1001",
                        "billedFullName": "Jane Doe",
                        "billedPhoneNumber": "254714415034",
                        "billedPeriod": "2026-08",
                        "invoiceName": "Utility Bill",
                        "dueDate": "2026-08-31",
                        "accountReference": "ACC-1001",
                        "amount": "1500",
                    },
                ],
            },
        },
    }


class BillManagerCancelInvoiceRequest(BaseModel):
    externalReference: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "externalReference": "INV-1001",
            },
        },
    }


class PullTransactionsQueryRequest(BaseModel):
    ShortCode: str = Field(
        description="Business shortcode configured for Pull Transactions.",
    )
    StartDate: str = Field(
        description="Query start datetime in Safaricom format YYYY-MM-DD HH:MM:SS.",
    )
    EndDate: str = Field(
        description="Query end datetime in Safaricom format YYYY-MM-DD HH:MM:SS.",
    )
    OffSetValue: str = Field(
        default="0",
        description="Pagination offset as a string, usually '0' for the first page.",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "ShortCode": "174379",
                "StartDate": "2026-08-26 00:00:00",
                "EndDate": "2026-08-26 23:59:59",
                "OffSetValue": "0",
            },
        },
    }

    @field_validator("StartDate", "EndDate")
    @classmethod
    def validate_pull_transactions_datetime(cls, value: str) -> str:
        try:
            datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
        except ValueError as error:
            raise ValueError(
                "Pull Transactions dates must use format YYYY-MM-DD HH:MM:SS",
            ) from error
        return value


class PullTransactionsRegisterRequest(BaseModel):
    ShortCode: str | None = None
    RequestType: str | None = None
    NominatedNumber: str | None = None
    CallBackURL: str | None = None

    model_config = {
        "json_schema_extra": {
            "example": {},
            "examples": [
                {
                    "ShortCode": "174379",
                    "RequestType": "Pull",
                    "NominatedNumber": "254722000000",
                    "CallBackURL": "https://example.com/callbacks/payments/pull-transactions",
                },
            ],
        },
    }


class MobileNumberValidationCheckAtiRequest(BaseModel):
    phoneNumber: str

    model_config = {
        "json_schema_extra": {
            "example": {
                "phoneNumber": "254714415034",
            },
        },
    }


@router.get("/token")
def mpesa_token(x_api_key: str = Header(...)) -> dict[str, str]:
    verify_internal_api_key(x_api_key)
    try:
        return {"access_token": get_access_token()}
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/stk-push")
def mpesa_stk_push(
    payload: StkPushRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return initiate_stk_push(
            phone_number=payload.phone_number,
            amount=payload.amount,
            account_reference=payload.account_reference,
            transaction_desc=payload.transaction_desc,
            transaction_type=payload.transaction_type,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/stk-query")
def mpesa_stk_query(
    payload: StkQueryRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return query_stk_push(payload.checkout_request_id)
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/c2b/register")
def mpesa_c2b_register(
    payload: C2BRegisterRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return register_c2b_urls(response_type=payload.response_type)
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/c2b/simulate")
def mpesa_c2b_simulate(
    payload: C2BSimulateRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return simulate_c2b_payment(
            amount=payload.amount,
            phone_number=payload.phone_number,
            bill_ref_number=payload.bill_ref_number,
            command_id=payload.command_id,
            shortcode=payload.shortcode,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/b2c")
def mpesa_b2c(
    payload: B2CRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return send_b2c_payment(
            phone_number=payload.phone_number,
            amount=payload.amount,
            remarks=payload.remarks,
            command_id=payload.command_id,
            occasion=payload.occasion,
            originator_conversation_id=payload.originator_conversation_id,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/b2pochi-prod")
def mpesa_b2pochi_prod(
    payload: B2PochiProdRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return send_b2pochi_payment(
            phone_number=payload.phone_number,
            amount=payload.amount,
            remarks=payload.remarks,
            command_id=payload.command_id,
            occasion=payload.occasion,
            originator_conversation_id=payload.originator_conversation_id,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/b2b")
def mpesa_b2b(
    payload: B2BRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return send_b2b_payment(
            receiver_shortcode=payload.receiver_shortcode,
            amount=payload.amount,
            remarks=payload.remarks,
            command_id=payload.command_id,
            account_reference=payload.account_reference,
            sender_identifier_type=payload.sender_identifier_type,
            receiver_identifier_type=payload.receiver_identifier_type,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/transaction-status")
def mpesa_transaction_status(
    payload: TransactionStatusRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return query_transaction_status(
            transaction_id=payload.transaction_id,
            remarks=payload.remarks,
            occasion=payload.occasion,
            identifier_type=payload.identifier_type,
            command_id=payload.command_id,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/reversal")
def mpesa_reversal(
    payload: ReversalRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return reverse_transaction(
            transaction_id=payload.transaction_id,
            amount=payload.amount,
            remarks=payload.remarks,
            occasion=payload.occasion,
            receiver_party=payload.receiver_party,
            receiver_identifier_type=payload.receiver_identifier_type,
            command_id=payload.command_id,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/account-balance")
def mpesa_account_balance(
    payload: AccountBalanceRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return query_account_balance(
            remarks=payload.remarks,
            identifier_type=payload.identifier_type,
            command_id=payload.command_id,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/ratiba")
def mpesa_ratiba(
    payload: RatibaRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return create_ratiba_standing_order(payload.payload)
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/dynamic-qrcode/generate")
def mpesa_dynamic_qrcode_generate(
    payload: DynamicQrCodeGenerateRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return generate_dynamic_qrcode(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/bill-manager/invoices/create-single")
def mpesa_bill_manager_create_single_invoice(
    payload: BillManagerCreateSingleInvoiceRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return create_bill_manager_single_invoice(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/bill-manager/invoices/create-bulk")
def mpesa_bill_manager_create_bulk_invoices(
    payload: BillManagerCreateBulkInvoicesRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return create_bill_manager_bulk_invoices(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/bill-manager/invoices/cancel-single")
def mpesa_bill_manager_cancel_single_invoice(
    payload: BillManagerCancelInvoiceRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return cancel_bill_manager_single_invoice(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/bill-manager/invoices/cancel-bulk")
def mpesa_bill_manager_cancel_bulk_invoices(
    payload: BillManagerCancelInvoiceRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return cancel_bill_manager_bulk_invoices(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/pull-transactions/query")
def mpesa_pull_transactions_query(
    payload: PullTransactionsQueryRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return query_pull_transactions(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/pull-transactions/register")
def mpesa_pull_transactions_register(
    payload: PullTransactionsRegisterRequest | None = Body(
        default=None,
        openapi_examples={
            "env_defaults": {
                "summary": "Use .env defaults",
                "value": {},
            },
            "override_values": {
                "summary": "Override registration fields",
                "value": {
                    "NominatedNumber": "254722000000",
                    "CallBackURL": "https://example.com/callbacks/payments/pull-transactions",
                },
            },
        },
    ),
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return register_pull_transactions_from_settings(
            payload.model_dump(exclude_none=True) if payload else None,
        )
    except Exception as error:
        handle_mpesa_error(error)
        raise


@router.post("/mobile-number-validation/check-ati")
def mpesa_mobile_number_validation_check_ati(
    payload: MobileNumberValidationCheckAtiRequest,
    x_api_key: str = Header(...),
) -> dict[str, Any]:
    verify_internal_api_key(x_api_key)
    try:
        return check_ati_mobile_number(payload.model_dump())
    except Exception as error:
        handle_mpesa_error(error)
        raise
