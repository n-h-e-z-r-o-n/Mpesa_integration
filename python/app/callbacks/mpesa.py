import logging
from typing import Any

from fastapi import APIRouter, Request


logger = logging.getLogger("app.callbacks.mpesa")
router = APIRouter(tags=["mpesa-callbacks"])


async def log_callback(request: Request, callback_name: str) -> dict[str, Any]:
    try:
        payload = await request.json()
    except Exception:
        payload = {"raw_body": (await request.body()).decode("utf-8", errors="ignore")}
    logger.info("Received %s callback: %s", callback_name, payload)
    return payload


def accepted_response() -> dict[str, Any]:
    return {
        "ResultCode": 0,
        "ResultDesc": "Accepted",
    }


@router.post("/callbacks/mpesa/stk")
async def stk_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "stk")
    return accepted_response()


@router.post("/callbacks/mpesa/c2b/confirmation")
async def c2b_confirmation_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "c2b_confirmation")
    return accepted_response()


@router.post("/callbacks/mpesa/c2b/validation")
async def c2b_validation_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "c2b_validation")
    return accepted_response()


@router.post("/callbacks/mpesa/b2c/result")
async def b2c_result_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "b2c_result")
    return accepted_response()


@router.post("/callbacks/mpesa/b2c/timeout")
async def b2c_timeout_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "b2c_timeout")
    return accepted_response()


@router.post("/callbacks/mpesa/b2b/result")
async def b2b_result_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "b2b_result")
    return accepted_response()


@router.post("/callbacks/mpesa/b2b/timeout")
async def b2b_timeout_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "b2b_timeout")
    return accepted_response()


@router.post("/callbacks/mpesa/transaction-status/result")
async def transaction_status_result_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "transaction_status_result")
    return accepted_response()


@router.post("/callbacks/mpesa/transaction-status/timeout")
async def transaction_status_timeout_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "transaction_status_timeout")
    return accepted_response()


@router.post("/callbacks/mpesa/reversal/result")
async def reversal_result_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "reversal_result")
    return accepted_response()


@router.post("/callbacks/mpesa/reversal/timeout")
async def reversal_timeout_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "reversal_timeout")
    return accepted_response()


@router.post("/callbacks/mpesa/account-balance/result")
async def account_balance_result_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "account_balance_result")
    return accepted_response()


@router.post("/callbacks/mpesa/account-balance/timeout")
async def account_balance_timeout_callback(request: Request) -> dict[str, Any]:
    await log_callback(request, "account_balance_timeout")
    return accepted_response()
