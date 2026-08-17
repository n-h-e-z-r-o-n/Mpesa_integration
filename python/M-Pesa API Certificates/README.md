# M-Pesa API Certificates

This folder is for generating `MPESA_SECURITY_CREDENTIAL` values from an M-Pesa initiator password using Safaricom's public certificate.

Current certificate in this folder:

- [ProductionCertificate.cer](</C:/Users/user/Desktop/Kotlin Apps/Mpesa_integration/python/M-Pesa API Certificates/ProductionCertificate.cer>)

Files in this folder:

- [generate_security_credential.py](</C:/Users/user/Desktop/Kotlin Apps/Mpesa_integration/python/M-Pesa API Certificates/generate_security_credential.py>)
- [ProductionCertificate.cer](</C:/Users/user/Desktop/Kotlin Apps/Mpesa_integration/python/M-Pesa API Certificates/ProductionCertificate.cer>)

## What This Folder Does

Safaricom requires a `SecurityCredential` for APIs such as:

- B2C
- B2B
- Transaction Status Query
- Reversal
- Account Balance

The script in this folder:

1. reads the `.cer` certificate in this folder
2. asks you for the plain Initiator Password
3. encrypts that password using RSA with PKCS#1 v1.5 padding
4. base64-encodes the encrypted value
5. prints the result as:

```text
MPESA_SECURITY_CREDENTIAL: <generated-value>
```

## Important

- Use the correct certificate for the correct environment.
- A production certificate should be used for production credentials.
- A sandbox certificate should be used for sandbox credentials.
- Do not use the generated value from one environment in the other environment.

## Dependency

This script needs the Python `cryptography` package.

If it is not installed yet, run this from the `python` folder:

```powershell
.\.venv\Scripts\python.exe -m pip install cryptography
```

## How To Run

From:

- `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python`

run:

```powershell
.\.venv\Scripts\python.exe ".\M-Pesa API Certificates\generate_security_credential.py"
```

You will be prompted for:

```text
Enter Initiator Password:
```

The script will then print:

```text
MPESA_SECURITY_CREDENTIAL: <generated-value>
```

## Example Workflow

1. Place the correct `.cer` file in this folder.
2. Run the script.
3. Enter the plain Initiator Password.
4. Copy the printed value.
5. Put it into your `.env` file as:

```env
MPESA_SECURITY_CREDENTIAL=your-generated-value
```

## Security Notes

- Do not commit the plain Initiator Password into code.
- Do not store the plain Initiator Password in your `.env` unless you intentionally want that.
- Treat the generated security credential as sensitive.
