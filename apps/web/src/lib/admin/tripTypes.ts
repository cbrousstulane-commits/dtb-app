export type TripTypeStatus = "active" | "inactive";

export type TripTypeFormValues = {
  name: string;
  slug: string;
  durationHours: string;
  status: TripTypeStatus;
};

export type TripTypeRecord = {
  name: string;
  nameLower: string;
  slug: string;
  durationHours: number;
  status: TripTypeStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const tripTypesCollectionPath = ["admin", "data", "tripTypes"] as const;

export function tripTypeDocPath(tripTypeId: string) {
  return [...tripTypesCollectionPath, tripTypeId] as const;
}

export function emptyTripTypeForm(): TripTypeFormValues {
  return {
    name: "",
    slug: "",
    durationHours: "",
    status: "active",
  };
}

export function slugifyTripType(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeTripTypePayload(values: TripTypeFormValues): TripTypeRecord {
  const name = values.name.trim();
  const slug = slugifyTripType(values.slug) || slugifyTripType(name);
  const durationHours = Number(values.durationHours);

  if (!Number.isFinite(durationHours) || durationHours <= 0) {
    throw new Error("Duration hours must be a number greater than 0.");
  }

  return {
    name,
    nameLower: name.toLowerCase(),
    slug,
    durationHours,
    status: values.status === "inactive" ? "inactive" : "active",
  };
}

export function toTripTypeFormValues(
  value?: Partial<TripTypeFormValues> | Partial<TripTypeRecord> | null,
): TripTypeFormValues {
  return {
    name: value?.name ?? "",
    slug: value?.slug ?? "",
    durationHours:
      typeof value?.durationHours === "number" ? String(value.durationHours) : (value?.durationHours ?? ""),
    status: value?.status === "inactive" ? "inactive" : "active",
  };
}