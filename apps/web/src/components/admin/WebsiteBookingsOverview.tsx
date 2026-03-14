"use client";

import Link from "next/link";
import React from "react";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";

import { BoatRecord, boatsCollectionPath } from "@/lib/admin/boats";
import { CaptainRecord, captainsCollectionPath } from "@/lib/admin/captains";
import { CustomerRecord, customersCollectionPath, hydrateCustomerRecord, normalizePhone } from "@/lib/admin/customers";
import { TripTypeRecord, tripTypesCollectionPath } from "@/lib/admin/tripTypes";
import {
  buildWebsiteBookingPreviewRows,
  ExistingBoatOption,
  ExistingCaptainOption,
  ExistingCustomerOption,
  ExistingTripTypeOption,
  parseWebsiteBookingCsv,
  WebsiteBookingCsvRow,
  WebsiteBookingPreviewRow,
} from "@/lib/admin/websiteBookingImport";
import {
  BookingImportRowRecord,
  bookingGroupDocPath,
  bookingGroupsCollectionPath,
  bookingImportRowDocPath,
  bookingImportRowsCollectionPath,
  bookingImportRunsCollectionPath,
  bookingItemsCollectionPath,
  emptyBookingGroup,
  emptyBookingImportRow,
  emptyBookingImportRun,
  emptyBookingItem,
  websiteBookingGroupDocId,
  websiteBookingImportRowDocId,
  websiteBookingItemDocId,
} from "@/lib/admin/websiteBookings";
import { db } from "@/lib/firebase/client";

type Counts = {
  importRuns: number;
  importRows: number;
  bookingGroups: number;
  bookingItems: number;
};

type PreviewCounts = {
  ready: number;
  review: number;
  skipped: number;
};

type StoredImportRow = BookingImportRowRecord & { id: string };

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function slugifySourceCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function summarize(rows: WebsiteBookingPreviewRow[]): PreviewCounts {
  return rows.reduce(
    (acc, row) => {
      if (row.rowStatus === "ready") acc.ready += 1;
      else if (row.rowStatus === "review") acc.review += 1;
      else acc.skipped += 1;
      return acc;
    },
    { ready: 0, review: 0, skipped: 0 },
  );
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function headerIncludes(header: string, fragment: string): boolean {
  return normalizeHeader(header).includes(normalizeHeader(fragment));
}

function cleanCell(value: string): string {
  const trimmed = value.trim();
  return trimmed === "-" ? "" : trimmed;
}

function parseMoney(value: string): number {
  const cleaned = cleanCell(value).replace(/[$,]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCount(value: string): number {
  const cleaned = cleanCell(value);
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRawImportReference(value: string): Record<string, string> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, rawValue]) => [key, typeof rawValue === "string" ? rawValue : String(rawValue ?? "")]),
    );
  } catch {
    return {};
  }
}

function firstRawValue(raw: Record<string, string>, fragments: string[]): string {
  for (const fragment of fragments) {
    const match = Object.entries(raw).find(([header]) => headerIncludes(header, fragment));
    if (match) return cleanCell(match[1]);
  }
  return "";
}
function importRowKey(row: Pick<BookingImportRowRecord, "externalBookingGroupId" | "sourceRowType">) {
  return `${row.externalBookingGroupId}::${row.sourceRowType}`;
}

function timestampMillis(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const maybeTimestamp = value as { seconds?: number; nanoseconds?: number; toMillis?: () => number };
  if (typeof maybeTimestamp.toMillis === "function") return maybeTimestamp.toMillis();
  if (typeof maybeTimestamp.seconds === "number") {
    const nanos = typeof maybeTimestamp.nanoseconds === "number" ? maybeTimestamp.nanoseconds : 0;
  
  return (maybeTimestamp.seconds * 1000) + Math.floor(nanos / 1_000_000);
  }
  return 0;
}

