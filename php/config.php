<?php

class Config {
    private static $env = [];

    public static function loadEnv($path) {
        if (!file_exists($path)) return;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos(trim($line), '#') === 0) continue;
            list($name, $value) = explode('=', $line, 2);
            self::$env[trim($name)] = trim($value);
        }
    }

    public static function get($key, $default = null) {
        return self::$env[$key] ?? getenv($key) ?: $default;
    }
}

Config::loadEnv(__DIR__ . '/.env');

define('MPESA_BASE_URL', Config::get('MPESA_BASE_URL', 'https://sandbox.safaricom.co.ke'));
define('MPESA_CONSUMER_KEY', Config::get('MPESA_CONSUMER_KEY', ''));
define('MPESA_CONSUMER_SECRET', Config::get('MPESA_CONSUMER_SECRET', ''));
define('MPESA_SHORTCODE', Config::get('MPESA_SHORTCODE', ''));
define('MPESA_PASSKEY', Config::get('MPESA_PASSKEY', ''));
define('MPESA_TILL_NO', Config::get('MPESA_TILL_NO', ''));
define('MPESA_INITIATOR_NAME', Config::get('MPESA_INITIATOR_NAME', ''));
define('MPESA_SECURITY_CREDENTIAL', Config::get('MPESA_SECURITY_CREDENTIAL', ''));
define('INTERNAL_API_KEY', Config::get('INTERNAL_API_KEY', ''));
define('PUBLIC_BASE_URL', Config::get('PUBLIC_BASE_URL', ''));

// Paths
define('MPESA_AUTH_PATH', Config::get('MPESA_AUTH_PATH', '/oauth/v1/generate?grant_type=client_credentials'));
define('MPESA_STK_PUSH_PATH', Config::get('MPESA_STK_PUSH_PATH', '/mpesa/stkpush/v1/processrequest'));
define('MPESA_STK_QUERY_PATH', Config::get('MPESA_STK_QUERY_PATH', '/mpesa/stkpushquery/v1/query'));
define('MPESA_C2B_REGISTER_PATH', Config::get('MPESA_C2B_REGISTER_PATH', '/mpesa/c2b/v2/registerurl'));
define('MPESA_C2B_SIMULATE_PATH', Config::get('MPESA_C2B_SIMULATE_PATH', '/mpesa/c2b/v1/simulate'));
define('MPESA_B2C_PATH', Config::get('MPESA_B2C_PATH', '/mpesa/b2c/v3/paymentrequest'));
define('MPESA_B2POCHI_PATH', Config::get('MPESA_B2POCHI_PATH', '/mpesa/b2pochi/v1/paymentrequest'));
define('MPESA_B2B_PATH', Config::get('MPESA_B2B_PATH', '/mpesa/b2b/v3/paymentrequest'));
define('MPESA_DYNAMIC_QRCODE_PATH', Config::get('MPESA_DYNAMIC_QRCODE_PATH', '/mpesa/qrcode/v1/generate'));
define('MPESA_TRANSACTION_STATUS_PATH', Config::get('MPESA_TRANSACTION_STATUS_PATH', '/mpesa/transactionstatus/v1/query'));
define('MPESA_REVERSAL_PATH', Config::get('MPESA_REVERSAL_PATH', '/mpesa/reversal/v1/request'));
define('MPESA_ACCOUNT_BALANCE_PATH', Config::get('MPESA_ACCOUNT_BALANCE_PATH', '/mpesa/accountbalance/v1/query'));
define('MPESA_RATIBA_PATH', Config::get('MPESA_RATIBA_PATH', '/standingorder/v1/createStandingOrderExternal'));

function getCallbackUrl($key, $defaultPath) {
    $url = Config::get($key);
    if ($url) return $url;
    return rtrim(PUBLIC_BASE_URL, '/') . $defaultPath;
}
