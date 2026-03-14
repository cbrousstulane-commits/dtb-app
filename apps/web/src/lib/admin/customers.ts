export type CustomerSource = "manual" | "square-import" | "website-import" | "captain-created";
export type CustomerStatus = "active" | "inactive" | "merged";
export type CustomerMatchStatus = "matched" | "new" | "review" | "unresolved";

export type CustomerFormValues = {
  fullName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
};

export type CustomerRecord = {
  fullName: string;
  fullNameLower: string;
  additionalNames: string[];
  email: string;
  additionalEmails: string[];
  phone: string;
  additionalPhones: string[];
  mergeIgnoreKeys: string[];
  source: CustomerSource;
  squareCustomerId: string;
  websiteCustomerId: string;
  customerMatchStatus: CustomerMatchStatus;
  squareImportLastRunId: string;
  squareImportUpdatedAt: string;
  status: CustomerStatus;
  mergedIntoCustomerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CustomerListItem = CustomerRecord & { id: string };

export const customersCollectionPath = ["admin", "data", "customers"] as const;
export const CUSTOMERS_CACHE_KEY = "dtb-admin-customers-v1";
export const CUSTOMERS_CACHE_TTL_MS = 5 * 60 * 1000;
export const BLOCKED_CUSTOMER_EMAILS = ["joeymaciasz22@gmail.com", "owenbelknap@gmail.com"] as const;
export const BLOCKED_CUSTOMER_PHONES = ["2256504039", "3189572339"] as const;

const BLOCKED_CUSTOMER_EMAIL_SET: ReadonlySet<string> = new Set(BLOCKED_CUSTOMER_EMAILS);
const BLOCKED_CUSTOMER_PHONE_SET: ReadonlySet<string> = new Set(BLOCKED_CUSTOMER_PHONES);

export function clearCustomersCache() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CUSTOMERS_CACHE_KEY);
}

export function customerDocPath(customerId: string) {
  return [...customersCollectionPath, customerId] as const;
}

export function emptyCustomerForm(): CustomerFormValues {
  return {
    fullName: "",
    email: "",
    phone: "",
    status: "active",
  };
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export function isBlockedCustomerEmail(value: string): boolean {
  return BLOCKED_CUSTOMER_EMAIL_SET.has(normalizeEmail(value));
}

export function isBlockedCustomerPhone(value: string): boolean {
  return BLOCKED_CUSTOMER_PHONE_SET.has(normalizePhone(value));
}

function normalizeStringArray(
  value: unknown,
  normalizeItem: (value: string) => string = (item) => item.trim(),
): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const next: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = normalizeItem(item);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(normalized);
  }

  return next;
}

export function normalizeAdditionalNames(value: unknown): string[] {
  return normalizeStringArray(value, (item) => item.trim());
}

export function normalizeAdditionalEmails(value: unknown): string[] {
  return normalizeStringArray(value, normalizeEmail).filter((item) => !isBlockedCustomerEmail(item));
}

export function normalizeAdditionalPhones(value: unknown): string[] {
  return normalizeStringArray(value, normalizePhone).filter((item) => !isBlockedCustomerPhone(item));
}

export function normalizeMergeIgnoreKeys(value: unknown): string[] {
  return normalizeStringArray(value, (item) => item.trim().toLowerCase());
}

export function sanitizeCustomerEmailFields(primaryValue: string, additionalValues: unknown) {
  let email = normalizeEmail(primaryValue);
  let additionalEmails = normalizeAdditionalEmails(additionalValues);

  if (isBlockedCustomerEmail(email)) {
    email = "";
  }

  additionalEmails = additionalEmails.filter((value) => value !== email);

  if (!email && additionalEmails.length > 0) {
    email = additionalEmails[0];
    additionalEmails = additionalEmails.slice(1);
  }

  return { email, additionalEmails };
}

export function sanitizeCustomerPhoneFields(primaryValue: string, additionalValues: unknown) {
  let phone = normalizePhone(primaryValue);
  let additionalPhones = normalizeAdditionalPhones(additionalValues);

  if (isBlockedCustomerPhone(phone)) {
    phone = "";
  }

  additionalPhones = additionalPhones.filter((value) => value !== phone);

  if (!phone && additionalPhones.length > 0) {
    phone = additionalPhones[0];
    additionalPhones = additionalPhones.slice(1);
  }

  return { phone, additionalPhones };
}

