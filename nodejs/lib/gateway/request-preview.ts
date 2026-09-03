import type { OperationDefinition, OperationField } from "@/lib/gateway/catalog";

function parseJsonTextarea(rawValue: string) {
  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return { invalidJson: true, raw: rawValue };
  }
}

function parseFieldValue(field: OperationField, rawValue: string) {
  if (field.type === "number") {
    return Number(rawValue);
  }

  if (field.valueFormat === "json") {
    return parseJsonTextarea(rawValue);
  }

  return rawValue;
}

export function buildRequestPreview(
  operation: OperationDefinition | undefined,
  formValues: Record<string, string>,
  rawMode: boolean,
  rawJson: string,
) {
  if (!operation) {
    return {};
  }

  if (rawMode) {
    try {
      return JSON.parse(rawJson) as unknown;
    } catch {
      return { invalidJson: true };
    }
  }

  return Object.fromEntries(
    operation.fields
      .filter((field) => formValues[field.name]?.trim())
      .map((field) => [field.name, parseFieldValue(field, formValues[field.name] ?? "")]),
  );
}
