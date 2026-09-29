'use client';

import React, { useState } from 'react';

const endpoints = [
  {
    id: 'token',
    title: 'Generate Token',
    path: '/api/mpesa/token',
    method: 'GET',
    description: 'Fetch the OAuth access token to be used for M-Pesa requests. The SDK handles this automatically, but you can request it manually if needed.',
    payload: null
  },
  {
    id: 'stk-push',
    title: 'STK Push (Lipa Na M-Pesa)',
    path: '/api/mpesa/stk-push',
    method: 'POST',
    description: 'Initiate a prompt on the customer\'s phone to enter their PIN and approve a payment.',
    payload: {
      phone_number: "254714415034",
      amount: 10,
      account_reference: "INV1001",
      transaction_desc: "Payment for order INV1001"
    }
  },
  {
    id: 'stk-query',
    title: 'STK Push Query',
    path: '/api/mpesa/stk-query',
    method: 'POST',
    description: 'Check the status of a previously initiated STK Push request.',
    payload: {
      checkout_request_id: "ws_CO_260820261200001234567890"
    }
  },
  {
    id: 'c2b-register',
    title: 'C2B Register URLs',
    path: '/api/mpesa/c2b/register',
    method: 'POST',
    description: 'Register the Validation and Confirmation URLs for Customer to Business (C2B) payments.',
    payload: {
      response_type: "Completed"
    }
  },
  {
    id: 'c2b-simulate',
    title: 'C2B Simulate',
    path: '/api/mpesa/c2b/simulate',
    method: 'POST',
    description: 'Simulate a payment from a customer to your paybill/till number.',
    payload: {
      amount: 10,
      phone_number: "254714415034",
      bill_ref_number: "INV1001",
      command_id: "CustomerPayBillOnline"
    }
  },
  {
    id: 'b2c',
    title: 'B2C (Business to Customer)',
    path: '/api/mpesa/b2c',
    method: 'POST',
    description: 'Send money from your business paybill/till to a customer\'s mobile wallet.',
    payload: {
      phone_number: "254714415034",
      amount: 10,
      remarks: "Payout for August promotion",
      command_id: "BusinessPayment",
      occasion: "Promo payout"
    }
  },
  {
    id: 'b2b',
    title: 'B2B (Business to Business)',
    path: '/api/mpesa/b2b',
    method: 'POST',
    description: 'Send money from your business to another business paybill/till.',
    payload: {
      receiver_shortcode: "600000",
      amount: 10,
      remarks: "B2B settlement",
      command_id: "BusinessPayBill",
      account_reference: "SETTLEMENT-001"
    }
  },
  {
    id: 'transaction-status',
    title: 'Transaction Status',
    path: '/api/mpesa/transaction-status',
    method: 'POST',
    description: 'Check the status of a specific B2B, B2C, or C2B transaction.',
    payload: {
      transaction_id: "OEI2AK4Q16",
      remarks: "Transaction status query"
    }
  },
  {
    id: 'reversal',
    title: 'Transaction Reversal',
    path: '/api/mpesa/reversal',
    method: 'POST',
    description: 'Reverse an M-Pesa transaction.',
    payload: {
      transaction_id: "OEI2AK4Q16",
      amount: 10,
      remarks: "Reverse duplicate payment",
      receiver_party: "600000"
    }
  },
  {
    id: 'account-balance',
    title: 'Account Balance',
    path: '/api/mpesa/account-balance',
    method: 'POST',
    description: 'Request the account balance of a shortcode.',
    payload: {
      remarks: "Account balance query"
    }
  }
];

export default function Home() {
  const [activeTab, setActiveTab] = useState(endpoints[1].id); // Default to STK Push

  const activeEndpoint = endpoints.find(ep => ep.id === activeTab) || endpoints[0];

  const getCurlCommand = (ep: typeof endpoints[0]) => {
    let curl = `curl -X ${ep.method} http://localhost:3000${ep.path} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: change-me"`;
    
    if (ep.payload) {
      curl += ` \\
  -d '${JSON.stringify(ep.payload, null, 2)}'`;
    }
    return curl;
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 p-6 md:h-screen md:sticky top-0 overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-8 flex items-center">
          <svg className="w-6 h-6 text-green-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z"/>
          </svg>
          M-Pesa API
        </h1>
        <nav className="space-y-1">
          {endpoints.map((ep) => (
            <button
              key={ep.id}
              onClick={() => setActiveTab(ep.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === ep.id 
                  ? 'bg-green-50 text-green-700' 
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {ep.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 max-w-5xl mx-auto p-6 md:p-12 overflow-y-auto">
        
        {/* Authentication Warning */}
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">Authentication Required</h3>
            <p className="mt-1 text-sm text-blue-700">
              All endpoints are secured. Include <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 border border-blue-200">x-api-key: change-me</code> in your request headers. (Change this in your <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 border border-blue-200">.env</code> file).
            </p>
          </div>
        </div>

        {/* Endpoint Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Header */}
          <div className="p-6 md:p-8 border-b border-gray-200">
            <div className="flex items-center mb-4">
              <span className={`px-2.5 py-1 rounded text-xs font-bold mr-4 ${
                activeEndpoint.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {activeEndpoint.method}
              </span>
              <code className="text-lg font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                {activeEndpoint.path}
              </code>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{activeEndpoint.title}</h2>
            <p className="text-gray-600">{activeEndpoint.description}</p>
          </div>

          {/* Body */}
          <div className="p-6 md:p-8 bg-gray-50 flex flex-col xl:flex-row gap-8">
            
            {/* Parameters (Left) */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Request Body</h3>
              {activeEndpoint.payload ? (
                <div className="space-y-4">
                  {Object.entries(activeEndpoint.payload).map(([key, val]) => (
                    <div key={key} className="border-b border-gray-200 pb-3">
                      <div className="flex items-baseline mb-1">
                        <span className="font-mono text-sm text-gray-800 font-semibold">{key}</span>
                        <span className="ml-2 text-xs text-gray-500 font-mono">{typeof val}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Example: <code className="bg-gray-100 px-1 rounded text-gray-800">{String(val)}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic border border-dashed border-gray-300 rounded p-4 text-center">
                  No request body required.
                </div>
              )}
            </div>

            {/* Code Snippet (Right) */}
            <div className="flex-1 xl:max-w-md">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Example Request</h3>
              <div className="bg-[#1e1e1e] rounded-lg shadow-inner overflow-hidden">
                <div className="flex items-center px-4 py-2 bg-[#2d2d2d] border-b border-[#3d3d3d]">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="ml-4 text-xs font-mono text-gray-400">cURL</span>
                </div>
                <pre className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
                  <code>{getCurlCommand(activeEndpoint)}</code>
                </pre>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
