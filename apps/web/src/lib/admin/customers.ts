export type CustomerSource = "manual" | "square-import" | "website-import" | "captain-created";
export type CustomerStatus = "active" | "inactive" | "merged";

export type CustomerFormValues = {
  fullName: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
};

export type CustomerRecord = {
  fullName: string;
  fullNameLower: string;
  email: string;
  phone: string;
  source: CustomerSource;
  squareCustomerId: string;
  websiteCustomerId: string;
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

export function normalizeCustomerPayload(
  values: CustomerFormValues,
  existing?: Partial<CustomerRecord> | null,
): CustomerRecord {
  const fullName = values.fullName.trim();

  return {
    fullName,
    fullNameLower: fullName.toLowerCase(),
    email: values.email.trim().toLowerCase(),
    phone: normalizePhone(values.phone),
    source: existing?.source ?? "manual",
    squareCustomerId: existing?.squareCustomerId ?? "",
    websiteCustomerId: existing?.websiteCustomerId ?? "",
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