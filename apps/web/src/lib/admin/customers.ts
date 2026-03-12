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
  phone: string;
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

export const customersCollectionPath = ["admin", "data", "customers"] as const;

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

export function normalizePhone(value: string): string {
  return value.trim();
}

export function normalizeAdditionalNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const next: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;

    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }

  return next;
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

export function normalizeCustomerPayload(
  values: CustomerFormValues,
  existing?: Partial<CustomerRecord> | null,
): CustomerRecord {
  const fullName = values.fullName.trim();

  return {
    fullName,
    fullNameLower: fullName.toLowerCase(),
    additionalNames: normalizeAdditionalNames(existing?.additionalNames),
    email: values.email.trim().toLowerCase(),
    phone: normalizePhone(values.phone),
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