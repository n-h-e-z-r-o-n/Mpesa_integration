import type {
  AuditLogRecord,
  CallbackRecord,
  IdempotencyRecord,
  RequestLogRecord,
  TransactionRecord,
} from "@/types/gateway";

type RuntimeStore = {
  transactions: TransactionRecord[];
  requestLogs: RequestLogRecord[];
  callbacks: CallbackRecord[];
  auditLogs: AuditLogRecord[];
  idempotency: Map<string, IdempotencyRecord>;
  rateLimits: Map<string, { count: number; windowStartedAt: number }>;
};

const globalState = globalThis as typeof globalThis & {
  __zadhronRuntimeStore?: RuntimeStore;
};

function createStore(): RuntimeStore {
  return {
    transactions: [],
    requestLogs: [],
    callbacks: [],
    auditLogs: [],
    idempotency: new Map(),
    rateLimits: new Map(),
  };
}

export function getRuntimeStore() {
  if (!globalState.__zadhronRuntimeStore) {
    globalState.__zadhronRuntimeStore = createStore();
  }

  return globalState.__zadhronRuntimeStore;
}

export function upsertTransaction(record: TransactionRecord) {
  const store = getRuntimeStore();
  const index = store.transactions.findIndex((item) => item.id === record.id);
  if (index === -1) {
    store.transactions.unshift(record);
  } else {
    store.transactions[index] = record;
  }
}

export function getTransactions() {
  return getRuntimeStore().transactions;
}

export function addRequestLog(record: RequestLogRecord) {
  getRuntimeStore().requestLogs.unshift(record);
}

export function getRequestLogs() {
  return getRuntimeStore().requestLogs;
}

export function addCallback(record: CallbackRecord) {
  getRuntimeStore().callbacks.unshift(record);
}

export function getCallbacks() {
  return getRuntimeStore().callbacks;
}

export function addAuditLog(record: AuditLogRecord) {
  getRuntimeStore().auditLogs.unshift(record);
}

export function getAuditLogs() {
  return getRuntimeStore().auditLogs;
}

export function getIdempotencyRecord(key: string) {
  return getRuntimeStore().idempotency.get(key);
}

export function setIdempotencyRecord(record: IdempotencyRecord) {
  getRuntimeStore().idempotency.set(record.key, record);
}

export function getRateLimitRecord(key: string) {
  return getRuntimeStore().rateLimits.get(key);
}

export function setRateLimitRecord(key: string, value: { count: number; windowStartedAt: number }) {
  getRuntimeStore().rateLimits.set(key, value);
}

export function resetRuntimeStoreForTests() {
  globalState.__zadhronRuntimeStore = createStore();
}
