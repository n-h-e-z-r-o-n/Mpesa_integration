import logging

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.mpesa import router as mpesa_router
from app.callbacks.mpesa import router as mpesa_callback_router
from app.config import settings


logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
)

app.include_router(health_router)
app.include_router(mpesa_router, prefix=settings.API_V1_PREFIX)
app.include_router(mpesa_callback_router)
