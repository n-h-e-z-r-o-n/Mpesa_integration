import unittest

from fastapi import HTTPException

from app.api.mpesa import handle_mpesa_error
from app.providers.mpesa.common import MpesaRequestError, build_mpesa_error_message


class MpesaErrorHandlingTests(unittest.TestCase):
    def test_build_mpesa_error_message_includes_status_code_and_response_fields(self) -> None:
        message = build_mpesa_error_message(
            "M-Pesa request failed",
            status_code=400,
            response={
                "errorCode": "400.002.02",
                "errorMessage": "Bad Request - Invalid Remarks",
            },
        )

        self.assertEqual(
            message,
            "M-Pesa request failed (status 400) code=400.002.02 message=Bad Request - Invalid Remarks",
        )

    def test_handle_mpesa_error_preserves_upstream_response_details(self) -> None:
        error = MpesaRequestError(
            "M-Pesa request failed (status 400) code=2001 message=Invalid initiator",
            status_code=400,
            response={
                "errorCode": "2001",
                "errorMessage": "Invalid initiator",
            },
        )

        with self.assertRaises(HTTPException) as context:
            handle_mpesa_error(error)

        exception = context.exception
        self.assertEqual(exception.status_code, 502)
        self.assertEqual(
            exception.detail,
            {
                "message": "M-Pesa request failed (status 400) code=2001 message=Invalid initiator",
                "mpesa_status_code": 400,
                "mpesa_response": {
                    "errorCode": "2001",
                    "errorMessage": "Invalid initiator",
                },
            },
        )


if __name__ == "__main__":
    unittest.main()