function dedupeImportRows(rows: StoredImportRow[]) {
  const byKey = new Map<string, StoredImportRow>();

  for (const row of rows) {
    const key = importRowKey(row);
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, row);
      continue;
    }

    const currentTime = Math.max(timestampMillis(current.updatedAt), timestampMillis(current.createdAt));
    const nextTime = Math.max(timestampMillis(row.updatedAt), timestampMillis(row.createdAt));

    if (nextTime >= currentTime) {
      byKey.set(key, row);
    }
  }

  return Array.from(byKey.values());
}

function sortPreviewRows(rows: WebsiteBookingPreviewRow[]) {
  return [...rows].sort((left, right) => {
    const rightId = Number(right.externalBookingGroupId);
    const leftId = Number(left.externalBookingGroupId);

    if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
      return rightId - leftId;
    }

    if (left.startDate !== right.startDate) {
      return right.startDate.localeCompare(left.startDate);
    }

    return right.sourceRowNumber - left.sourceRowNumber;
  });
}

function toStoredPreviewRow(
  record: StoredImportRow,
  context: {
    customers: ExistingCustomerOption[];
    captains: ExistingCaptainOption[];
    boats: ExistingBoatOption[];
    tripTypes: ExistingTripTypeOption[];
  },
): WebsiteBookingPreviewRow {
  const raw = parseRawImportReference(record.rawImportReference);
  const matchedCustomer = record.customerId ? context.customers.find((customer) => customer.id === record.customerId) : undefined;
  const matchedCaptain = record.matchedCaptainId ? context.captains.find((captain) => captain.id === record.matchedCaptainId) : undefined;
  const matchedBoat = record.matchedBoatId ? context.boats.find((boat) => boat.id === record.matchedBoatId) : undefined;
  const matchedTripType = record.matchedTripTypeId ? context.tripTypes.find((tripType) => tripType.id === record.matchedTripTypeId) : undefined;

  const fallbackFirstName = firstRawValue(raw, ["First Name"]);
  const fallbackLastName = firstRawValue(raw, ["Last Name", "Last name"]);
  const fallbackFullName = [fallbackFirstName, fallbackLastName].filter(Boolean).join(" ").trim();
  const customerNameSnapshot = record.customerNameSnapshot || fallbackFullName || matchedCustomer?.fullName || "";
  const customerPhoneSnapshot = record.customerPhoneSnapshot || normalizePhone(firstRawValue(raw, ["Phone Number"])) || matchedCustomer?.phone || "";
  const customerEmailSnapshot = record.customerEmailSnapshot || firstRawValue(raw, ["Email"]).toLowerCase() || matchedCustomer?.email || "";
  const startDate = record.startDate || firstRawValue(raw, ["Start Date"]);
  const endDate = record.endDate || firstRawValue(raw, ["End Date"]);
  const guestSource = record.sourceGuestCount || firstRawValue(raw, ["Please select the number of people coming aboard", "How many guests are in your party?"]);
  const guestCount = typeof record.guestCount === "number" && record.guestCount > 0 ? record.guestCount : parseCount(guestSource);
  const termsAccepted = record.termsAccepted === true || firstRawValue(raw, ["Terms and Conditions"]).length > 0;
  const totalAmount = typeof record.totalAmount === "number" && record.totalAmount > 0 ? record.totalAmount : parseMoney(firstRawValue(raw, ["Total Amount"]));
  const depositPaid = typeof record.depositPaid === "number" && record.depositPaid > 0 ? record.depositPaid : parseMoney(firstRawValue(raw, ["Deposit - Price"]));
  const remainingPaymentDue = typeof record.remainingPaymentDue === "number" && record.remainingPaymentDue > 0 ? record.remainingPaymentDue : parseMoney(firstRawValue(raw, ["Final Payment - Price"]));
  const bookingStatus = record.bookingStatus || firstRawValue(raw, ["Booking Status"]);
  const dateCreated = firstRawValue(raw, ["Date Created"]);
  const sourceTripLabel = record.sourceTripLabel || firstRawValue(raw, ["Would you like a Shelf Trip or Long Range Trip", "Would you like 10 Hour or 14 Hour charter", "Would you like a 10 hour or 14 day charter?", "Please select from the following"]);

  const rawRow: WebsiteBookingCsvRow = {
    sourceRowNumber: record.sourceRowNumber,
    raw,
    bookingId: record.externalBookingGroupId,
    bookingStatus,
    calendarId: record.sourceCalendarId,
    calendarName: record.sourceCalendarName,
    startDate,
    endDate,
    dateCreated,
    firstName: fallbackFirstName,
    lastName: fallbackLastName,
    fullName: customerNameSnapshot,
    phone: customerPhoneSnapshot,
    email: customerEmailSnapshot,
    termsAccepted,
    totalAmount,
    depositPaid,
    remainingPaymentDue,
    guestCount,
    sourceGuestCount: guestSource,
    tripLabel: sourceTripLabel,
    tripOptions: sourceTripLabel ? [sourceTripLabel] : [],
    rowType: record.sourceRowType,
  };

  const reviewReason = record.rowStatus === "resolved"
    ? (record.resolutionNote || "Resolved manually in admin.")
    : record.reviewReason;

  return {
    sourceRowNumber: record.sourceRowNumber,
    externalBookingGroupId: record.externalBookingGroupId,
    rowType: record.sourceRowType,
    rowStatus: record.rowStatus,
    reviewReason,
    bookingStatus: record.bookingStatus === "cancelled" || record.bookingStatus === "modified" ? record.bookingStatus : "active",
    customerId: record.customerId,
    customerMatchStatus: record.customerMatchStatus,
    customerNameSnapshot,
    customerPhoneSnapshot,
    customerEmailSnapshot,
    matchedCaptainId: record.matchedCaptainId,
    matchedCaptainName: record.matchedCaptainNameSnapshot || matchedCaptain?.name || "",
    matchedBoatId: record.matchedBoatId,
    matchedBoatName: record.matchedBoatNameSnapshot || matchedBoat?.name || "",
    matchedTripTypeId: record.matchedTripTypeId,
    matchedTripTypeName: record.matchedTripTypeNameSnapshot || matchedTripType?.name || "",
    sourceCalendarId: record.sourceCalendarId,
    sourceCalendarName: record.sourceCalendarName,
    sourceTripLabel,
    startDate,
    endDate,
    guestCount,
    termsAccepted,
    totalAmount,
    depositPaid,
    remainingPaymentDue,
    rawRow,
  };
}

