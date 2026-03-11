export type LodgeRoomStatus = "active" | "inactive";

export type LodgeRoomFormValues = {
  name: string;
  slug: string;
  status: LodgeRoomStatus;
};

export type LodgeRoomRecord = LodgeRoomFormValues & {
  nameLower: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const LODGE_ROOM_LIMIT = 8;

export const lodgeRoomsCollectionPath = ["admin", "data", "lodgeRooms"] as const;

export function lodgeRoomDocPath(roomId: string) {
  return [...lodgeRoomsCollectionPath, roomId] as const;
}

export function emptyLodgeRoomForm(): LodgeRoomFormValues {
  return {
    name: "",
    slug: "",
    status: "active",
  };
}

export function slugifyLodgeRoom(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\'’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeLodgeRoomPayload(values: LodgeRoomFormValues): LodgeRoomRecord {
  const name = values.name.trim();
  const slug = slugifyLodgeRoom(values.slug) || slugifyLodgeRoom(name);

  return {
    name,
    nameLower: name.toLowerCase(),
    slug,
    status: values.status === "inactive" ? "inactive" : "active",
  };
}

export function toLodgeRoomFormValues(
  value?: Partial<LodgeRoomFormValues> | Partial<LodgeRoomRecord> | null,
): LodgeRoomFormValues {
  return {
    name: value?.name ?? "",
    slug: value?.slug ?? "",
    status: value?.status === "inactive" ? "inactive" : "active",
  };
}