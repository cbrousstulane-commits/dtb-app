"use client";

import Link from "next/link";
import React from "react";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";

import { CustomerRecord, customersCollectionPath, hydrateCustomerRecord, normalizePhone } from "@/lib/admin/customers";
import { db } from "@/lib/firebase/client";
import { LodgeRoomRecord, lodgeRoomsCollectionPath } from "@/lib/admin/lodgeRooms";
import { parseWebsiteBookingCsv, WebsiteBookingCsvRow } from "@/lib/admin/websiteBookingImport";
import {
  BookingImportRowRecord,
  BookingItemRecord,
  bookingGroupDocPath,
  bookingImportRowDocPath,
  bookingImportRowsCollectionPath,
  bookingImportRunsCollectionPath,
  bookingItemDocPath,
  bookingItemsCollectionPath,
  emptyBookingGroup,
  emptyBookingImportRow,
  emptyBookingImportRun,
  emptyBookingItem,
  websiteBookingGroupDocId,
  websiteBookingImportRowDocId,
  websiteBookingItemDocId,
} from "@/lib/admin/websiteBookings";

type CustomerOption = CustomerRecord & { id: string };
type LodgeRoomOption = LodgeRoomRecord & { id: string };
type StoredImportRow = BookingImportRowRecord & { id: string };
type StoredBookingItem = BookingItemRecord & { id: string };

type Counts = {
  rawRows: number;
  importedStays: number;
  assignedRooms: number;
};

type LodgePreviewRow = {
  importRowId?: string;
  sourceRowNumber: number;
  externalBookingGroupId: string;
  rowStatus: "ready" | "review" | "skipped" | "resolved";
  reviewReason: string;
  customerId: string;
  customerMatchStatus: "matched" | "new" | "review" | "unresolved";
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot: string;
  sourceCalendarName: string;
  startDate: string;
  endDate: string;
  roomCountRequested: number;
  assignedRooms: Array<{ id: string; name: string }>;
  guestCount: number;
  allInclusiveSelection: string;
  allInclusiveIncluded: boolean;
  allInclusiveGuestCount: number;
  roomSubtotal: number;
  allInclusivePrice: number;
  taxAmount: number;
  totalAmount: number;
  depositPaid: number;
  remainingPaymentDue: number;
  termsAccepted: boolean;
  rawRow: WebsiteBookingCsvRow;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
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

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function firstRawValue(raw: Record<string, string>, fragments: string[]): string {
  for (const fragment of fragments) {
    const match = Object.entries(raw).find(([header]) => headerIncludes(header, fragment));
    if (match) return cleanCell(match[1]);
  }
  return "";
}

function parseRawImportReference(value: string): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function dedupeImportRows(rows: StoredImportRow[]) {
  const byKey = new Map<string, StoredImportRow>();
  for (const row of rows) {
    const key = `${row.externalBookingGroupId}::${row.sourceRowType}`;
    byKey.set(key, row);
  }
  return Array.from(byKey.values());
}

function sortRows<T extends { externalBookingGroupId: string; startDate: string; sourceRowNumber?: number }>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const rightId = Number(right.externalBookingGroupId);
    const leftId = Number(left.externalBookingGroupId);
    if (Number.isFinite(leftId) && Number.isFinite(rightId) && leftId !== rightId) {
      return rightId - leftId;
    }
    if (left.startDate !== right.startDate) {
      return right.startDate.localeCompare(left.startDate);
    }
    return (right.sourceRowNumber ?? 0) - (left.sourceRowNumber ?? 0);
  });
}

function buildAssignedRooms(rooms: LodgeRoomOption[], roomCountRequested: number) {
  return rooms.slice(0, Math.max(roomCountRequested, 0)).map((room) => ({ id: room.id, name: room.name }));
}

