from typing import Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.providers.mpesa.account_balance import query_account_balance
from app.providers.mpesa.auth import get_access_token
from app.providers.mpesa.b2b import send_b2b_payment
from app.providers.mpesa.b2c import send_b2c_payment
from app.providers.mpesa.b2pochi_prod import send_b2pochi_payment
from app.providers.mpesa.c2b_register import register_c2b_urls
from app.providers.mpesa.c2b_simulate import simulate_c2b_payment
from app.providers.mpesa.common import MpesaError
from app.providers.mpesa.ratiba import create_ratiba_standing_order
from app.providers.mpesa.reversal import reverse_transaction
from app.providers.mpesa.stk_push import initiate_stk_push
from app.providers.mpesa.stk_query import query_stk_push
from app.providers.mpesa.transaction_status import query_transaction_status


router = APIRouter(prefix="/mpesa", tags=["mpesa"])


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
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error

    raise error


class StkPushRequest(BaseModel):
    phone_number: str
    amount: int = Field(gt=0)
    account_reference: str
    transaction_desc: str
    transaction_type: str = "CustomerPayBillOnline"


class StkQueryRequest(BaseModel):
    checkout_request_id: str


class C2BRegisterRequest(BaseModel):
    response_type: str = "Completed"


class C2BSimulateRequest(BaseModel):
    amount: int = Field(gt=0)
    phone_number: str
    bill_ref_number: str
    command_id: str = "CustomerPayBillOnline"
    shortcode: str | None = None


class B2CRequest(BaseModel):
    phone_number: str
    amount: int = Field(gt=0)
    remarks: str
    command_id: str = "BusinessPayment"
    occasion: str = ""
    originator_conversation_id: str | None = None


class B2PochiProdRequest(BaseModel):
    phone_number: str
    amount: int = Field(gt=0)
    remarks: str
    command_id: str = "BusinessPayment"
    occasion: str = ""
    originator_conversation_id: str | None = None


class B2BRequest(BaseModel):
    receiver_shortcode: str
    amount: int = Field(gt=0)
    remarks: str
    command_id: str = "BusinessPayBill"
    account_reference: str = ""
    sender_identifier_type: str = "4"
    receiver_identifier_type: str = "4"


class TransactionStatusRequest(BaseModel):
    transaction_id: str
    remarks: str = "Transaction status query"
    occasion: str = ""
    identifier_type: str = "4"
    command_id: str = "TransactionStatusQuery"


class ReversalRequest(BaseModel):
    transaction_id: str
    amount: int = Field(gt=0)
    remarks: str
    occasion: str = ""
    receiver_party: str | None = None
    receiver_identifier_type: str = "11"
    command_id: str = "TransactionReversal"


class AccountBalanceRequest(BaseModel):
    remarks: str = "Account balance query"
    identifier_type: str = "4"
    command_id: str = "AccountBalance"


class RatibaRequest(BaseModel):
    payload: dict[str, Any]


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
