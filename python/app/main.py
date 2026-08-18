import logging

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.mpesa import router as mpesa_router
from app.callbacks.mpesa import router as mpesa_callback_router
from app.config import settings


class SuppressRootHeadAccessLog(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if record.name != "uvicorn.access":
            return True

        if isinstance(record.args, tuple) and len(record.args) >= 5:
            method = str(record.args[1])
            path = str(record.args[2])
            if method == "HEAD" and path == "/":
                return False

        return '"HEAD / HTTP/' not in record.getMessage()


def configure_access_log_filters() -> None:
    access_logger = logging.getLogger("uvicorn.access")
    root_head_filter = SuppressRootHeadAccessLog()
    access_logger.addFilter(root_head_filter)

    for handler in access_logger.handlers:
        handler.addFilter(root_head_filter)


logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
configure_access_log_filters()

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
)

app.include_router(health_router)
app.include_router(mpesa_router, prefix=settings.API_V1_PREFIX)
app.include_router(mpesa_callback_router)
