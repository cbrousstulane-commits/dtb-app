export type BoatStatus = "active" | "inactive";

export type BoatFormValues = {
  name: string;
  slug: string;
  primaryCaptainId: string;
  primaryCaptainNameSnapshot: string;
  status: BoatStatus;
};

export type BoatRecord = BoatFormValues & {
  nameLower: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CaptainOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

export const boatsCollectionPath = ["admin", "data", "boats"] as const;

export function boatDocPath(boatId: string) {
  return [...boatsCollectionPath, boatId] as const;
}

export function emptyBoatForm(): BoatFormValues {
  return {
    name: "",
    slug: "",
    primaryCaptainId: "",
    primaryCaptainNameSnapshot: "",
    status: "active",
  };
}

export function slugifyBoat(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeBoatPayload(
  values: BoatFormValues,
  captains: CaptainOption[],
): BoatRecord {
  const name = values.name.trim();
  const slug = slugifyBoat(values.slug) || slugifyBoat(name);
  const primaryCaptainId = values.primaryCaptainId.trim();
  const captain = captains.find((item) => item.id === primaryCaptainId);

  return {
    name,
    nameLower: name.toLowerCase(),
    slug,
    primaryCaptainId,
    primaryCaptainNameSnapshot: primaryCaptainId && captain ? captain.name : "",
    status: values.status === "inactive" ? "inactive" : "active",
  };
}

export function toBoatFormValues(
  value?: Partial<BoatFormValues> | Partial<BoatRecord> | null,
): BoatFormValues {
  return {
    name: value?.name ?? "",
    slug: value?.slug ?? "",
    primaryCaptainId: value?.primaryCaptainId ?? "",
    primaryCaptainNameSnapshot: value?.primaryCaptainNameSnapshot ?? "",
    status: value?.status === "inactive" ? "inactive" : "active",
  };
}