export function appendAdditionalName(existingNames: string[], fullName: string): string[] {
  const next = normalizeAdditionalNames(existingNames);
  const trimmed = fullName.trim();

  if (!trimmed) return next;

  const key = trimmed.toLowerCase();
  const exists = next.some((item) => item.toLowerCase() === key);

  if (!exists) {
    next.push(trimmed);
  }

  return next;
}

export function appendAdditionalEmail(existingEmails: string[], email: string): string[] {
  const next = normalizeAdditionalEmails(existingEmails);
  const normalized = normalizeEmail(email);

  if (!normalized || isBlockedCustomerEmail(normalized)) return next;
  if (!next.includes(normalized)) {
    next.push(normalized);
  }

  return next;
}

export function appendAdditionalPhone(existingPhones: string[], phone: string): string[] {
  const next = normalizeAdditionalPhones(existingPhones);
  const normalized = normalizePhone(phone);

  if (!normalized || isBlockedCustomerPhone(normalized)) return next;
  if (!next.includes(normalized)) {
    next.push(normalized);
  }

  return next;
}

export function hydrateCustomerRecord(docId: string, data: Partial<CustomerRecord>): CustomerListItem {
  const emailFields = sanitizeCustomerEmailFields(data.email ?? "", data.additionalEmails);
  const phoneFields = sanitizeCustomerPhoneFields(data.phone ?? "", data.additionalPhones);

  return {
    id: docId,
    fullName: data.fullName ?? "",
    fullNameLower: data.fullNameLower ?? "",
    additionalNames: normalizeAdditionalNames(data.additionalNames),
    email: emailFields.email,
    additionalEmails: emailFields.additionalEmails,
    phone: phoneFields.phone,
    additionalPhones: phoneFields.additionalPhones,
    mergeIgnoreKeys: normalizeMergeIgnoreKeys(data.mergeIgnoreKeys),
    source: data.source ?? "manual",
    squareCustomerId: data.squareCustomerId ?? "",
    websiteCustomerId: data.websiteCustomerId ?? "",
    customerMatchStatus: data.customerMatchStatus ?? "unresolved",
    squareImportLastRunId: data.squareImportLastRunId ?? "",
    squareImportUpdatedAt: data.squareImportUpdatedAt ?? "",
    status: data.status === "inactive" ? "inactive" : data.status === "merged" ? "merged" : "active",
    mergedIntoCustomerId: data.mergedIntoCustomerId ?? "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function normalizeCustomerPayload(
  values: CustomerFormValues,
  existing?: Partial<CustomerRecord> | null,
): CustomerRecord {
  const fullName = values.fullName.trim();
  const emailFields = sanitizeCustomerEmailFields(values.email, existing?.additionalEmails);
  const phoneFields = sanitizeCustomerPhoneFields(values.phone, existing?.additionalPhones);

  return {
    fullName,
    fullNameLower: fullName.toLowerCase(),
    additionalNames: normalizeAdditionalNames(existing?.additionalNames),
    email: emailFields.email,
    additionalEmails: emailFields.additionalEmails,
    phone: phoneFields.phone,
    additionalPhones: phoneFields.additionalPhones,
    mergeIgnoreKeys: normalizeMergeIgnoreKeys(existing?.mergeIgnoreKeys),
    source: existing?.source ?? "manual",
    squareCustomerId: existing?.squareCustomerId ?? "",
    websiteCustomerId: existing?.websiteCustomerId ?? "",
    customerMatchStatus: existing?.customerMatchStatus ?? "unresolved",
    squareImportLastRunId: existing?.squareImportLastRunId ?? "",
    squareImportUpdatedAt: existing?.squareImportUpdatedAt ?? "",
    status: values.status === "inactive" ? "inactive" : "active",
    mergedIntoCustomerId: existing?.mergedIntoCustomerId ?? "",
  };
}

export function toCustomerFormValues(
  value?: Partial<CustomerFormValues> | Partial<CustomerRecord> | null,
): CustomerFormValues {
  return {
    fullName: value?.fullName ?? "",
    email: value?.email ?? "",
    phone: value?.phone ?? "",
    status: value?.status === "inactive" ? "inactive" : "active",
  };
}
