<?php
require_once __DIR__ . '/../config.php';

class Mpesa {
    private static $accessToken = null;
    private static $tokenExpiresAt = 0;

    public static function getAccessToken() {
        if (self::$accessToken && time() < self::$tokenExpiresAt) {
            return self::$accessToken;
        }

        $url = rtrim(MPESA_BASE_URL, '/') . MPESA_AUTH_PATH;
        $credentials = base64_encode(MPESA_CONSUMER_KEY . ':' . MPESA_CONSUMER_SECRET);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Basic ' . $credentials]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            throw new Exception("M-Pesa authentication failed: " . $response);
        }

        $data = json_decode($response, true);
        if (!isset($data['access_token'])) {
            throw new Exception("M-Pesa response did not include access_token");
        }

        self::$accessToken = $data['access_token'];
        $expiresIn = isset($data['expires_in']) ? (int)$data['expires_in'] : 3599;
        self::$tokenExpiresAt = time() + $expiresIn - 60;

        return self::$accessToken;
    }

    private static function sendPostRequest($path, $payload, $retryOn401 = true) {
        $token = self::getAccessToken();
        $url = rtrim(MPESA_BASE_URL, '/') . $path;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
            'Accept: application/json'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($response, true);

        if ($httpCode === 401 && $retryOn401) {
            self::$accessToken = null;
            self::$tokenExpiresAt = 0;
            return self::sendPostRequest($path, $payload, false);
        }

        if ($httpCode < 200 || $httpCode >= 300) {
            throw new Exception("M-Pesa request failed ($httpCode): " . $response);
        }

        return $data;
    }

    private static function normalizePhone($phone) {
        $phone = preg_replace('/\D/', '', $phone);
        if (strpos($phone, '0') === 0) {
            $phone = '254' . substr($phone, 1);
        } else if (strpos($phone, '7') === 0 || strpos($phone, '1') === 0) {
            $phone = '254' . $phone;
        }
        if (!preg_match('/^254(7|1)\d{8}$/', $phone)) {
            throw new Exception("Invalid Kenyan mobile number");
        }
        return $phone;
    }

    private static function getTimestamp() {
        $datetime = new DateTime("now", new DateTimeZone("Africa/Nairobi"));
        return $datetime->format("YmdHis");
    }

    private static function buildStkPassword($timestamp) {
        return base64_encode(MPESA_SHORTCODE . MPESA_PASSKEY . $timestamp);
    }

    public static function initiateStkPush($phone_number, $amount, $account_reference, $transaction_desc, $transaction_type = "CustomerPayBillOnline") {
        $timestamp = self::getTimestamp();
        $password = self::buildStkPassword($timestamp);
        
        $payload = [
            'BusinessShortCode' => MPESA_SHORTCODE,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => $transaction_type,
            'Amount' => $amount,
            'PartyA' => self::normalizePhone($phone_number),
            'PartyB' => MPESA_TILL_NO ?: MPESA_SHORTCODE,
            'PhoneNumber' => self::normalizePhone($phone_number),
            'CallBackURL' => getCallbackUrl('MPESA_STK_CALLBACK_URL', '/callbacks/payments/stk'),
            'AccountReference' => $account_reference,
            'TransactionDesc' => $transaction_desc
        ];

        return self::sendPostRequest(MPESA_STK_PUSH_PATH, $payload);
    }

    public static function queryStkPush($checkout_request_id) {
        $timestamp = self::getTimestamp();
        $payload = [
            'BusinessShortCode' => MPESA_SHORTCODE,
            'Password' => self::buildStkPassword($timestamp),
            'Timestamp' => $timestamp,
            'CheckoutRequestID' => $checkout_request_id
        ];
        return self::sendPostRequest(MPESA_STK_QUERY_PATH, $payload);
    }

    public static function registerC2BUrls($response_type = "Completed") {
        $payload = [
            'ShortCode' => MPESA_SHORTCODE,
            'ResponseType' => $response_type,
            'ConfirmationURL' => getCallbackUrl('MPESA_C2B_CONFIRMATION_URL', '/callbacks/payments/c2b/confirmation'),
            'ValidationURL' => getCallbackUrl('MPESA_C2B_VALIDATION_URL', '/callbacks/payments/c2b/validation')
        ];
        return self::sendPostRequest(MPESA_C2B_REGISTER_PATH, $payload);
    }

    public static function simulateC2BPayment($amount, $phone_number, $bill_ref_number, $command_id = "CustomerPayBillOnline", $shortcode = null) {
        $payload = [
            'CommandID' => $command_id,
            'Amount' => $amount,
            'Msisdn' => self::normalizePhone($phone_number),
            'BillRefNumber' => $bill_ref_number,
            'ShortCode' => $shortcode ?: MPESA_SHORTCODE
        ];
        return self::sendPostRequest(MPESA_C2B_SIMULATE_PATH, $payload);
    }

    public static function sendB2CPayment($phone_number, $amount, $remarks, $command_id = "BusinessPayment", $occasion = "", $originator_conversation_id = null) {
        $payload = [
            'InitiatorName' => MPESA_INITIATOR_NAME,
            'SecurityCredential' => MPESA_SECURITY_CREDENTIAL,
            'CommandID' => $command_id,
            'Amount' => $amount,
            'PartyA' => MPESA_SHORTCODE,
            'PartyB' => self::normalizePhone($phone_number),
            'Remarks' => $remarks,
            'QueueTimeOutURL' => getCallbackUrl('MPESA_B2C_TIMEOUT_URL', '/callbacks/payments/b2c/timeout'),
            'ResultURL' => getCallbackUrl('MPESA_B2C_RESULT_URL', '/callbacks/payments/b2c/result'),
            'Occasion' => $occasion
        ];
        if ($originator_conversation_id) $payload['OriginatorConversationID'] = $originator_conversation_id;
        return self::sendPostRequest(MPESA_B2C_PATH, $payload);
    }

    public static function sendB2BPayment($receiver_shortcode, $amount, $remarks, $command_id = "BusinessPayBill", $account_reference = "", $sender_identifier_type = "4", $receiver_identifier_type = "4") {
        $payload = [
            'Initiator' => MPESA_INITIATOR_NAME,
            'SecurityCredential' => MPESA_SECURITY_CREDENTIAL,
            'CommandID' => $command_id,
            'SenderIdentifierType' => $sender_identifier_type,
            'RecieverIdentifierType' => $receiver_identifier_type,
            'Amount' => $amount,
            'PartyA' => MPESA_SHORTCODE,
            'PartyB' => $receiver_shortcode,
            'AccountReference' => $account_reference,
            'Remarks' => $remarks,
            'QueueTimeOutURL' => getCallbackUrl('MPESA_B2B_TIMEOUT_URL', '/callbacks/payments/b2b/timeout'),
            'ResultURL' => getCallbackUrl('MPESA_B2B_RESULT_URL', '/callbacks/payments/b2b/result')
        ];
        return self::sendPostRequest(MPESA_B2B_PATH, $payload);
    }

    public static function queryTransactionStatus($transaction_id, $remarks = "Query", $occasion = "", $identifier_type = "4", $command_id = "TransactionStatusQuery") {
        $payload = [
            'Initiator' => MPESA_INITIATOR_NAME,
            'SecurityCredential' => MPESA_SECURITY_CREDENTIAL,
            'CommandID' => $command_id,
            'TransactionID' => $transaction_id,
            'PartyA' => MPESA_SHORTCODE,
            'IdentifierType' => $identifier_type,
            'ResultURL' => getCallbackUrl('MPESA_TRANSACTION_STATUS_RESULT_URL', '/callbacks/payments/transaction-status/result'),
            'QueueTimeOutURL' => getCallbackUrl('MPESA_TRANSACTION_STATUS_TIMEOUT_URL', '/callbacks/payments/transaction-status/timeout'),
            'Remarks' => $remarks,
            'Occasion' => $occasion
        ];
        return self::sendPostRequest(MPESA_TRANSACTION_STATUS_PATH, $payload);
    }

    public static function reverseTransaction($transaction_id, $amount, $remarks, $occasion = "", $receiver_party = null, $receiver_identifier_type = "11", $command_id = "TransactionReversal") {
        $payload = [
            'Initiator' => MPESA_INITIATOR_NAME,
            'SecurityCredential' => MPESA_SECURITY_CREDENTIAL,
            'CommandID' => $command_id,
            'TransactionID' => $transaction_id,
            'Amount' => $amount,
            'ReceiverParty' => $receiver_party ?: MPESA_SHORTCODE,
            'RecieverIdentifierType' => $receiver_identifier_type,
            'ResultURL' => getCallbackUrl('MPESA_REVERSAL_RESULT_URL', '/callbacks/payments/reversal/result'),
            'QueueTimeOutURL' => getCallbackUrl('MPESA_REVERSAL_TIMEOUT_URL', '/callbacks/payments/reversal/timeout'),
            'Remarks' => $remarks,
            'Occasion' => $occasion
        ];
        return self::sendPostRequest(MPESA_REVERSAL_PATH, $payload);
    }

    public static function queryAccountBalance($remarks = "Query", $identifier_type = "4", $command_id = "AccountBalance") {
        $payload = [
            'Initiator' => MPESA_INITIATOR_NAME,
            'SecurityCredential' => MPESA_SECURITY_CREDENTIAL,
            'CommandID' => $command_id,
            'PartyA' => MPESA_SHORTCODE,
            'IdentifierType' => $identifier_type,
            'Remarks' => $remarks,
            'QueueTimeOutURL' => getCallbackUrl('MPESA_ACCOUNT_BALANCE_TIMEOUT_URL', '/callbacks/payments/account-balance/timeout'),
            'ResultURL' => getCallbackUrl('MPESA_ACCOUNT_BALANCE_RESULT_URL', '/callbacks/payments/account-balance/result')
        ];
        return self::sendPostRequest(MPESA_ACCOUNT_BALANCE_PATH, $payload);
    }

    public static function createRatibaStandingOrder($payload) {
        return self::sendPostRequest(MPESA_RATIBA_PATH, $payload);
    }

    public static function generateDynamicQrcode($payload) {
        return self::sendPostRequest(MPESA_DYNAMIC_QRCODE_PATH, $payload);
    }

    public static function createBillManagerSingleInvoice($payload) {
        return self::sendPostRequest(Config::get('MPESA_BILL_MANAGER_CREATE_SINGLE_INVOICE_PATH', MPESA_BILL_MANAGER_PATH), $payload);
    }

    public static function queryPullTransactions($payload) {
        return self::sendPostRequest(Config::get('MPESA_PULL_TRANSACTIONS_QUERY_PATH', '/pulltransactions/v1/query'), $payload);
    }
}
