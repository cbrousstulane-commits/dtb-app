"use client";

import Link from "next/link";
import React from "react";
import { collection, doc, getDoc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";

import { BoatRecord, boatsCollectionPath } from "@/lib/admin/boats";
import { CaptainRecord, captainsCollectionPath } from "@/lib/admin/captains";
import { CustomerRecord, customersCollectionPath, hydrateCustomerRecord, normalizePhone } from "@/lib/admin/customers";
import { db } from "@/lib/firebase/client";
import { TripTypeRecord, tripTypesCollectionPath } from "@/lib/admin/tripTypes";
import {
  BookingGroupRecord,
  BookingImportRowRecord,
  BookingItemRecord,
  bookingGroupDocPath,
  bookingImportRowDocPath,
  bookingItemDocPath,
  bookingItemsCollectionPath,
  websiteBookingGroupDocId,
  websiteBookingImportRowDocId,
  websiteBookingItemDocId,
} from "@/lib/admin/websiteBookings";
import { ExistingBoatOption, ExistingCaptainOption, ExistingCustomerOption, ExistingTripTypeOption } from "@/lib/admin/websiteBookingImport";

type BookingReviewPageProps = {
  bookingId: string;
};

type ReviewState = {
  customerId: string;
  captainId: string;
  boatId: string;
  tripTypeId: string;
  notes: string;
};

type BookingItemListItem = BookingItemRecord & { id: string };

type ConflictSummary = {
  bookingId: string;
  label: string;
  date: string;
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

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isHistoricalDate(value: string): boolean {
  return !!value && value < "2026-01-01";
}

function isThreeSeaterCalendar(value: string): boolean {
  return value.trim().toLowerCase().startsWith("three seater");
}

function isDaybreakCalendar(value: string): boolean {
  return value.trim().toLowerCase().startsWith("daybreak");
}

function sameDateKey(value: string): string {
  return value.slice(0, 10);
}

function loadCustomerSuggestions(importRow: Partial<BookingImportRowRecord>, customers: ExistingCustomerOption[]) {
  const phone = normalizePhone(importRow.customerPhoneSnapshot ?? "");
  const nameKey = normalizeNameKey(importRow.customerNameSnapshot ?? "");
  const suggestions = new Map<string, ExistingCustomerOption>();

  for (const customer of customers) {
    if (customer.status === "merged") continue;

    const phoneMatch = phone
      ? normalizePhone(customer.phone) === phone || customer.additionalPhones.some((item) => normalizePhone(item) === phone)
      : false;
    const nameMatch = nameKey
      ? normalizeNameKey(customer.fullName) === nameKey || customer.additionalNames.some((item) => normalizeNameKey(item) === nameKey)
      : false;

    if (phoneMatch || nameMatch) {
      suggestions.set(customer.id, customer);
    }
  }

  return Array.from(suggestions.values()).sort((left, right) => left.fullName.localeCompare(right.fullName));
}

function loadCaptainOptions(): Promise<ExistingCaptainOption[]> {
  return getDocs(collection(db, ...captainsCollectionPath)).then((snapshot) => snapshot.docs.map((docSnap) => {
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
  }));
}

function loadBoatOptions(): Promise<ExistingBoatOption[]> {
  return getDocs(collection(db, ...boatsCollectionPath)).then((snapshot) => snapshot.docs.map((docSnap) => {
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
  }));
}

function loadTripTypeOptions(): Promise<ExistingTripTypeOption[]> {
  return getDocs(collection(db, ...tripTypesCollectionPath)).then((snapshot) => snapshot.docs.map((docSnap) => {
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
  }));
}

function loadCustomers(): Promise<ExistingCustomerOption[]> {
  return getDocs(collection(db, ...customersCollectionPath)).then((snapshot) => snapshot.docs.map((docSnap) => hydrateCustomerRecord(docSnap.id, docSnap.data() as Partial<CustomerRecord>)));
}

function loadBookingItems(): Promise<BookingItemListItem[]> {
  return getDocs(collection(db, ...bookingItemsCollectionPath)).then((snapshot) => snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as BookingItemRecord) })));
}