function matchCustomer(row: WebsiteBookingCsvRow, customers: CustomerOption[]) {
  const byPhone = row.phone ? customers.filter((customer) => normalizePhone(customer.phone) === row.phone || customer.additionalPhones.some((phone) => normalizePhone(phone) === row.phone)) : [];
  if (byPhone.length === 1) {
    return { customerId: byPhone[0].id, customerMatchStatus: "matched" as const, reviewReason: "" };
  }
  if (byPhone.length > 1) {
    return { customerId: "", customerMatchStatus: "review" as const, reviewReason: `Multiple customers match phone ${row.phone}.` };
  }

  const nameKey = normalizeNameKey(row.fullName);
  const byName = nameKey ? customers.filter((customer) => normalizeNameKey(customer.fullName) === nameKey || customer.additionalNames.some((name) => normalizeNameKey(name) === nameKey)) : [];
  if (byName.length === 1) {
    return { customerId: byName[0].id, customerMatchStatus: "matched" as const, reviewReason: "" };
  }
  if (byName.length > 1) {
    return { customerId: "", customerMatchStatus: "review" as const, reviewReason: `Multiple customers match full name ${row.fullName}.` };
  }

  return { customerId: "", customerMatchStatus: "review" as const, reviewReason: `No customer matched phone ${row.phone} or full name ${row.fullName}.` };
}

