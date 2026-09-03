import { describe, expect, test } from "vitest";

import { getOperationDefinition } from "@/lib/gateway/catalog";
import { buildRequestPreview } from "@/lib/gateway/request-preview";

describe("buildRequestPreview", () => {
  test("keeps multiline remarks as plain text for B2C requests", () => {
    const preview = buildRequestPreview(
      getOperationDefinition("b2c"),
      {
        phoneNumber: "254714415034",
        amount: "1",
        remarks: "testing",
      },
      false,
      "{}",
    );

    expect(preview).toEqual({
      phoneNumber: "254714415034",
      amount: 1,
      remarks: "testing",
    });
  });

  test("parses JSON textarea fields for pass-through payload operations", () => {
    const preview = buildRequestPreview(
      getOperationDefinition("pullTransactions"),
      {
        payload: "{\"ShortCode\":\"174379\"}",
        pathOverride: "/pulltransactions/v1/register",
      },
      false,
      "{}",
    );

    expect(preview).toEqual({
      payload: {
        ShortCode: "174379",
      },
      pathOverride: "/pulltransactions/v1/register",
    });
  });

  test("preserves invalid JSON markers only for JSON textarea fields", () => {
    const preview = buildRequestPreview(
      getOperationDefinition("billManagerCreateBulkInvoices"),
      {
        invoices: "not-json",
      },
      false,
      "{}",
    );

    expect(preview).toEqual({
      invoices: {
        invalidJson: true,
        raw: "not-json",
      },
    });
  });
});
