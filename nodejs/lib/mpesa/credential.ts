import { readFileSync } from "node:fs";
import { publicEncrypt, constants, X509Certificate } from "node:crypto";

import { getGatewayConfig } from "@/lib/mpesa/config";
import { GatewayValidationError } from "@/lib/mpesa/errors";

function resolveCertificatePublicKey(certificate: Buffer) {
  const x509 = new X509Certificate(certificate);
  return x509.publicKey.export({ type: "spki", format: "pem" });
}

export function generateSecurityCredential(initiatorPassword: string, certificatePath: string) {
  if (!initiatorPassword.trim()) {
    throw new GatewayValidationError("MPESA_INITIATOR_PASSWORD cannot be empty");
  }

  const certificateBytes = readFileSync(certificatePath);
  const publicKey = resolveCertificatePublicKey(certificateBytes);
  const encrypted = publicEncrypt(
    {
      key: publicKey,
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(initiatorPassword, "utf8"),
  );

  return encrypted.toString("base64");
}

export function getSecurityCredential() {
  const config = getGatewayConfig();
  if (config.securityCredential?.trim()) {
    return config.securityCredential.trim();
  }

  if (config.initiatorPassword && config.certificatePath) {
    return generateSecurityCredential(config.initiatorPassword, config.certificatePath);
  }

  throw new GatewayValidationError(
    "Security credential is not configured. Set MPESA_SECURITY_CREDENTIAL or MPESA_INITIATOR_PASSWORD with MPESA_CERTIFICATE_PATH.",
  );
}