function buildLodgePreviewRows(rows: WebsiteBookingCsvRow[], customers: CustomerOption[], rooms: LodgeRoomOption[]) {
  const lodgeRows = rows.filter((row) => row.rowType === "lodge");
  return sortRows(lodgeRows.map((row) => {
    const customer = matchCustomer(row, customers);
    const roomCountRequested = parseCount(firstRawValue(row.raw, ["How many rooms would you like to book?"])) || 1;
    const assignedRooms = buildAssignedRooms(rooms, roomCountRequested);
    const guestCount = parseCount(firstRawValue(row.raw, ["How many guests are in your party?"])) || row.guestCount;
    const allInclusiveSelection = firstRawValue(row.raw, ["Would you like to make this stay all inclusive?"]);
    const allInclusiveGuestCount = parseCount(firstRawValue(row.raw, ["How many guests will participate in the all inclusive stay? - Value", "How many guests will participate in the all inclusive stay?"]));
    const roomSubtotal = parseMoney(row.raw.H1 ?? "");
    const allInclusivePrice = parseMoney(firstRawValue(row.raw, ["How many guests will participate in the all inclusive stay? - Price"]));
    const taxAmount = parseMoney(firstRawValue(row.raw, ["Hotel Tax - 13.85% - Price"]));
    const reviewReasons = [customer.reviewReason];
    if (assignedRooms.length < roomCountRequested) {
      reviewReasons.push(`Only ${assignedRooms.length} lodge rooms are configured, but ${roomCountRequested} rooms were requested.`);
    }

    return {
      sourceRowNumber: row.sourceRowNumber,
      externalBookingGroupId: row.bookingId,
      rowStatus: reviewReasons.filter(Boolean).length > 0 ? "review" : "ready",
      reviewReason: reviewReasons.filter(Boolean).join(" "),
      customerId: customer.customerId,
      customerMatchStatus: customer.customerMatchStatus,
      customerNameSnapshot: row.fullName,
      customerPhoneSnapshot: row.phone,
      customerEmailSnapshot: row.email,
      sourceCalendarName: row.calendarName,
      startDate: row.startDate,
      endDate: row.endDate,
      roomCountRequested,
      assignedRooms,
      guestCount,
      allInclusiveSelection,
      allInclusiveIncluded: allInclusiveSelection.toLowerCase().includes("yes"),
      allInclusiveGuestCount,
      roomSubtotal,
      allInclusivePrice,
      taxAmount,
      totalAmount: row.totalAmount,
      depositPaid: row.depositPaid,
      remainingPaymentDue: row.remainingPaymentDue,
      termsAccepted: row.termsAccepted,
      rawRow: row,
    } satisfies LodgePreviewRow;
  }));
}
function toStoredLodgeRow(record: StoredImportRow, bookingItems: StoredBookingItem[], rooms: LodgeRoomOption[]): LodgePreviewRow {
  const raw = parseRawImportReference(record.rawImportReference);
  const startDate = record.startDate || firstRawValue(raw, ["Start Date"]);
  const endDate = record.endDate || firstRawValue(raw, ["End Date"]);
  const roomCountRequested = typeof record.roomCountRequested === "number" && record.roomCountRequested > 0 ? record.roomCountRequested : parseCount(firstRawValue(raw, ["How many rooms would you like to book?"])) || 1;
  const roomItems = bookingItems.filter((item) => item.bookingGroupId === websiteBookingGroupDocId(record.externalBookingGroupId) && item.itemType === "lodge");
  const assignedRooms = roomItems.map((item) => {
    const room = rooms.find((candidate) => candidate.id === item.linkedLodgeRoomId);
    return {
      id: item.linkedLodgeRoomId,
      name: item.linkedLodgeRoomNameSnapshot || room?.name || item.linkedLodgeRoomId,
    };
  });
  const computedStatus = record.rowStatus === "resolved"
    ? "resolved"
    : (!record.customerId || assignedRooms.length < roomCountRequested ? "review" : "ready");
  const reviewReason = computedStatus === "review"
    ? record.reviewReason || (!record.customerId ? "Customer still needs to be matched." : `Only ${assignedRooms.length} rooms are assigned for ${roomCountRequested} requested.`)
    : record.resolutionNote || "";

  return {
    importRowId: record.id,
    sourceRowNumber: record.sourceRowNumber,
    externalBookingGroupId: record.externalBookingGroupId,
    rowStatus: computedStatus,
    reviewReason,
    customerId: record.customerId,
    customerMatchStatus: record.customerMatchStatus,
    customerNameSnapshot: record.customerNameSnapshot || [firstRawValue(raw, ["First Name"]), firstRawValue(raw, ["Last Name", "Last name"])].filter(Boolean).join(" ").trim(),
    customerPhoneSnapshot: record.customerPhoneSnapshot || normalizePhone(firstRawValue(raw, ["Phone Number"])),
    customerEmailSnapshot: record.customerEmailSnapshot || firstRawValue(raw, ["Email"]).toLowerCase(),
    sourceCalendarName: record.sourceCalendarName,
    startDate,
    endDate,
    roomCountRequested,
    assignedRooms,
    guestCount: typeof record.guestCount === "number" && record.guestCount > 0 ? record.guestCount : parseCount(firstRawValue(raw, ["How many guests are in your party?"])),
    allInclusiveSelection: record.allInclusiveSelection || firstRawValue(raw, ["Would you like to make this stay all inclusive?"]),
    allInclusiveIncluded: record.allInclusiveIncluded === true || firstRawValue(raw, ["Would you like to make this stay all inclusive?"]).toLowerCase().includes("yes"),
    allInclusiveGuestCount: typeof record.allInclusiveGuestCount === "number" ? record.allInclusiveGuestCount : parseCount(firstRawValue(raw, ["How many guests will participate in the all inclusive stay? - Value", "How many guests will participate in the all inclusive stay?"])),
    roomSubtotal: typeof record.roomSubtotal === "number" ? record.roomSubtotal : parseMoney(raw.H1 ?? ""),
    allInclusivePrice: typeof record.allInclusivePrice === "number" ? record.allInclusivePrice : parseMoney(firstRawValue(raw, ["How many guests will participate in the all inclusive stay? - Price"])),
    taxAmount: typeof record.taxAmount === "number" ? record.taxAmount : parseMoney(firstRawValue(raw, ["Hotel Tax - 13.85% - Price"])),
    totalAmount: typeof record.totalAmount === "number" ? record.totalAmount : parseMoney(firstRawValue(raw, ["Total Amount"])),
    depositPaid: typeof record.depositPaid === "number" ? record.depositPaid : parseMoney(firstRawValue(raw, ["Deposit - Price"])),
    remainingPaymentDue: typeof record.remainingPaymentDue === "number" ? record.remainingPaymentDue : parseMoney(firstRawValue(raw, ["Final Payment - Price"])),
    termsAccepted: record.termsAccepted === true || firstRawValue(raw, ["Terms and Conditions"]).length > 0,
    rawRow: {
      sourceRowNumber: record.sourceRowNumber,
      raw,
      bookingId: record.externalBookingGroupId,
      bookingStatus: record.bookingStatus,
      calendarId: record.sourceCalendarId,
      calendarName: record.sourceCalendarName,
      startDate,
      endDate,
      dateCreated: firstRawValue(raw, ["Date Created"]),
      firstName: firstRawValue(raw, ["First Name"]),
      lastName: firstRawValue(raw, ["Last Name", "Last name"]),
      fullName: record.customerNameSnapshot,
      phone: record.customerPhoneSnapshot,
      email: record.customerEmailSnapshot,
      termsAccepted: record.termsAccepted,
      totalAmount: record.totalAmount,
      depositPaid: record.depositPaid,
      remainingPaymentDue: record.remainingPaymentDue,
      guestCount: typeof record.guestCount === "number" ? record.guestCount : 0,
      sourceGuestCount: firstRawValue(raw, ["How many guests are in your party?"]),
      tripLabel: "",
      tripOptions: [],
      rowType: "lodge",
    },
  };
}

