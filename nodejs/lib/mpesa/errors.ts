export class GatewayError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class GatewayValidationError extends GatewayError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "validation_error", 422, details);
  }
}

export class GatewayAuthenticationError extends GatewayError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "authentication_error", 401, details);
  }
}

export class GatewayAuthorizationError extends GatewayError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "authorization_error", 403, details);
  }
}

export class GatewayConflictError extends GatewayError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "conflict_error", 409, details);
  }
}

export class GatewayRateLimitError extends GatewayError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "rate_limit_exceeded", 429, details);
  }
}

export class MpesaError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly upstream?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export class MpesaAuthenticationError extends MpesaError {
  constructor(message: string, status = 502, upstream?: Record<string, unknown>) {
    super(message, "mpesa_authentication_failed", status, upstream);
  }
}

export class MpesaRequestError extends MpesaError {
  constructor(message: string, status: number, upstream?: Record<string, unknown>) {
    super(message, "mpesa_request_failed", status, upstream);
  }
}

export class MpesaIndeterminateError extends MpesaError {
  constructor(message = "Unable to confirm whether Safaricom received the request") {
    super(message, "mpesa_request_indeterminate", 503);
  }
}

export function extractProviderCode(payload?: Record<string, unknown>) {
  if (!payload) {
    return undefined;
  }

  for (const key of ["errorCode", "ResponseCode", "responseCode", "ResultCode"]) {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== "") {
      return value as string | number;
    }
  }

  return undefined;
}

export function extractProviderMessage(payload?: Record<string, unknown>) {
  if (!payload) {
    return undefined;
  }

  for (const key of [
    "errorMessage",
    "ResponseDescription",
    "responseDescription",
    "ResultDesc",
    "ResultDescription",
    "CustomerMessage",
  ]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}
