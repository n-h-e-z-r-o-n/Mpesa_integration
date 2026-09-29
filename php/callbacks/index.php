<?php
header("Content-Type: application/json");

$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/callbacks/payments/', $requestUri);
$endpoint = end($pathParts);

$callbackName = str_replace('/', '_', $endpoint);
if (!$callbackName) {
    $callbackName = 'unknown';
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true) ?: ['raw_body' => $rawBody];

$callbackDir = __DIR__ . '/../callback_data';
if (!is_dir($callbackDir)) {
    mkdir($callbackDir, 0777, true);
}

$enrichedPayload = [
    'callback_name' => $callbackName,
    'received_at_utc' => gmdate('Y-m-d\TH:i:s\Z'),
    'payload' => $payload
];

$file = $callbackDir . '/' . $callbackName . '_latest.json';
file_put_contents($file, json_encode($enrichedPayload, JSON_PRETTY_PRINT));

echo json_encode([
    'ResultCode' => 0,
    'ResultDesc' => 'Accepted'
]);
