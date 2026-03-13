export type FishStatus = "active" | "inactive";

export type FishSubspeciesRecord = {
  id: string;
  name: string;
  nameLower: string;
  status: FishStatus;
};

export type FishSpeciesFormValues = {
  name: string;
  slug: string;
  status: FishStatus;
  subspecies: Array<{
    id: string;
    name: string;
    status: FishStatus;
  }>;
};

export type FishSpeciesRecord = {
  name: string;
  nameLower: string;
  slug: string;
  status: FishStatus;
  subspecies: FishSubspeciesRecord[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const fishSpeciesCollectionPath = ["admin", "data", "fishSpecies"] as const;

export function fishSpeciesDocPath(speciesId: string) {
  return [...fishSpeciesCollectionPath, speciesId] as const;
}

export function slugifyFishSpecies(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\x27â€™]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function emptyFishSpeciesForm(): FishSpeciesFormValues {
  return {
    name: "",
    slug: "",
    status: "active",
    subspecies: [],
  };
}

export function emptySubspeciesRow() {
  return {
    id: crypto.randomUUID(),
    name: "",
    status: "active" as const,
  };
}

export function normalizeFishSpeciesPayload(values: FishSpeciesFormValues): FishSpeciesRecord {
  const name = values.name.trim();
  const slug = slugifyFishSpecies(values.slug) || slugifyFishSpecies(name);

  const normalizedSubspecies: FishSubspeciesRecord[] = values.subspecies
    .map((row) => ({
      id: row.id || crypto.randomUUID(),
      name: row.name.trim(),
      nameLower: row.name.trim().toLowerCase(),
      status: (row.status === "inactive" ? "inactive" : "active") as FishStatus,
    }))
    .filter((row) => row.name);

  const seen = new Set<string>();
  const dedupedSubspecies: FishSubspeciesRecord[] = [];
  for (const row of normalizedSubspecies) {
    const key = row.nameLower;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedSubspecies.push(row);
  }

  return {
    name,
    nameLower: name.toLowerCase(),
    slug,
    status: values.status === "inactive" ? "inactive" : "active",
    subspecies: dedupedSubspecies,
  };
}

export function toFishSpeciesFormValues(
  value?: Partial<FishSpeciesFormValues> | Partial<FishSpeciesRecord> | null,
): FishSpeciesFormValues {
  return {
    name: value?.name ?? "",
    slug: value?.slug ?? "",
    status: value?.status === "inactive" ? "inactive" : "active",
    subspecies: Array.isArray(value?.subspecies)
      ? value.subspecies.map((row) => ({
          id: typeof row?.id === "string" && row.id ? row.id : crypto.randomUUID(),
          name: typeof row?.name === "string" ? row.name : "",
          status: row?.status === "inactive" ? "inactive" : "active",
        }))
      : [],
  };
}

