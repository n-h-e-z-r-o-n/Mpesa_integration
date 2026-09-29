<?php
require_once __DIR__ . '/../src/Mpesa.php';

header("Content-Type: application/json");

// Handle authentication
$headers = getallheaders();
$apiKey = $headers['x-api-key'] ?? $headers['X-Api-Key'] ?? '';
if ($apiKey !== INTERNAL_API_KEY) {
    http_response_code(401);
    echo json_encode(['detail' => 'Invalid internal API key']);
    exit;
}

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/api/mpesa/', $requestUri);
$endpoint = end($pathParts);

$method = $_SERVER['REQUEST_METHOD'];
$payload = json_decode(file_get_contents('php://input'), true) ?: [];

try {
    if ($method === 'GET' && $endpoint === 'token') {
        echo json_encode(['access_token' => Mpesa::getAccessToken()]);
        exit;
    }

    if ($method !== 'POST') {
        http_response_code(405);
        echo json_encode(['detail' => 'Method not allowed']);
        exit;
    }

    switch ($endpoint) {
        case 'stk-push':
            $res = Mpesa::initiateStkPush($payload['phone_number'], $payload['amount'], $payload['account_reference'], $payload['transaction_desc'], $payload['transaction_type'] ?? 'CustomerPayBillOnline');
            break;
        case 'stk-query':
            $res = Mpesa::queryStkPush($payload['checkout_request_id']);
            break;
        case 'c2b/register':
            $res = Mpesa::registerC2BUrls($payload['response_type'] ?? 'Completed');
            break;
        case 'c2b/simulate':
            $res = Mpesa::simulateC2BPayment($payload['amount'], $payload['phone_number'], $payload['bill_ref_number'], $payload['command_id'] ?? 'CustomerPayBillOnline', $payload['shortcode'] ?? null);
            break;
        case 'b2c':
            $res = Mpesa::sendB2CPayment($payload['phone_number'], $payload['amount'], $payload['remarks'], $payload['command_id'] ?? 'BusinessPayment', $payload['occasion'] ?? '', $payload['originator_conversation_id'] ?? null);
            break;
        case 'b2b':
            $res = Mpesa::sendB2BPayment($payload['receiver_shortcode'], $payload['amount'], $payload['remarks'], $payload['command_id'] ?? 'BusinessPayBill', $payload['account_reference'] ?? '', $payload['sender_identifier_type'] ?? '4', $payload['receiver_identifier_type'] ?? '4');
            break;
        case 'transaction-status':
            $res = Mpesa::queryTransactionStatus($payload['transaction_id'], $payload['remarks'] ?? 'Query', $payload['occasion'] ?? '', $payload['identifier_type'] ?? '4', $payload['command_id'] ?? 'TransactionStatusQuery');
            break;
        case 'reversal':
            $res = Mpesa::reverseTransaction($payload['transaction_id'], $payload['amount'], $payload['remarks'], $payload['occasion'] ?? '', $payload['receiver_party'] ?? null, $payload['receiver_identifier_type'] ?? '11', $payload['command_id'] ?? 'TransactionReversal');
            break;
        case 'account-balance':
            $res = Mpesa::queryAccountBalance($payload['remarks'] ?? 'Query', $payload['identifier_type'] ?? '4', $payload['command_id'] ?? 'AccountBalance');
            break;
        default:
            http_response_code(404);
            echo json_encode(['detail' => 'Endpoint not found']);
            exit;
    }

    echo json_encode($res);
} catch (Exception $e) {
    http_response_code(502);
    echo json_encode(['detail' => $e->getMessage()]);
}