async function loadCustomers() {
  const snapshot = await getDocs(collection(db, ...customersCollectionPath));
  return snapshot.docs.map((docSnap) => hydrateCustomerRecord(docSnap.id, docSnap.data() as Partial<CustomerRecord>));
}

async function loadRooms() {
  const snapshot = await getDocs(collection(db, ...lodgeRoomsCollectionPath));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as LodgeRoomRecord) }))
    .filter((room) => room.status !== "inactive")
    .sort((left, right) => (left.name ?? "").localeCompare(right.name ?? ""));
}

async function loadStoredImportRows() {
  const snapshot = await getDocs(collection(db, ...bookingImportRowsCollectionPath));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BookingImportRowRecord) }));
}

async function loadStoredBookingItems() {
  const snapshot = await getDocs(collection(db, ...bookingItemsCollectionPath));
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BookingItemRecord) }));
}

export default function LodgeBookingsOverview() {
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [applying, setApplying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<CustomerOption[]>([]);
  const [rooms, setRooms] = React.useState<LodgeRoomOption[]>([]);
  const [storedRows, setStoredRows] = React.useState<StoredImportRow[]>([]);
  const [storedBookingItems, setStoredBookingItems] = React.useState<StoredBookingItem[]>([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [rawCsv, setRawCsv] = React.useState("");
  const [previewRows, setPreviewRows] = React.useState<LodgePreviewRow[]>([]);
  const [counts, setCounts] = React.useState<Counts>({ rawRows: 0, importedStays: 0, assignedRooms: 0 });

  const refreshData = React.useCallback(async () => {
    const [nextCustomers, nextRooms, nextStoredRows, nextStoredItems] = await Promise.all([
      loadCustomers(),
      loadRooms(),
      loadStoredImportRows(),
      loadStoredBookingItems(),
    ]);
    const lodgeRows = dedupeImportRows(nextStoredRows.filter((row) => row.sourceRowType === "lodge"));
    const lodgeItems = nextStoredItems.filter((item) => item.itemType === "lodge");
    setCustomers(nextCustomers);
    setRooms(nextRooms);
    setStoredRows(lodgeRows);
    setStoredBookingItems(lodgeItems);
    setCounts({
      rawRows: lodgeRows.length,
      importedStays: new Set(lodgeItems.map((item) => item.bookingGroupId)).size,
      assignedRooms: lodgeItems.length,
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await refreshData();
        if (!cancelled) setError(null);
      } catch (loadError) {
        if (!cancelled) setError(errorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [refreshData]);

  const persistedRows = React.useMemo(() => sortRows(storedRows.map((row) => toStoredLodgeRow(row, storedBookingItems, rooms))), [rooms, storedBookingItems, storedRows]);
  const activeRows = previewRows.length > 0 ? previewRows : persistedRows;
  const previewCounts = React.useMemo(() => ({
    ready: activeRows.filter((row) => row.rowStatus === "ready" || row.rowStatus === "resolved").length,
    review: activeRows.filter((row) => row.rowStatus === "review").length,
    skipped: activeRows.filter((row) => row.rowStatus === "skipped").length,
  }), [activeRows]);
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setStatusMessage(null);
    setSelectedFileName(file.name);
    try {
      const text = await file.text();
      const parsedRows = parseWebsiteBookingCsv(text);
      const nextPreview = buildLodgePreviewRows(parsedRows, customers, rooms);
      setRawCsv(text);
      setPreviewRows(nextPreview);
      setStatusMessage(`Loaded ${nextPreview.length} lodge rows from ${file.name}.`);
    } catch (loadError) {
      setRawCsv("");
      setPreviewRows([]);
      setStatusMessage(`Failed to parse lodge CSV: ${errorMessage(loadError)}`);
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }

  async function handleApplyImport() {
    if (!rawCsv || previewRows.length === 0) {
      setStatusMessage("Load the website CSV first.");
      return;
    }

    setApplying(true);
    setStatusMessage(null);

    try {
      const importRunRef = doc(collection(db, ...bookingImportRunsCollectionPath));
      const instructions: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge?: boolean }> = [];
      const existingLodgeItems = storedBookingItems.filter((item) => item.itemType === "lodge");
      const deleteRefs = new Map<string, ReturnType<typeof doc>>();

      instructions.push({
        ref: importRunRef,
        data: {
          ...emptyBookingImportRun(),
          sourceFileName: selectedFileName,
          sourceFileChecksum: "",
          status: "completed",
          rowCount: previewRows.length,
          bookingRowCount: previewRows.length,
          bookingGroupCount: previewRows.length,
          bookingItemCount: previewRows.reduce((sum, row) => sum + row.assignedRooms.length, 0),
          readyCount: previewCounts.ready,
          reviewCount: previewCounts.review,
          skippedCount: previewCounts.skipped,
          failedCount: 0,
          notes: "Historical lodge import from admin lodge area.",
          startedAt: serverTimestamp(),
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      });

      for (const row of previewRows) {
        const importRowId = websiteBookingImportRowDocId(row.externalBookingGroupId, "lodge");
        const groupId = websiteBookingGroupDocId(row.externalBookingGroupId);
        const desiredItemIds = new Set(row.assignedRooms.map((_, index) => websiteBookingItemDocId(row.externalBookingGroupId, `lodge-${index + 1}`)));

        for (const item of existingLodgeItems.filter((candidate) => candidate.bookingGroupId === groupId)) {
          if (!desiredItemIds.has(item.id)) {
            deleteRefs.set(item.id, doc(db, ...bookingItemDocPath(item.id)));
          }
        }

        instructions.push({
          ref: doc(db, ...bookingImportRowDocPath(importRowId)),
          data: {
            ...emptyBookingImportRow(),
            source: "website-csv",
            importRunId: importRunRef.id,
            sourceRowNumber: row.sourceRowNumber,
            sourceRowType: "lodge",
            rowStatus: row.rowStatus,
            externalBookingGroupId: row.externalBookingGroupId,
            sourceCalendarId: row.rawRow.calendarId,
            sourceCalendarName: row.sourceCalendarName,
            bookingStatus: row.rawRow.bookingStatus,
            customerId: row.customerId,
            customerMatchStatus: row.customerMatchStatus,
            customerNameSnapshot: row.customerNameSnapshot,
            customerPhoneSnapshot: row.customerPhoneSnapshot,
            customerEmailSnapshot: row.customerEmailSnapshot,
            matchedCaptainId: "",
            matchedCaptainNameSnapshot: "",
            matchedBoatId: "",
            matchedBoatNameSnapshot: "",
            matchedTripTypeId: "",
            matchedTripTypeNameSnapshot: "",
            reviewReason: row.reviewReason,
            resolutionNote: row.rowStatus === "resolved" ? (row.reviewReason || "Resolved manually in admin.") : "",
            sourceTripLabel: row.allInclusiveSelection,
            sourceGuestCount: String(row.guestCount),
            startDate: row.startDate,
            endDate: row.endDate,
            guestCount: row.guestCount,
            termsAccepted: row.termsAccepted,
            totalAmount: row.totalAmount,
            depositPaid: row.depositPaid,
            remainingPaymentDue: row.remainingPaymentDue,
            roomCountRequested: row.roomCountRequested,
            assignedRoomCount: row.assignedRooms.length,
            allInclusiveSelection: row.allInclusiveSelection,
            allInclusiveIncluded: row.allInclusiveIncluded,
            allInclusiveGuestCount: row.allInclusiveGuestCount,
            roomSubtotal: row.roomSubtotal,
            allInclusivePrice: row.allInclusivePrice,
            taxAmount: row.taxAmount,
            rawImportReference: JSON.stringify(row.rawRow.raw),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          merge: true,
        });

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
            status: "active",
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
            roomCountRequested: row.roomCountRequested,
            assignedRoomCount: row.assignedRooms.length,
            guestCount: row.guestCount,
            allInclusiveSelection: row.allInclusiveSelection,
            allInclusiveIncluded: row.allInclusiveIncluded,
            allInclusiveGuestCount: row.allInclusiveGuestCount,
            roomSubtotal: row.roomSubtotal,
            allInclusivePrice: row.allInclusivePrice,
            taxAmount: row.taxAmount,
            notes: row.reviewReason,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          merge: true,
        });

        row.assignedRooms.forEach((room, index) => {
          const itemId = websiteBookingItemDocId(row.externalBookingGroupId, `lodge-${index + 1}`);
          instructions.push({
            ref: doc(db, ...bookingItemDocPath(itemId)),
            data: {
              ...emptyBookingItem(),
              source: "website-csv",
              bookingGroupId: groupId,
              bookingImportRunId: importRunRef.id,
              rawImportReference: JSON.stringify(row.rawRow.raw),
              externalBookingItemId: itemId,
              itemType: "lodge",
              sourceProductName: row.sourceCalendarName,
              sourceProductCode: "daybreak-lodge",
              sourceCalendarId: row.rawRow.calendarId,
              sourceCalendarName: row.sourceCalendarName,
              sourceTripLabel: row.allInclusiveSelection,
              status: "active",
              startDateTime: row.startDate,
              endDateTime: row.endDate,
              linkedTripTypeId: "",
              linkedTripTypeNameSnapshot: "",
              linkedBoatId: "",
              linkedBoatNameSnapshot: "",
              linkedCaptainId: "",
              linkedCaptainNameSnapshot: "",
              linkedLodgeRoomId: room.id,
              linkedLodgeRoomNameSnapshot: room.name,
              quantity: 1,
              guestCount: row.guestCount,
              activityPrice: row.totalAmount,
              notes: row.reviewReason,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            merge: true,
          });
        });
      }

      const chunkSize = 350;
      for (let index = 0; index < instructions.length; index += chunkSize) {
        const batch = writeBatch(db);
        for (const instruction of instructions.slice(index, index + chunkSize)) {
          if (instruction.merge) batch.set(instruction.ref, instruction.data, { merge: true });
          else batch.set(instruction.ref, instruction.data);
        }
        await batch.commit();
      }

      const deleteList = Array.from(deleteRefs.values());
      for (let index = 0; index < deleteList.length; index += 450) {
        const batch = writeBatch(db);
        for (const ref of deleteList.slice(index, index + 450)) {
          batch.delete(ref);
        }
        await batch.commit();
      }

      await refreshData();
      setStatusMessage(`Imported ${previewRows.length} lodge bookings with ${previewRows.reduce((sum, row) => sum + row.assignedRooms.length, 0)} room assignments.`);
    } catch (applyError) {
      setStatusMessage(`Lodge import failed: ${errorMessage(applyError)}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Lodge</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Lodge Bookings</div>
            <div className="mt-3 max-w-3xl text-sm text-slate-500">Import and review Daybreak lodge bookings. Historical rooms are assigned sequentially from your configured room list, starting with room 1.</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px] xl:max-w-[680px] xl:flex-1">
            <SummaryCard label="Raw Rows" value={String(counts.rawRows)} />
            <SummaryCard label="Imported Stays" value={String(counts.importedStays)} />
            <SummaryCard label="Assigned Rooms" value={String(counts.assignedRooms)} />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-lg font-semibold text-slate-900">Historical lodge import</div>
            <div className="mt-2 text-sm text-slate-500">Uses Daybreak rows from the WordPress export. `H1` is treated as room subtotal, and `Yes, No` all-inclusive rows are preserved as mixed selections.</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/lodge-rooms" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Manage Lodge Rooms</Link>
            <Link href="/admin/config" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Back To Settings</Link>
          </div>
        </div>

        <label className="block space-y-2">
          <div className="text-sm font-semibold text-slate-700">Website booking CSV</div>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={processing || applying || loading} className="block w-full text-sm text-slate-700" />
        </label>

        <div className="text-sm text-slate-500">
          {selectedFileName ? `Selected file: ${selectedFileName}` : counts.rawRows > 0 ? "Showing stored lodge rows below. Load the CSV to preview a fresh lodge import." : "Choose a WordPress booking export CSV to import historical lodge stays."}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Ready" value={String(previewCounts.ready)} />
          <SummaryCard label="Review" value={String(previewCounts.review)} />
          <SummaryCard label="Skipped" value={String(previewCounts.skipped)} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleApplyImport} disabled={applying || processing || loading || previewRows.length === 0} className="inline-flex h-12 items-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:opacity-60">{applying ? "Applying..." : "Apply lodge import"}</button>
        </div>

        {statusMessage ? <div className="text-sm text-slate-500">{statusMessage}</div> : null}
        {error ? <div className="text-sm text-rose-600">Failed to load lodge context: {error}</div> : null}
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-8">
          <div>
            <div className="text-lg font-semibold text-slate-900">{previewRows.length > 0 ? "Preview" : "Imported lodge rows"}</div>
            <div className="mt-1 text-sm text-slate-500">Historical room assignments are sequential placeholders for documentation only.</div>
          </div>
          <div className="inline-flex rounded-full bg-[#f2e7cf] px-3 py-1 text-xs font-semibold text-[#8b5e12]">{activeRows.length} rows</div>
        </div>
        <div>
          {loading ? (
            <div className="px-5 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">Loading lodge rows...</div>
          ) : activeRows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-slate-500 sm:px-6 lg:px-8">No lodge rows yet.</div>
          ) : (
            activeRows.slice(0, 80).map((row) => <LodgeRowCard key={`${row.externalBookingGroupId}-${row.sourceRowNumber}`} row={row} />)
          )}
        </div>
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

function LodgeRowCard(props: { row: LodgePreviewRow }) {
  const tone = props.row.rowStatus === "ready" || props.row.rowStatus === "resolved"
    ? "bg-emerald-100 text-emerald-700"
    : props.row.rowStatus === "review"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="grid gap-3 border-b border-slate-200 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[120px_120px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_120px] md:items-start sm:px-6 lg:px-8">
      <div>
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{props.row.rowStatus}</span>
        <div className="mt-2 text-xs text-slate-500">lodge</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{props.row.externalBookingGroupId}</div>
        <div className="mt-1 text-xs text-slate-500">{props.row.sourceCalendarName}</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{props.row.customerNameSnapshot || "Unnamed customer"}</div>
        <div className="mt-1 text-xs text-slate-500">{props.row.customerPhoneSnapshot || props.row.customerEmailSnapshot || "No phone or email"}</div>
        <div className="mt-2 text-xs text-slate-500">Rooms: {props.row.roomCountRequested} requested, {props.row.assignedRooms.length} assigned</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">Guests: {props.row.guestCount}</div>
        <div className="mt-1 text-xs text-slate-500">All inclusive: {props.row.allInclusiveSelection || "No"}</div>
        <div className="mt-1 text-xs text-slate-500">All inclusive guests: {props.row.allInclusiveGuestCount}</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">{props.row.startDate || "-"}</div>
        <div className="mt-1 text-xs text-slate-500">to {props.row.endDate || "-"}</div>
        <div className="mt-2 text-xs text-slate-500">Assigned rooms: {props.row.assignedRooms.map((room) => room.name).join(", ") || "None"}</div>
      </div>
      <div>
        <div className="text-sm text-slate-900">Total ${props.row.totalAmount.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">Room ${props.row.roomSubtotal.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">All inc ${props.row.allInclusivePrice.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">Tax ${props.row.taxAmount.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">Deposit ${props.row.depositPaid.toFixed(2)}</div>
        <div className="mt-1 text-xs text-slate-500">Due ${props.row.remainingPaymentDue.toFixed(2)}</div>
      </div>
      {props.row.reviewReason ? <div className="md:col-span-6 text-xs text-amber-700">{props.row.reviewReason}</div> : null}
    </div>
  );
}

