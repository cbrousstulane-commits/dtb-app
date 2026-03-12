import { AccessRole } from "@/lib/auth/access";

export type AccessUserStatus = "active" | "inactive";
export type AccessUserRole = Exclude<AccessRole, "none" | "captain">;

export type AccessUserFormValues = {
  name: string;
  email: string;
  authUid: string;
  role: AccessUserRole;
  status: AccessUserStatus;
  notes: string;
};

export type AccessUserRecord = AccessUserFormValues & {
  nameLower: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const accessUsersCollectionPath = ["admin", "data", "accessUsers"] as const;

export function accessUserDocPath(userId: string) {
  return [...accessUsersCollectionPath, userId] as const;
}

export function emptyAccessUserForm(): AccessUserFormValues {
  return {
    name: "",
    email: "",
    authUid: "",
    role: "user",
    status: "active",
    notes: "",
  };
}

export function normalizeAccessUserPayload(values: AccessUserFormValues): AccessUserRecord {
  const name = values.name.trim();

  return {
    name,
    nameLower: name.toLowerCase(),
    email: values.email.trim().toLowerCase(),
    authUid: values.authUid.trim(),
    role: values.role === "admin" ? "admin" : "user",
    status: values.status === "inactive" ? "inactive" : "active",
    notes: values.notes.trim(),
  };
}

export function toAccessUserFormValues(
  value?: Partial<AccessUserFormValues> | Partial<AccessUserRecord> | null,
): AccessUserFormValues {
  return {
    name: value?.name ?? "",
    email: value?.email ?? "",
    authUid: value?.authUid ?? "",
    role: value?.role === "admin" ? "admin" : "user",
    status: value?.status === "inactive" ? "inactive" : "active",
    notes: value?.notes ?? "",
  };
}