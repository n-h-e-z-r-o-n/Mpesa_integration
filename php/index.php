<?php
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if (strpos($requestUri, '/api/mpesa/') === 0) {
    require __DIR__ . '/api/index.php';
    exit;
}

if (strpos($requestUri, '/callbacks/payments/') === 0) {
    require __DIR__ . '/callbacks/index.php';
    exit;
}

// Landing page / Documentation
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>M-Pesa PHP API</title>
    <style>
        body { font-family: system-ui, sans-serif; background: #f9fafb; color: #111827; padding: 2rem; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        h1 { color: #2563eb; }
        pre { background: #1f2937; color: #60a5fa; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        code { font-family: monospace; }
        .endpoint { background: #f3f4f6; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; border-left: 4px solid #3b82f6; }
    </style>
</head>
<body>
    <div class="container">
        <h1>M-Pesa PHP API Documentation</h1>
        <p>This is the native PHP implementation of the M-Pesa integration.</p>
        
        <h2>Authentication</h2>
        <p>All endpoints require the <code>x-api-key</code> header to match the <code>INTERNAL_API_KEY</code> in your <code>.env</code> file.</p>
        <pre>x-api-key: change-me</pre>
        
        <h2>Test (cURL Example)</h2>
        <p>You can run this PHP server locally using <code>php -S localhost:8000 index.php</code>.</p>
        <pre>curl -X POST http://localhost:8000/api/mpesa/stk-push \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me" \
  -d '{
    "phone_number": "254714415034",
    "amount": 10,
    "account_reference": "TestRef",
    "transaction_desc": "Test Payment"
  }'</pre>
        
        <h2>Available Endpoints</h2>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/stk-push</code> - Initiate STK Push</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/stk-query</code> - Query STK Push</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/b2c</code> - B2C Payment</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/b2b</code> - B2B Payment</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/c2b/simulate</code> - Simulate C2B</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/account-balance</code> - Account Balance</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/reversal</code> - Transaction Reversal</div>
        <div class="endpoint"><strong>POST</strong> <code>/api/mpesa/transaction-status</code> - Transaction Status</div>
    </div>
</body>
</html>
