export type AccessRole = "none" | "user" | "captain" | "admin";

export type ManagedAccessClaims = {
  siteAccess?: boolean;
  admin?: boolean;
  captain?: boolean;
  user?: boolean;
  role?: AccessRole;
  captainId?: string;
  accessUserId?: string;
};

export const OWNER_ADMIN_EMAILS = ["cbrousstulane@gmail.com"] as const;

export const MANAGED_ACCESS_CLAIM_KEYS = [
  "siteAccess",
  "admin",
  "captain",
  "user",
  "role",
  "captainId",
  "accessUserId",
] as const;

export function isOwnerAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return OWNER_ADMIN_EMAILS.includes(normalized as (typeof OWNER_ADMIN_EMAILS)[number]);
}

export function buildManagedAccessClaims(input: {
  role: AccessRole;
  captainId?: string;
  accessUserId?: string;
}): ManagedAccessClaims {
  const isAdmin = input.role === "admin";
  const isCaptain = input.role === "captain" || (isAdmin && Boolean(input.captainId));
  const isUser = input.role === "user";
  const hasSiteAccess = input.role !== "none";

  return {
    siteAccess: hasSiteAccess,
    admin: isAdmin,
    captain: isCaptain,
    user: isUser,
    role: input.role,
    captainId: input.captainId || undefined,
    accessUserId: input.accessUserId || undefined,
  };
}

export function mergeManagedAccessClaims(
  existingClaims: Record<string, unknown> | undefined,
  managedClaims: ManagedAccessClaims,
) {
  const nextClaims: Record<string, unknown> = { ...(existingClaims ?? {}) };

  for (const key of MANAGED_ACCESS_CLAIM_KEYS) {
    delete nextClaims[key];
  }

  for (const [key, value] of Object.entries(managedClaims)) {
    if (value !== undefined) {
      nextClaims[key] = value;
    }
  }

  return nextClaims;
}
