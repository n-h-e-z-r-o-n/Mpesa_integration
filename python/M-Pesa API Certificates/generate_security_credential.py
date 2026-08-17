from __future__ import annotations

import base64
from pathlib import Path


def load_public_key(certificate_path: Path):
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import serialization
    except ImportError as error:
        raise RuntimeError(
            "Missing dependency: cryptography. Install it with "
            r'".\.venv\Scripts\python.exe -m pip install cryptography"'
        ) from error

    certificate_bytes = certificate_path.read_bytes()

    try:
        certificate = x509.load_der_x509_certificate(certificate_bytes)
    except ValueError:
        certificate = x509.load_pem_x509_certificate(certificate_bytes)

    public_key = certificate.public_key()

    if not hasattr(public_key, "encrypt"):
        raise RuntimeError("The certificate does not contain an RSA public key")

    return public_key


def generate_security_credential(initiator_password: str, certificate_path: Path) -> str:
    if not initiator_password:
        raise ValueError("Initiator Password cannot be empty")

    try:
        from cryptography.hazmat.primitives.asymmetric import padding
    except ImportError as error:
        raise RuntimeError(
            "Missing dependency: cryptography. Install it with "
            r'".\.venv\Scripts\python.exe -m pip install cryptography"'
        ) from error

    public_key = load_public_key(certificate_path)
    encrypted_bytes = public_key.encrypt(
        initiator_password.encode("utf-8"),
        padding.PKCS1v15(),
    )
    return base64.b64encode(encrypted_bytes).decode("utf-8")


def find_certificate(folder_path: Path) -> Path:
    certificates = sorted(folder_path.glob("*.cer"))

    if not certificates:
        raise FileNotFoundError("No .cer certificate file was found in this folder")

    if len(certificates) > 1:
        print("Multiple certificates found. Using:", certificates[0].name)

    return certificates[0]


def main() -> None:
    folder_path = Path(__file__).resolve().parent
    certificate_path = find_certificate(folder_path)

    print(f"Using certificate: {certificate_path.name}")
    initiator_password = input("Enter Initiator Password: ").strip()

    security_credential = generate_security_credential(
        initiator_password=initiator_password,
        certificate_path=certificate_path,
    )

    print(f"MPESA_SECURITY_CREDENTIAL: {security_credential}")


if __name__ == "__main__":
    main()
