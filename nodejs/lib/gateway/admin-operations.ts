import { getOperationDefinition } from "@/lib/gateway/catalog";

export const adminOperatorOperationIds = [
  "stkPush",
  "transactionStatus",
  "accountBalance",
  "c2bRegister",
  "pullTransactionsQuery",
  "pullTransactionsRegister",
  "billManagerReconciliation",
] as const;

export const adminOperatorOperations = adminOperatorOperationIds.map((operation) =>
  getOperationDefinition(operation),
);
