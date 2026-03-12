export type BookingSource = "website-csv";

export type BookingImportRunStatus = "pending" | "completed" | "failed";
export type BookingGroupStatus = "active" | "cancelled" | "modified";
export type BookingItemStatus = "active" | "cancelled" | "modified";
export type BookingItemType = "trip" | "lodge" | "addon";
export type CustomerMatchStatus = "matched" | "new" | "review" | "unresolved";

export type BookingImportRunRecord = {
  source: BookingSource;
  sourceFileName: string;
  sourceFileChecksum: string;
  status: BookingImportRunStatus;
  rowCount: number;
  bookingGroupCount: number;
  bookingItemCount: number;
  startedAt?: unknown;
  completedAt?: unknown;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BookingGroupRecord = {
  source: BookingSource;
  externalBookingGroupId: string;
  bookingImportRunId: string;
  rawImportReference: string;
  customerId: string;
  customerMatchStatus: CustomerMatchStatus;
  customerNameSnapshot: string;
  customerEmailSnapshot: string;
  customerPhoneSnapshot: string;
  status: BookingGroupStatus;
  bookingDate: string;
  sourceUpdatedAt: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BookingItemRecord = {
  source: BookingSource;
  bookingGroupId: string;
  bookingImportRunId: string;
  rawImportReference: string;
  externalBookingItemId: string;
  itemType: BookingItemType;
  sourceProductName: string;
  sourceProductCode: string;
  status: BookingItemStatus;
  startDateTime: string;
  endDateTime: string;
  linkedTripTypeId: string;
  linkedBoatId: string;
  linkedCaptainId: string;
  linkedLodgeRoomId: string;
  quantity: number;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const bookingImportRunsCollectionPath = ["admin", "data", "bookingImportRuns"] as const;
export const bookingGroupsCollectionPath = ["admin", "data", "bookingGroups"] as const;
export const bookingItemsCollectionPath = ["admin", "data", "bookingItems"] as const;

export function bookingImportRunDocPath(importRunId: string) {
  return [...bookingImportRunsCollectionPath, importRunId] as const;
}

export function bookingGroupDocPath(bookingGroupId: string) {
  return [...bookingGroupsCollectionPath, bookingGroupId] as const;
}

export function bookingItemDocPath(bookingItemId: string) {
  return [...bookingItemsCollectionPath, bookingItemId] as const;
}

export function emptyBookingImportRun(): BookingImportRunRecord {
  return {
    source: "website-csv",
    sourceFileName: "",
    sourceFileChecksum: "",
    status: "pending",
    rowCount: 0,
    bookingGroupCount: 0,
    bookingItemCount: 0,
    notes: "",
  };
}

export function emptyBookingGroup(): BookingGroupRecord {
  return {
    source: "website-csv",
    externalBookingGroupId: "",
    bookingImportRunId: "",
    rawImportReference: "",
    customerId: "",
    customerMatchStatus: "unresolved",
    customerNameSnapshot: "",
    customerEmailSnapshot: "",
    customerPhoneSnapshot: "",
    status: "active",
    bookingDate: "",
    sourceUpdatedAt: "",
    notes: "",
  };
}

export function emptyBookingItem(): BookingItemRecord {
  return {
    source: "website-csv",
    bookingGroupId: "",
    bookingImportRunId: "",
    rawImportReference: "",
    externalBookingItemId: "",
    itemType: "trip",
    sourceProductName: "",
    sourceProductCode: "",
    status: "active",
    startDateTime: "",
    endDateTime: "",
    linkedTripTypeId: "",
    linkedBoatId: "",
    linkedCaptainId: "",
    linkedLodgeRoomId: "",
    quantity: 1,
    notes: "",
  };
}