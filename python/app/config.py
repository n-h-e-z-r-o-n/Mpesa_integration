from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Company Payment Gateway"
    APP_ENV: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    INTERNAL_API_KEY: str
    PUBLIC_BASE_URL: str

    MPESA_BASE_URL: str = "https://api.safaricom.co.ke"
    MPESA_CONSUMER_KEY: str
    MPESA_CONSUMER_SECRET: str
    MPESA_SHORTCODE: str
    MPESA_TILL_NO:str
    MPESA_PASSKEY: str
    MPESA_INITIATOR_NAME: str | None = None
    MPESA_SECURITY_CREDENTIAL: str | None = None

    HTTP_CONNECT_TIMEOUT: float = 5.0
    HTTP_READ_TIMEOUT: float = 30.0

    MPESA_STK_CALLBACK_URL: str | None = None
    MPESA_C2B_CONFIRMATION_URL: str | None = None
    MPESA_C2B_VALIDATION_URL: str | None = None
    MPESA_AUTH_PATH: str = "/oauth/v1/generate?grant_type=client_credentials"
    MPESA_STK_PUSH_PATH: str = "/mpesa/stkpush/v1/processrequest"
    MPESA_STK_QUERY_PATH: str = "/mpesa/stkpushquery/v1/query"
    MPESA_C2B_REGISTER_PATH: str = "/mpesa/c2b/v2/registerurl"
    MPESA_C2B_SIMULATE_PATH: str = "/mpesa/c2b/v2/simulate"
    MPESA_B2C_PATH: str = "/mpesa/b2c/v3/paymentrequest"
    MPESA_B2POCHI_PATH: str = "/mpesa/b2c/v1/paymentrequest"
    MPESA_B2B_PATH: str = "/mpesa/b2b/v1/paymentrequest"
    MPESA_TRANSACTION_STATUS_PATH: str = "/mpesa/transactionstatus/v1/query"
    MPESA_REVERSAL_PATH: str = "/mpesa/reversal/v1/request"
    MPESA_ACCOUNT_BALANCE_PATH: str = "/mpesa/accountbalance/v1/query"
    MPESA_RATIBA_PATH: str = "/standingorder/v1/createStandingOrderExternal"

    MPESA_B2C_RESULT_URL: str | None = None
    MPESA_B2C_TIMEOUT_URL: str | None = None
    MPESA_B2B_RESULT_URL: str | None = None
    MPESA_B2B_TIMEOUT_URL: str | None = None
    MPESA_TRANSACTION_STATUS_RESULT_URL: str | None = None
    MPESA_TRANSACTION_STATUS_TIMEOUT_URL: str | None = None
    MPESA_REVERSAL_RESULT_URL: str | None = None
    MPESA_REVERSAL_TIMEOUT_URL: str | None = None
    MPESA_ACCOUNT_BALANCE_RESULT_URL: str | None = None
    MPESA_ACCOUNT_BALANCE_TIMEOUT_URL: str | None = None
    MPESA_RATIBA_CALLBACK_URL: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @staticmethod
    def _build_url(base_url: str, path: str) -> str:
        return f"{base_url.rstrip('/')}{path}"

    @property
    def stk_callback_url(self) -> str:
        return self.MPESA_STK_CALLBACK_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/stk",
        )

    @property
    def c2b_confirmation_url(self) -> str:
        return self.MPESA_C2B_CONFIRMATION_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/c2b/confirmation",
        )

    @property
    def c2b_validation_url(self) -> str:
        return self.MPESA_C2B_VALIDATION_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/c2b/validation",
        )

    @property
    def b2c_result_url(self) -> str:
        return self.MPESA_B2C_RESULT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/b2c/result",
        )

    @property
    def b2c_timeout_url(self) -> str:
        return self.MPESA_B2C_TIMEOUT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/b2c/timeout",
        )

    @property
    def b2b_result_url(self) -> str:
        return self.MPESA_B2B_RESULT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/b2b/result",
        )

    @property
    def b2b_timeout_url(self) -> str:
        return self.MPESA_B2B_TIMEOUT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/b2b/timeout",
        )

    @property
    def transaction_status_result_url(self) -> str:
        return self.MPESA_TRANSACTION_STATUS_RESULT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/transaction-status/result",
        )

    @property
    def transaction_status_timeout_url(self) -> str:
        return self.MPESA_TRANSACTION_STATUS_TIMEOUT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/transaction-status/timeout",
        )

    @property
    def reversal_result_url(self) -> str:
        return self.MPESA_REVERSAL_RESULT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/reversal/result",
        )

    @property
    def reversal_timeout_url(self) -> str:
        return self.MPESA_REVERSAL_TIMEOUT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/reversal/timeout",
        )

    @property
    def account_balance_result_url(self) -> str:
        return self.MPESA_ACCOUNT_BALANCE_RESULT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/account-balance/result",
        )

    @property
    def account_balance_timeout_url(self) -> str:
        return self.MPESA_ACCOUNT_BALANCE_TIMEOUT_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/account-balance/timeout",
        )

    @property
    def ratiba_callback_url(self) -> str:
        return self.MPESA_RATIBA_CALLBACK_URL or self._build_url(
            self.PUBLIC_BASE_URL,
            "/callbacks/payments/ratiba",
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