async function loadCustomers(): Promise<ExistingCustomerOption[]> {
  const snapshot = await getDocs(collection(db, ...customersCollectionPath));
  return snapshot.docs.map((docSnap) => hydrateCustomerRecord(docSnap.id, docSnap.data() as Partial<CustomerRecord>));
}

async function loadCaptains(): Promise<ExistingCaptainOption[]> {
  const snapshot = await getDocs(collection(db, ...captainsCollectionPath));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<CaptainRecord>;
    return {
      id: docSnap.id,
      name: data.name ?? "",
      nameLower: data.nameLower ?? "",
      slug: data.slug ?? "",
      email: data.email ?? "",
      authUid: data.authUid ?? "",
      adminAccess: data.adminAccess === true,
      status: data.status === "inactive" ? "inactive" : "active",
      notes: data.notes ?? "",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

async function loadBoats(): Promise<ExistingBoatOption[]> {
  const snapshot = await getDocs(collection(db, ...boatsCollectionPath));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<BoatRecord>;
    return {
      id: docSnap.id,
      name: data.name ?? "",
      nameLower: data.nameLower ?? "",
      slug: data.slug ?? "",
      primaryCaptainId: data.primaryCaptainId ?? "",
      primaryCaptainNameSnapshot: data.primaryCaptainNameSnapshot ?? "",
      status: data.status === "inactive" ? "inactive" : "active",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

async function loadTripTypes(): Promise<ExistingTripTypeOption[]> {
  const snapshot = await getDocs(collection(db, ...tripTypesCollectionPath));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<TripTypeRecord>;
    return {
      id: docSnap.id,
      name: data.name ?? "",
      nameLower: data.nameLower ?? "",
      slug: data.slug ?? "",
      durationHours: typeof data.durationHours === "number" ? data.durationHours : 0,
      status: data.status === "inactive" ? "inactive" : "active",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

async function loadStoredImportRows() {
  const snapshot = await getDocs(collection(db, ...bookingImportRowsCollectionPath));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as BookingImportRowRecord),
  })) satisfies StoredImportRow[];
}

export default function WebsiteBookingsOverview() {
  const [counts, setCounts] = React.useState<Counts>({ importRuns: 0, importRows: 0, bookingGroups: 0, bookingItems: 0 });
  const [loadingShell, setLoadingShell] = React.useState(true);
  const [shellError, setShellError] = React.useState<string | null>(null);
  const [loadingContext, setLoadingContext] = React.useState(true);
  const [customers, setCustomers] = React.useState<ExistingCustomerOption[]>([]);
  const [captains, setCaptains] = React.useState<ExistingCaptainOption[]>([]);
  const [boats, setBoats] = React.useState<ExistingBoatOption[]>([]);
  const [tripTypes, setTripTypes] = React.useState<ExistingTripTypeOption[]>([]);
  const [storedImportRows, setStoredImportRows] = React.useState<StoredImportRow[]>([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [rawCsv, setRawCsv] = React.useState("");
  const [previewRows, setPreviewRows] = React.useState<WebsiteBookingPreviewRow[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const refreshShellData = React.useCallback(async () => {
    const [importRunsSnapshot, importRows, bookingGroupsSnapshot, bookingItemsSnapshot] = await Promise.all([
      getDocs(collection(db, ...bookingImportRunsCollectionPath)),
      loadStoredImportRows(),
      getDocs(collection(db, ...bookingGroupsCollectionPath)),
      getDocs(collection(db, ...bookingItemsCollectionPath)),
    ]);

    const dedupedImportRows = dedupeImportRows(importRows);
    setStoredImportRows(dedupedImportRows);
    setCounts({
      importRuns: importRunsSnapshot.size,
      importRows: dedupedImportRows.length,
      bookingGroups: bookingGroupsSnapshot.size,
      bookingItems: bookingItemsSnapshot.size,
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [nextCustomers, nextCaptains, nextBoats, nextTripTypes] = await Promise.all([
          loadCustomers(),
          loadCaptains(),
          loadBoats(),
          loadTripTypes(),
        ]);

        if (cancelled) return;

        setCustomers(nextCustomers);
        setCaptains(nextCaptains);
        setBoats(nextBoats);
        setTripTypes(nextTripTypes);

        await refreshShellData();

        if (!cancelled) {
          setShellError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setShellError(errorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingShell(false);
          setLoadingContext(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshShellData]);

  async function handleResolveRow(row: WebsiteBookingPreviewRow) {
    if (previewRows.length > 0 || row.rowStatus !== "review") {
      return;
    }

    try {
      const importRowId = websiteBookingImportRowDocId(row.externalBookingGroupId, row.rowType);
      const groupId = websiteBookingGroupDocId(row.externalBookingGroupId);
      const itemId = websiteBookingItemDocId(row.externalBookingGroupId, "trip");
      const resolutionNote = row.reviewReason || "Resolved manually in admin.";
      const batch = writeBatch(db);

      batch.set(doc(db, ...bookingImportRowDocPath(importRowId)), {
        rowStatus: "resolved",
        resolutionNote,
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (row.rowType === "fishing") {
        batch.set(doc(db, ...bookingGroupDocPath(groupId)), {
          notes: "",
          updatedAt: serverTimestamp(),
        }, { merge: true });

        batch.set(doc(db, ...bookingItemsCollectionPath, itemId), {
          notes: "",
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      await batch.commit();
      await refreshShellData();
      setStatusMessage(`Resolved booking ${row.externalBookingGroupId}.`);
    } catch (error) {
      setStatusMessage(`Failed to resolve booking ${row.externalBookingGroupId}: ${errorMessage(error)}`);
    }
  }

  const persistedRows = React.useMemo(
    () => sortPreviewRows(storedImportRows.map((row) => toStoredPreviewRow(row, { customers, captains, boats, tripTypes }))),
    [boats, captains, customers, storedImportRows, tripTypes],
  );

  const activeRows = previewRows.length > 0 ? previewRows : persistedRows;
  const previewCounts = React.useMemo(() => summarize(activeRows), [activeRows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMessage(null);
    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      const parsedRows = parseWebsiteBookingCsv(text);
      const nextPreviewRows = sortPreviewRows(buildWebsiteBookingPreviewRows(parsedRows, {
        customers,
        captains,
        boats,
        tripTypes,
      }));
      setRawCsv(text);
      setPreviewRows(nextPreviewRows);
      setStatusMessage(`Loaded ${nextPreviewRows.length} website booking rows. Fishing rows are importable now; Daybreak lodge rows are preserved and skipped.`);
    } catch (error) {
      setRawCsv("");
      setPreviewRows([]);
      setStatusMessage(`Failed to parse CSV: ${errorMessage(error)}`);
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }

  async function handleApplyImport() {
    if (!rawCsv || previewRows.length === 0) {
      setStatusMessage("Load a website booking CSV first.");
      return;
    }

    setApplying(true);
    setStatusMessage(null);

    try {
      const checksum = await sha256(rawCsv);
      const importRunRef = doc(collection(db, ...bookingImportRunsCollectionPath));
      const instructions: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge?: boolean }> = [];
      const deleteRefs = new Map<string, ReturnType<typeof doc>>();
      const importableRows = previewRows.filter((row) => row.rowType === "fishing");
      const previewSummary = summarize(previewRows);
      const existingImportRows = await loadStoredImportRows();
      const previewKeys = new Set(previewRows.map((row) => importRowKey({ externalBookingGroupId: row.externalBookingGroupId, sourceRowType: row.rowType })));

      for (const row of existingImportRows) {
        const key = importRowKey(row);
        if (!previewKeys.has(key)) continue;
        const stableId = websiteBookingImportRowDocId(row.externalBookingGroupId, row.sourceRowType);
        if (row.id !== stableId) {
          deleteRefs.set(row.id, doc(db, ...bookingImportRowDocPath(row.id)));
        }
      }
      instructions.push({
        ref: importRunRef,
        data: {
          ...emptyBookingImportRun(),
          sourceFileName: selectedFileName,
          sourceFileChecksum: checksum,
          status: "completed",
          rowCount: previewRows.length,
          bookingRowCount: importableRows.length,
          bookingGroupCount: importableRows.length,
          bookingItemCount: importableRows.length,
          readyCount: previewSummary.ready,
          reviewCount: previewSummary.review,
          skippedCount: previewSummary.skipped,
          failedCount: 0,
          notes: "Historical fishing-booking import from admin bookings area.",
          startedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      });

      for (const row of previewRows) {
        const importRowId = websiteBookingImportRowDocId(row.externalBookingGroupId, row.rowType);

        instructions.push({
          ref: doc(db, ...bookingImportRowDocPath(importRowId)),
          data: {
            ...emptyBookingImportRow(),
            source: "website-csv",
            importRunId: importRunRef.id,
            sourceRowNumber: row.sourceRowNumber,
            sourceRowType: row.rowType,
            rowStatus: row.rowStatus,
            externalBookingGroupId: row.externalBookingGroupId,
            sourceCalendarId: row.sourceCalendarId,
            sourceCalendarName: row.sourceCalendarName,
            bookingStatus: row.rawRow.bookingStatus,
            customerId: row.customerId,
            customerMatchStatus: row.customerMatchStatus,
            customerNameSnapshot: row.customerNameSnapshot,
            customerPhoneSnapshot: row.customerPhoneSnapshot,
            customerEmailSnapshot: row.customerEmailSnapshot,
            matchedCaptainId: row.matchedCaptainId,
            matchedCaptainNameSnapshot: row.matchedCaptainName,
            matchedBoatId: row.matchedBoatId,
            matchedBoatNameSnapshot: row.matchedBoatName,
            matchedTripTypeId: row.matchedTripTypeId,
            matchedTripTypeNameSnapshot: row.matchedTripTypeName,
            reviewReason: row.reviewReason,
            sourceTripLabel: row.sourceTripLabel,
            sourceGuestCount: row.rawRow.sourceGuestCount,
            startDate: row.startDate,
            endDate: row.endDate,
            guestCount: row.guestCount,
            termsAccepted: row.termsAccepted,
            totalAmount: row.totalAmount,
            depositPaid: row.depositPaid,
            remainingPaymentDue: row.remainingPaymentDue,
            rawImportReference: JSON.stringify(row.rawRow.raw),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          merge: true,
        });

        if (row.rowType !== "fishing") {
          continue;
        }

        const groupId = websiteBookingGroupDocId(row.externalBookingGroupId);
        const itemId = websiteBookingItemDocId(row.externalBookingGroupId, "trip");

        instructions.push({
          ref: doc(db, ...bookingGroupDocPath(groupId)),
          data: {
            ...emptyBookingGroup(),
            source: "website-csv",
            externalBookingGroupId: row.externalBookingGroupId,
            bookingImportRunId: importRunRef.id,
            rawImportReference: JSON.stringify(row.rawRow.raw),
            customerId: row.customerId,
            customerMatchStatus: row.customerMatchStatus,
            customerNameSnapshot: row.customerNameSnapshot,
            customerEmailSnapshot: row.customerEmailSnapshot,
            customerPhoneSnapshot: row.customerPhoneSnapshot,
            status: row.bookingStatus,
            bookingDate: row.startDate,
            sourceUpdatedAt: row.rawRow.dateCreated,
            termsAccepted: row.termsAccepted,
            totalPrice: row.totalAmount,
            depositPaid: row.depositPaid,
            remainingPaymentDue: row.remainingPaymentDue,
            squareDepositMatchStatus: row.depositPaid > 0 ? "pending" : "not-linked",
            squareDepositPaymentId: "",
            squareDepositReference: "",
            squareDepositMatchedAmount: 0,
            squareDepositMatchedAt: "",
            notes: row.reviewReason,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          merge: true,
        });

        instructions.push({
          ref: doc(db, ...bookingItemsCollectionPath, itemId),
          data: {
            ...emptyBookingItem(),
            source: "website-csv",
            bookingGroupId: groupId,
            bookingImportRunId: importRunRef.id,
            rawImportReference: JSON.stringify(row.rawRow.raw),
            externalBookingItemId: itemId,
            itemType: "trip",
            sourceProductName: row.sourceTripLabel || row.sourceCalendarName,
            sourceProductCode: slugifySourceCode(row.sourceTripLabel || row.sourceCalendarName),
            sourceCalendarId: row.sourceCalendarId,
            sourceCalendarName: row.sourceCalendarName,
            sourceTripLabel: row.sourceTripLabel,
            status: row.bookingStatus,
            startDateTime: row.startDate,
            endDateTime: row.endDate,
            linkedTripTypeId: row.matchedTripTypeId,
            linkedTripTypeNameSnapshot: row.matchedTripTypeName,
            linkedBoatId: row.matchedBoatId,
            linkedBoatNameSnapshot: row.matchedBoatName,
            linkedCaptainId: row.matchedCaptainId,
            linkedCaptainNameSnapshot: row.matchedCaptainName,
            linkedLodgeRoomId: "",
            quantity: 1,
            guestCount: row.guestCount,
            activityPrice: row.totalAmount,
            notes: row.reviewReason,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          merge: true,
        });
      }

      const chunkSize = 350;
      for (let index = 0; index < instructions.length; index += chunkSize) {
        const batch = writeBatch(db);
        for (const instruction of instructions.slice(index, index + chunkSize)) {
          if (instruction.merge) {
            batch.set(instruction.ref, instruction.data, { merge: true });
          } else {
            batch.set(instruction.ref, instruction.data);
          }
        }
        await batch.commit();
      }

      const deleteRefsList = Array.from(deleteRefs.values());
      for (let index = 0; index < deleteRefsList.length; index += 450) {
        const batch = writeBatch(db);
        for (const ref of deleteRefsList.slice(index, index + 450)) {
          batch.delete(ref);
        }
        await batch.commit();
      }

      await refreshShellData();
      setStatusMessage(`Imported ${importableRows.length} fishing bookings. Review rows: ${previewSummary.review}. Skipped lodge rows: ${previewSummary.skipped}.`);
    } catch (error) {
      setStatusMessage(`Import failed: ${errorMessage(error)}`);
    } finally {
      setApplying(false);
    }
  }


  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Bookings</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Website Booking Import</div>
            <div className="mt-3 max-w-3xl text-sm text-slate-500">
              Import historical fishing bookings from the WordPress export by matching customers to the existing customer database, preserving raw rows, and keeping lodge rows for the next step.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 xl:min-w-[680px] xl:max-w-[760px] xl:flex-1">
            <SummaryCard label="Import Runs" value={String(counts.importRuns)} />
            <SummaryCard label="Raw Rows" value={String(counts.importRows)} />
            <SummaryCard label="Booking Groups" value={String(counts.bookingGroups)} />
            <SummaryCard label="Booking Items" value={String(counts.bookingItems)} />
          </div>
        </div>
      </section>
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">Historical fishing-booking import</div>
            <div className="mt-2 text-sm text-slate-500">
              Matching rules: customer by phone, then exact full-name fallback; captain from calendar name; Three Seater rows map to Fincat with no captain; pre-2026 boat links stay blank unless the row is Three Seater.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/config/backup-restore" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              Back To Backup And Restore
            </Link>
          </div>
        </div>

        <label className="block space-y-2">
          <div className="text-sm font-semibold text-slate-700">Website booking CSV</div>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={processing || applying || loadingContext} className="block w-full text-sm text-slate-700" />
        </label>

        <div className="text-sm text-slate-500">
          {loadingContext
            ? "Loading existing customers, captains, boats, and trip types..."
            : selectedFileName
              ? `Selected file: ${selectedFileName}`
              : counts.importRows > 0
                ? "Showing imported booking rows below. Choose a CSV to preview a fresh re-import."
                : "Choose a WordPress booking export CSV to preview the historical fishing import."}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Ready" value={String(previewCounts.ready)} />
          <SummaryCard label="Review" value={String(previewCounts.review)} />
          <SummaryCard label="Skipped" value={String(previewCounts.skipped)} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleApplyImport} disabled={applying || processing || loadingContext || previewRows.length === 0} className="inline-flex h-12 items-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:opacity-60">
            {applying ? "Applying..." : "Apply import"}
          </button>
        </div>

        {statusMessage ? <div className="text-sm text-slate-500">{statusMessage}</div> : null}
        {shellError ? <div className="text-sm text-rose-600">Failed to load import context: {shellError}</div> : null}
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-lg font-semibold text-slate-900">{previewRows.length > 0 ? "Preview" : "Imported rows"}</div>
            <div className="mt-1 text-sm text-slate-500">
              {previewRows.length > 0
                ? "Ready and review rows will import as historical fishing bookings. Daybreak lodge rows are preserved in raw import rows and skipped from booking creation for now."
                : "These rows reflect the latest stored import state. Load a CSV if you want to preview a fresh re-import before applying it."}
            </div>
          </div>
          <div className="inline-flex rounded-full bg-[#f2e7cf] px-3 py-1 text-xs font-semibold text-[#8b5e12]">{activeRows.length} rows</div>
        </div>

        <div className="hidden grid-cols-[110px_110px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_110px_110px] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 md:grid sm:px-6 lg:px-8">
          <div>Status</div>
          <div>Booking</div>
          <div>Customer</div>
          <div>Captain / Boat</div>
          <div>Trip</div>
          <div>Dates</div>
          <div>Amounts</div>
        </div>

        <div>
          {activeRows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">No imported or preview rows yet.</div>
          ) : (
            activeRows.slice(0, 80).map((row) => <PreviewRow key={`${row.externalBookingGroupId}-${row.rowType}-${row.sourceRowNumber}`} row={row} canResolve={previewRows.length === 0} onResolve={handleResolveRow} />)
          )}
        </div>

        {activeRows.length > 80 ? <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">Showing first 80 rows of {activeRows.length}.</div> : null}
      </section>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string }) {

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{props.label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}

function PreviewRow(props: { row: WebsiteBookingPreviewRow; canResolve: boolean; onResolve: (row: WebsiteBookingPreviewRow) => void | Promise<void> }) {
  const tone = props.row.rowStatus === "ready"
    ? "bg-emerald-100 text-emerald-700"
    : props.row.rowStatus === "review"
      ? "bg-amber-100 text-amber-700"
      : props.row.rowStatus === "resolved"
        ? "bg-sky-100 text-sky-700"
        : "bg-slate-100 text-slate-700";


  return (
    <div className="grid gap-3 border-b border-slate-200 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[110px_110px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_110px_110px] md:items-start sm:px-6 lg:px-8">
      <div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{props.row.rowStatus}</span>
        <div className="mt-2 text-xs text-slate-500">{props.row.rowType}</div>
        {props.canResolve && props.row.rowStatus === "review" ? (
          <button
            type="button"
            onClick={() => void props.onResolve(props.row)}
            className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Resolve
          </button>
        ) : null}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{props.row.externalBookingGroupId}</div>
        <div className="mt-1 text-xs text-slate-500">{props.row.sourceCalendarName}</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{props.row.customerNameSnapshot || "Unnamed customer"}</div>
        <div className="mt-1 text-xs text-slate-500">{props.row.customerPhoneSnapshot || props.row.customerEmailSnapshot || "No phone or email"}</div>
        <div className="mt-2 text-xs text-slate-500">Customer match: {props.row.customerId ? "matched" : props.row.customerMatchStatus}</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">{props.row.matchedCaptainName || "No captain linked"}</div>
        <div className="mt-1 text-xs text-slate-500">{props.row.matchedBoatName || "No boat linked"}</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">{props.row.matchedTripTypeName || props.row.sourceTripLabel || "No trip type linked"}</div>
        <div className="mt-1 text-xs text-slate-500">Guests: {props.row.guestCount || 0}</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">{props.row.startDate || "-"}</div>
        <div className="mt-1 text-xs text-slate-500">to {props.row.endDate || "-"}</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">${props.row.totalAmount.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">Deposit ${props.row.depositPaid.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">Due ${props.row.remainingPaymentDue.toFixed(2)}</div>
      </div>
      {props.row.reviewReason ? <div className="md:col-span-7 text-xs text-amber-700">{props.row.reviewReason}</div> : null}
    </div>
  );
}