export default function BookingReviewPage({ bookingId }: BookingReviewPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [notFound, setNotFound] = React.useState(false);
  const [importRow, setImportRow] = React.useState<BookingImportRowRecord | null>(null);
  const [bookingGroup, setBookingGroup] = React.useState<BookingGroupRecord | null>(null);
  const [bookingItem, setBookingItem] = React.useState<BookingItemListItem | null>(null);
  const [customers, setCustomers] = React.useState<ExistingCustomerOption[]>([]);
  const [captains, setCaptains] = React.useState<ExistingCaptainOption[]>([]);
  const [boats, setBoats] = React.useState<ExistingBoatOption[]>([]);
  const [tripTypes, setTripTypes] = React.useState<ExistingTripTypeOption[]>([]);
  const [bookingItems, setBookingItems] = React.useState<BookingItemListItem[]>([]);
  const [formState, setFormState] = React.useState<ReviewState>({
    customerId: "",
    captainId: "",
    boatId: "",
    tripTypeId: "",
    notes: "",
  });

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const importRowId = websiteBookingImportRowDocId(bookingId, "fishing");
        const groupId = websiteBookingGroupDocId(bookingId);
        const itemId = websiteBookingItemDocId(bookingId, "trip");

        const [importRowSnap, groupSnap, itemSnap, nextCustomers, nextCaptains, nextBoats, nextTripTypes, nextBookingItems] = await Promise.all([
          getDoc(doc(db, ...bookingImportRowDocPath(importRowId))),
          getDoc(doc(db, ...bookingGroupDocPath(groupId))),
          getDoc(doc(db, ...bookingItemDocPath(itemId))),
          loadCustomers(),
          loadCaptainOptions(),
          loadBoatOptions(),
          loadTripTypeOptions(),
          loadBookingItems(),
        ]);

        if (cancelled) return;

        if (!importRowSnap.exists()) {
          setNotFound(true);
          return;
        }

        const nextImportRow = importRowSnap.data() as BookingImportRowRecord;
        const nextGroup = groupSnap.exists() ? (groupSnap.data() as BookingGroupRecord) : null;
        const nextItem = itemSnap.exists() ? ({ id: itemSnap.id, ...(itemSnap.data() as BookingItemRecord) }) : null;

        setImportRow(nextImportRow);
        setBookingGroup(nextGroup);
        setBookingItem(nextItem);
        setCustomers(nextCustomers);
        setCaptains(nextCaptains);
        setBoats(nextBoats);
        setTripTypes(nextTripTypes);
        setBookingItems(nextBookingItems);
        setFormState({
          customerId: nextImportRow.customerId ?? nextGroup?.customerId ?? "",
          captainId: nextItem?.linkedCaptainId ?? nextImportRow.matchedCaptainId ?? "",
          boatId: nextItem?.linkedBoatId ?? nextImportRow.matchedBoatId ?? "",
          tripTypeId: nextItem?.linkedTripTypeId ?? nextImportRow.matchedTripTypeId ?? "",
          notes: nextImportRow.resolutionNote || nextGroup?.notes || nextItem?.notes || nextImportRow.reviewReason || "",
        });
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const customerSuggestions = React.useMemo(() => {
    if (!importRow) return [];
    return loadCustomerSuggestions(importRow, customers);
  }, [customers, importRow]);

  const selectedCustomer = customers.find((customer) => customer.id === formState.customerId);
  const selectedCaptain = captains.find((captain) => captain.id === formState.captainId);
  const selectedBoat = boats.find((boat) => boat.id === formState.boatId);
  const selectedTripType = tripTypes.find((tripType) => tripType.id === formState.tripTypeId);

  const captainConflicts = React.useMemo(() => {
    if (!formState.captainId || !importRow) return [];
    const dateKey = sameDateKey(importRow.startDate);
    return bookingItems
      .filter((item) => item.id !== bookingItem?.id)
      .filter((item) => item.itemType === "trip" && item.status === "active")
      .filter((item) => sameDateKey(item.startDateTime) === dateKey)
      .filter((item) => item.linkedCaptainId === formState.captainId)
      .map((item) => ({
        bookingId: item.externalBookingItemId.replace("website-booking-item-", "").replace("-trip", ""),
        label: item.linkedCaptainNameSnapshot || selectedCaptain?.name || "Captain",
        date: item.startDateTime,
      }));
  }, [bookingItem?.id, bookingItems, formState.captainId, importRow, selectedCaptain?.name]);

  const boatConflicts = React.useMemo(() => {
    if (!formState.boatId || !importRow) return [];
    const dateKey = sameDateKey(importRow.startDate);
    return bookingItems
      .filter((item) => item.id !== bookingItem?.id)
      .filter((item) => item.itemType === "trip" && item.status === "active")
      .filter((item) => sameDateKey(item.startDateTime) === dateKey)
      .filter((item) => item.linkedBoatId === formState.boatId)
      .map((item) => ({
        bookingId: item.externalBookingItemId.replace("website-booking-item-", "").replace("-trip", ""),
        label: item.linkedBoatNameSnapshot || selectedBoat?.name || "Boat",
        date: item.startDateTime,
      }));
  }, [bookingItem?.id, bookingItems, formState.boatId, importRow, selectedBoat?.name]);

  async function handleSave() {
    if (!importRow) return;

    setSaving(true);
    setStatusMessage(null);

    try {
      const importRowId = websiteBookingImportRowDocId(bookingId, "fishing");
      const groupId = websiteBookingGroupDocId(bookingId);
      const itemId = websiteBookingItemDocId(bookingId, "trip");
      const unresolved: string[] = [];
      const boatOptional = isHistoricalDate(importRow.startDate) || isThreeSeaterCalendar(importRow.sourceCalendarName);
      const captainOptional = isThreeSeaterCalendar(importRow.sourceCalendarName) || isDaybreakCalendar(importRow.sourceCalendarName);

      if (!formState.customerId) {
        unresolved.push("Customer still needs to be selected.");
      }
      if (!formState.captainId && !captainOptional) {
        unresolved.push("Captain still needs to be selected.");
      }
      if (!formState.boatId && !boatOptional) {
        unresolved.push("Boat still needs to be selected.");
      }
      if (!formState.tripTypeId && !isHistoricalDate(importRow.startDate)) {
        unresolved.push("Trip type still needs to be selected.");
      }

      const rowStatus = unresolved.length > 0 ? "review" : "resolved";
      const reviewReason = unresolved.join(" ");
      const resolutionNote = unresolved.length > 0 ? "" : (formState.notes.trim() || "Reviewed manually in admin.");
      const batch = writeBatch(db);

      batch.set(doc(db, ...bookingImportRowDocPath(importRowId)), {
        customerId: formState.customerId,
        customerMatchStatus: formState.customerId ? "matched" : importRow.customerMatchStatus,
        matchedCaptainId: formState.captainId,
        matchedCaptainNameSnapshot: selectedCaptain?.name ?? "",
        matchedBoatId: formState.boatId,
        matchedBoatNameSnapshot: selectedBoat?.name ?? "",
        matchedTripTypeId: formState.tripTypeId,
        matchedTripTypeNameSnapshot: selectedTripType?.name ?? "",
        rowStatus,
        reviewReason,
        resolutionNote,
        resolvedAt: rowStatus === "resolved" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      batch.set(doc(db, ...bookingGroupDocPath(groupId)), {
        customerId: formState.customerId,
        customerMatchStatus: formState.customerId ? "matched" : importRow.customerMatchStatus,
        customerNameSnapshot: selectedCustomer?.fullName || importRow.customerNameSnapshot,
        customerEmailSnapshot: selectedCustomer?.email || importRow.customerEmailSnapshot,
        customerPhoneSnapshot: selectedCustomer?.phone || importRow.customerPhoneSnapshot,
        notes: reviewReason || resolutionNote,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      batch.set(doc(db, ...bookingItemDocPath(itemId)), {
        linkedCaptainId: formState.captainId,
        linkedCaptainNameSnapshot: selectedCaptain?.name ?? "",
        linkedBoatId: formState.boatId,
        linkedBoatNameSnapshot: selectedBoat?.name ?? "",
        linkedTripTypeId: formState.tripTypeId,
        linkedTripTypeNameSnapshot: selectedTripType?.name ?? "",
        notes: reviewReason || resolutionNote,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await batch.commit();
      setStatusMessage(rowStatus === "resolved" ? `Booking ${bookingId} reviewed and resolved.` : `Booking ${bookingId} saved, but still needs review.`);
      setImportRow((prev) => prev ? {
        ...prev,
        customerId: formState.customerId,
        customerMatchStatus: formState.customerId ? "matched" : prev.customerMatchStatus,
        matchedCaptainId: formState.captainId,
        matchedCaptainNameSnapshot: selectedCaptain?.name ?? "",
        matchedBoatId: formState.boatId,
        matchedBoatNameSnapshot: selectedBoat?.name ?? "",
        matchedTripTypeId: formState.tripTypeId,
        matchedTripTypeNameSnapshot: selectedTripType?.name ?? "",
        rowStatus,
        reviewReason,
        resolutionNote,
      } : prev);
      setBookingGroup((prev) => prev ? {
        ...prev,
        customerId: formState.customerId,
        customerMatchStatus: formState.customerId ? "matched" : prev.customerMatchStatus,
        customerNameSnapshot: selectedCustomer?.fullName || prev.customerNameSnapshot,
        customerEmailSnapshot: selectedCustomer?.email || prev.customerEmailSnapshot,
        customerPhoneSnapshot: selectedCustomer?.phone || prev.customerPhoneSnapshot,
        notes: reviewReason || resolutionNote,
      } : prev);
      setBookingItem((prev) => prev ? {
        ...prev,
        linkedCaptainId: formState.captainId,
        linkedCaptainNameSnapshot: selectedCaptain?.name ?? "",
        linkedBoatId: formState.boatId,
        linkedBoatNameSnapshot: selectedBoat?.name ?? "",
        linkedTripTypeId: formState.tripTypeId,
        linkedTripTypeNameSnapshot: selectedTripType?.name ?? "",
        notes: reviewReason || resolutionNote,
      } : prev);
    } catch (saveError) {
      setStatusMessage(`Could not save booking review: ${errorMessage(saveError)}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="rounded-[32px] bg-[#f8fafc] px-6 py-6 text-sm text-slate-500 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">Loading booking review...</section>;
  }

  if (error) {
    return <section className="rounded-[32px] bg-[#f8fafc] px-6 py-6 text-sm text-rose-600 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">Failed to load booking review: {error}</section>;
  }

  if (notFound || !importRow) {
    return <section className="rounded-[32px] bg-[#f8fafc] px-6 py-6 text-sm text-slate-500 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">Booking review not found.</section>;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Bookings</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Review Booking {bookingId}</div>
            <div className="mt-3 text-sm text-slate-500">Review and correct the linked customer, captain, boat, and trip type for this imported booking.</div>
          </div>
          <Link href="/admin/bookings" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">Back To Bookings</Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Status" value={importRow.rowStatus} />
          <InfoCard label="Calendar" value={importRow.sourceCalendarName || "-"} />
          <InfoCard label="Dates" value={`${importRow.startDate || "-"} to ${importRow.endDate || "-"}`} />
          <InfoCard label="Imported Customer" value={importRow.customerNameSnapshot || "Unnamed customer"} />
        </div>

        {statusMessage ? <div className="mt-4 text-sm text-slate-600">{statusMessage}</div> : null}
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] px-6 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Customer</span>
            <select value={formState.customerId} onChange={(event) => setFormState((prev) => ({ ...prev, customerId: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none">
              <option value="">No customer selected</option>
              {customers.filter((customer) => customer.status !== "merged").sort((left, right) => left.fullName.localeCompare(right.fullName)).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.fullName || customer.id}{customer.phone ? ` • ${customer.phone}` : ""}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2 text-sm text-slate-600">
            <div className="font-semibold text-slate-800">Suggested customers</div>
            <div className="flex flex-wrap gap-2">
              {customerSuggestions.length === 0 ? <span className="text-slate-500">No direct phone or name suggestions.</span> : customerSuggestions.map((customer) => (
                <button key={customer.id} type="button" onClick={() => setFormState((prev) => ({ ...prev, customerId: customer.id }))} className={["inline-flex rounded-full px-3 py-2 text-xs font-semibold transition", formState.customerId === customer.id ? "bg-[#d8a641] text-slate-900" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"].join(" ")}>{customer.fullName || customer.id}{customer.phone ? ` • ${customer.phone}` : ""}</button>
              ))}
            </div>
          </div>

          <label className="space-y-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Captain</span>
            <select value={formState.captainId} onChange={(event) => setFormState((prev) => ({ ...prev, captainId: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none">
              <option value="">No captain selected</option>
              {captains.filter((captain) => captain.status === "active").sort((left, right) => left.name.localeCompare(right.name)).map((captain) => (
                <option key={captain.id} value={captain.id}>{captain.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">Boat</span>
            <select value={formState.boatId} onChange={(event) => setFormState((prev) => ({ ...prev, boatId: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none">
              <option value="">No boat selected</option>
              {boats.filter((boat) => boat.status === "active").sort((left, right) => left.name.localeCompare(right.name)).map((boat) => (
                <option key={boat.id} value={boat.id}>{boat.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-600 lg:col-span-2">
            <span className="font-semibold text-slate-800">Trip type</span>
            <select value={formState.tripTypeId} onChange={(event) => setFormState((prev) => ({ ...prev, tripTypeId: event.target.value }))} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none">
              <option value="">No trip type selected</option>
              {tripTypes.filter((tripType) => tripType.status === "active").sort((left, right) => left.name.localeCompare(right.name)).map((tripType) => (
                <option key={tripType.id} value={tripType.id}>{tripType.name}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-slate-600 lg:col-span-2">
            <span className="font-semibold text-slate-800">Review notes</span>
            <textarea value={formState.notes} onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))} rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none" />
          </label>
        </div>

        <ConflictPanel title="Captain availability warning" items={captainConflicts} emptyLabel="No same-day captain conflicts found." />
        <ConflictPanel title="Boat availability warning" items={boatConflicts} emptyLabel="No same-day boat conflicts found." />

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="inline-flex h-12 items-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:opacity-60">{saving ? "Saving..." : "Save Review"}</button>
        </div>
      </section>
    </div>
  );
}

function InfoCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}

function ConflictPanel(props: { title: string; items: ConflictSummary[]; emptyLabel: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{props.title}</div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {props.items.length === 0 ? (
          <div>{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => (
            <div key={`${item.bookingId}-${item.date}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-800">
              Booking {item.bookingId} also uses {item.label} on {item.date}.
            </div>
          ))
        )}
      </div>
    </div>
  );
}
