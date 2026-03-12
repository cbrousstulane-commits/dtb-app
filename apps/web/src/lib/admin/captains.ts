export type CaptainStatus = "active" | "inactive";

export type CaptainFormValues = {
  name: string;
  slug: string;
  email: string;
  authUid: string;
  adminAccess: boolean;
  status: CaptainStatus;
  notes: string;
};

export type CaptainRecord = CaptainFormValues & {
  nameLower: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const captainsCollectionPath = ["admin", "data", "captains"] as const;

export function captainDocPath(captainId: string) {
  return [...captainsCollectionPath, captainId] as const;
}

export function emptyCaptainForm(): CaptainFormValues {
  return {
    name: "",
    slug: "",
    email: "",
    authUid: "",
    adminAccess: false,
    status: "active",
    notes: "",
  };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\x27’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeCaptainPayload(values: CaptainFormValues): CaptainRecord {
  const name = values.name.trim();
  const slug = slugify(values.slug) || slugify(name);

  return {
    name,
    nameLower: name.toLowerCase(),
    slug,
    email: values.email.trim().toLowerCase(),
    authUid: values.authUid.trim(),
    adminAccess: values.adminAccess === true,
    status: values.status === "inactive" ? "inactive" : "active",
    notes: values.notes.trim(),
  };
}

export function toCaptainFormValues(
  value?: Partial<CaptainFormValues> | Partial<CaptainRecord> | null,
): CaptainFormValues {
  return {
    name: value?.name ?? "",
    slug: value?.slug ?? "",
    email: value?.email ?? "",
    authUid: value?.authUid ?? "",
    adminAccess: value?.adminAccess === true,
    status: value?.status === "inactive" ? "inactive" : "active",
    notes: value?.notes ?? "",
  };
}