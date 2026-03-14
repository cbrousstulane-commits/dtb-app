export type BookingSource = "website-csv";

export type BookingImportRunStatus = "pending" | "completed" | "failed";
export type BookingImportRowType = "fishing" | "lodge" | "unsupported";
export type BookingImportRowStatus = "ready" | "review" | "resolved" | "skipped" | "failed";
export type BookingGroupStatus = "active" | "cancelled" | "modified";
export type BookingItemStatus = "active" | "cancelled" | "modified";
export type BookingItemType = "trip" | "lodge" | "addon";
export type CustomerMatchStatus = "matched" | "new" | "review" | "unresolved";
export type SquareDepositMatchStatus = "not-linked" | "pending" | "matched" | "review";

export type BookingImportRunRecord = {
  source: BookingSource;
  sourceFileName: string;
  sourceFileChecksum: string;
  status: BookingImportRunStatus;
  rowCount: number;
  bookingRowCount: number;
  bookingGroupCount: number;
  bookingItemCount: number;
  readyCount: number;
  reviewCount: number;
  skippedCount: number;
  failedCount: number;
  startedAt?: unknown;
  completedAt?: unknown;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BookingImportRowRecord = {
  source: BookingSource;
  importRunId: string;
  sourceRowNumber: number;
  sourceRowType: BookingImportRowType;
  rowStatus: BookingImportRowStatus;
  externalBookingGroupId: string;
  sourceCalendarId: string;
  sourceCalendarName: string;
  bookingStatus: string;
  customerId: string;
  customerMatchStatus: CustomerMatchStatus;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot: string;
  matchedCaptainId: string;
  matchedCaptainNameSnapshot: string;
  matchedBoatId: string;
  matchedBoatNameSnapshot: string;
  matchedTripTypeId: string;
  matchedTripTypeNameSnapshot: string;
  reviewReason: string;
  resolutionNote: string;
  resolvedAt?: unknown;
  sourceTripLabel: string;
  sourceGuestCount: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  termsAccepted: boolean;
  totalAmount: number;
  depositPaid: number;
  remainingPaymentDue: number;
  roomCountRequested: number;
  assignedRoomCount: number;
  allInclusiveSelection: string;
  allInclusiveIncluded: boolean;
  allInclusiveGuestCount: number;
  roomSubtotal: number;
  allInclusivePrice: number;
  taxAmount: number;
  rawImportReference: string;
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
  termsAccepted: boolean;
  totalPrice: number;
  depositPaid: number;
  remainingPaymentDue: number;
  squareDepositMatchStatus: SquareDepositMatchStatus;
  squareDepositPaymentId: string;
  squareDepositReference: string;
  squareDepositMatchedAmount: number;
  squareDepositMatchedAt: string;
  roomCountRequested: number;
  assignedRoomCount: number;
  guestCount: number;
  allInclusiveSelection: string;
  allInclusiveIncluded: boolean;
  allInclusiveGuestCount: number;
  roomSubtotal: number;
  allInclusivePrice: number;
  taxAmount: number;
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
  sourceCalendarId: string;
  sourceCalendarName: string;
  sourceTripLabel: string;
  status: BookingItemStatus;
  startDateTime: string;
  endDateTime: string;
  linkedTripTypeId: string;
  linkedTripTypeNameSnapshot: string;
  linkedBoatId: string;
  linkedBoatNameSnapshot: string;
  linkedCaptainId: string;
  linkedCaptainNameSnapshot: string;
  linkedLodgeRoomId: string;
  linkedLodgeRoomNameSnapshot: string;
  quantity: number;
  guestCount: number;
  activityPrice: number;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const bookingImportRunsCollectionPath = ["admin", "data", "bookingImportRuns"] as const;
export const bookingImportRowsCollectionPath = ["admin", "data", "bookingImportRows"] as const;
export const bookingGroupsCollectionPath = ["admin", "data", "bookingGroups"] as const;
export const bookingItemsCollectionPath = ["admin", "data", "bookingItems"] as const;

export function bookingImportRunDocPath(importRunId: string) {
  return [...bookingImportRunsCollectionPath, importRunId] as const;
}

export function bookingImportRowDocPath(importRowId: string) {
  return [...bookingImportRowsCollectionPath, importRowId] as const;
}

export function bookingGroupDocPath(bookingGroupId: string) {
  return [...bookingGroupsCollectionPath, bookingGroupId] as const;
}

export function bookingItemDocPath(bookingItemId: string) {
  return [...bookingItemsCollectionPath, bookingItemId] as const;
}

export function websiteBookingImportRowDocId(externalBookingGroupId: string, rowType: BookingImportRowType) {
  return `website-import-row-${externalBookingGroupId}-${rowType}`;
}

export function websiteBookingGroupDocId(externalBookingGroupId: string) {
  return `website-booking-${externalBookingGroupId}`;
}

export function websiteBookingItemDocId(externalBookingGroupId: string, suffix = "trip") {
  return `website-booking-item-${externalBookingGroupId}-${suffix}`;
}

export function emptyBookingImportRun(): BookingImportRunRecord {
  return {
    source: "website-csv",
    sourceFileName: "",
    sourceFileChecksum: "",
    status: "pending",
    rowCount: 0,
    bookingRowCount: 0,
    bookingGroupCount: 0,
    bookingItemCount: 0,
    readyCount: 0,
    reviewCount: 0,
    skippedCount: 0,
    failedCount: 0,
    notes: "",
  };
}

export function emptyBookingImportRow(): BookingImportRowRecord {
  return {
    source: "website-csv",
    importRunId: "",
    sourceRowNumber: 0,
    sourceRowType: "unsupported",
    rowStatus: "skipped",
    externalBookingGroupId: "",
    sourceCalendarId: "",
    sourceCalendarName: "",
    bookingStatus: "",
    customerId: "",
    customerMatchStatus: "unresolved",
    customerNameSnapshot: "",
    customerPhoneSnapshot: "",
    customerEmailSnapshot: "",
    matchedCaptainId: "",
    matchedCaptainNameSnapshot: "",
    matchedBoatId: "",
    matchedBoatNameSnapshot: "",
    matchedTripTypeId: "",
    matchedTripTypeNameSnapshot: "",
    reviewReason: "",
    resolutionNote: "",
    sourceTripLabel: "",
    sourceGuestCount: "",
    startDate: "",
    endDate: "",
    guestCount: 0,
    termsAccepted: false,
    totalAmount: 0,
    depositPaid: 0,
    remainingPaymentDue: 0,
    roomCountRequested: 0,
    assignedRoomCount: 0,
    allInclusiveSelection: "",
    allInclusiveIncluded: false,
    allInclusiveGuestCount: 0,
    roomSubtotal: 0,
    allInclusivePrice: 0,
    taxAmount: 0,
    rawImportReference: "",
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
    termsAccepted: false,
    totalPrice: 0,
    depositPaid: 0,
    remainingPaymentDue: 0,
    squareDepositMatchStatus: "not-linked",
    squareDepositPaymentId: "",
    squareDepositReference: "",
    squareDepositMatchedAmount: 0,
    squareDepositMatchedAt: "",
    roomCountRequested: 0,
    assignedRoomCount: 0,
    guestCount: 0,
    allInclusiveSelection: "",
    allInclusiveIncluded: false,
    allInclusiveGuestCount: 0,
    roomSubtotal: 0,
    allInclusivePrice: 0,
    taxAmount: 0,
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
    sourceCalendarId: "",
    sourceCalendarName: "",
    sourceTripLabel: "",
    status: "active",
    startDateTime: "",
    endDateTime: "",
    linkedTripTypeId: "",
    linkedTripTypeNameSnapshot: "",
    linkedBoatId: "",
    linkedBoatNameSnapshot: "",
    linkedCaptainId: "",
    linkedCaptainNameSnapshot: "",
    linkedLodgeRoomId: "",
    linkedLodgeRoomNameSnapshot: "",
    quantity: 1,
    guestCount: 0,
    activityPrice: 0,
    notes: "",
  };
}
