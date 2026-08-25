
import requests

url = "https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest"
payload = {
  "OriginatorConversationID": "61d2c7329f8445ff8cb0f5694230f430",
  "InitiatorName": "testapi",
  "SecurityCredential": "\"F1Rg230W7r68uPborXy8KFMzJUYybR3Uwp2yc2fiT1jJdW4IpX3FNmDbbQd6tLPgIRzUi534VIaPvj+xK8/v15xb9vcOezuMHTP8LqJ+TrsgGQRXbT5RBSDgB+mG+cbt5T/luTAAv7aQDX5JFFrxPQXs1FGhiUrAo9AADTvPsgyTkTzjz8KAEEtATdmbd7e9VlfPu8IGGfNtsNVNsU+JhYce2iubYcQjPuMRaU5UDZ7o9VtD2bvUkiwMjl6ApYyBnKG1S9XNtHdrLNbkTj2hge05oXDbva6isQC426J91HT+SQu93D3VtNuMraNaXeU45EuqyV+uQawD3sQwW6UmgQ==\"",
  "CommandID": "SalaryPayment",
  "Amount": 10,
  "PartyA": "3459545",
  "PartyB": 254714415034,
  "Remarks": "ok",
  "occassion": "",
  "QueueTimeOutURL": "https://weathered-haze-72159.pktriot.xyz/callbacks/mpesa/b2c/result",
  "ResultURL": "https://weathered-haze-72159.pktriot.xyz/callbacks/mpesa/b2c/result"
}

headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer BGB9wU9ZKzsj9gwRN3cfqq3AJRhd"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
