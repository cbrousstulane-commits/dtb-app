"use client";

import Link from "next/link";
import React from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { BoatRecord, boatsCollectionPath } from "@/lib/admin/boats";
import { TripTypeRecord, tripTypesCollectionPath } from "@/lib/admin/tripTypes";
import {
  BoatRateBoatOption,
  BoatRateTripTypeOption,
  BoatTripTypeRateFormValues,
  BoatTripTypeRateRecord,
  boatTripTypeRatesCollectionPath,
  formatMoney,
  normalizeBoatTripTypeRatePayload,
} from "@/lib/admin/boatTripTypeRates";

type BoatTripTypeRateListItem = BoatTripTypeRateRecord & {
  id: string;
};

type EditableRateRow = {
  localId: string;
  rateId?: string;
  tripTypeId: string;
  retailPrice: string;
  ownerContractPrice: string;
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

function makeRow(seed?: Partial<EditableRateRow>): EditableRateRow {
  return {
    localId: crypto.randomUUID(),
    rateId: seed?.rateId,
    tripTypeId: seed?.tripTypeId ?? "",
    retailPrice: seed?.retailPrice ?? "",
    ownerContractPrice: seed?.ownerContractPrice ?? "",
  };
}

export default function BoatTripTypeRatesList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [boats, setBoats] = React.useState<BoatRateBoatOption[]>([]);
  const [tripTypes, setTripTypes] = React.useState<BoatRateTripTypeOption[]>([]);
  const [items, setItems] = React.useState<BoatTripTypeRateListItem[]>([]);
  const [selectedBoatId, setSelectedBoatId] = React.useState("");
  const [rows, setRows] = React.useState<EditableRateRow[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let boatsReady = false;
    let tripTypesReady = false;
    let ratesReady = false;

    const updateLoading = () => setLoading(!(boatsReady && tripTypesReady && ratesReady));

    const unsubBoats = onSnapshot(
      collection(db, ...boatsCollectionPath),
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Partial<BoatRecord>;
            return {
              id: docSnap.id,
              name: data.name ?? "",
              status: data.status === "inactive" ? "inactive" : "active",
            } satisfies BoatRateBoatOption;
          })
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
        setBoats(next);
        boatsReady = true;
        updateLoading();
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError));
        boatsReady = true;
        updateLoading();
      },
    );

    const unsubTripTypes = onSnapshot(
      collection(db, ...tripTypesCollectionPath),
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Partial<TripTypeRecord>;
            return {
              id: docSnap.id,
              name: data.name ?? "",
              status: data.status === "inactive" ? "inactive" : "active",
            } satisfies BoatRateTripTypeOption;
          })
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
        setTripTypes(next);
        tripTypesReady = true;
        updateLoading();
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError));
        tripTypesReady = true;
        updateLoading();
      },
    );

    const unsubRates = onSnapshot(
      collection(db, ...boatTripTypeRatesCollectionPath),
      (snapshot) => {
        const next = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as Partial<BoatTripTypeRateRecord>;
            return {
              id: docSnap.id,
              boatId: data.boatId ?? "",
              boatNameSnapshot: data.boatNameSnapshot ?? "",
              tripTypeId: data.tripTypeId ?? "",
              tripTypeNameSnapshot: data.tripTypeNameSnapshot ?? "",
              retailPrice: typeof data.retailPrice === "number" ? data.retailPrice : 0,
              ownerContractPrice: typeof data.ownerContractPrice === "number" ? data.ownerContractPrice : null,
              status: data.status === "inactive" ? ("inactive" as const) : ("active" as const),
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          })
          .sort(compareRates);
        setItems(next);
        ratesReady = true;
        updateLoading();
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError));
        ratesReady = true;
        updateLoading();
      },
    );

    return () => {
      unsubBoats();
      unsubTripTypes();
      unsubRates();
    };
  }, []);

  React.useEffect(() => {
    if (!selectedBoatId && boats.length > 0) {
      setSelectedBoatId(boats.find((boat) => boat.status === "active")?.id ?? boats[0].id);
    }
  }, [boats, selectedBoatId]);

  const selectedBoat = boats.find((boat) => boat.id === selectedBoatId) ?? null;
  const activeRatesForBoat = React.useMemo(
    () => items.filter((item) => item.boatId === selectedBoatId && item.status === "active"),
    [items, selectedBoatId],
  );
  const inactiveRatesForBoat = React.useMemo(
    () => items.filter((item) => item.boatId === selectedBoatId && item.status === "inactive"),
    [items, selectedBoatId],
  );

  React.useEffect(() => {
    const nextRows = activeRatesForBoat.map((item) =>
      makeRow({
        rateId: item.id,
        tripTypeId: item.tripTypeId,
        retailPrice: String(item.retailPrice),
        ownerContractPrice: item.ownerContractPrice == null ? "" : String(item.ownerContractPrice),
      }),
    );
    setRows(nextRows.length > 0 ? nextRows : [makeRow()]);
    setStatusMessage(null);
  }, [selectedBoatId, activeRatesForBoat]);

  const tripTypeOptions = React.useMemo(
    () => tripTypes.filter((item) => item.status === "active" || rows.some((row) => row.tripTypeId === item.id)),
    [tripTypes, rows],
  );

  async function handleSave() {
    if (!selectedBoatId || !selectedBoat) {
      setStatusMessage("Select a boat first.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const normalizedRows = rows.filter((row) => row.tripTypeId || row.retailPrice || row.ownerContractPrice);
      if (normalizedRows.length === 0) {
        throw new Error("Add at least one trip pricing row.");
      }

      const duplicateTripTypes = findDuplicateTripTypes(normalizedRows);
      if (duplicateTripTypes.length > 0) {
        throw new Error(`Trip type can only appear once per boat. Duplicate: ${duplicateTripTypes.join(", ")}`);
      }

      const batch = writeBatch(db);
      const usedExistingIds = new Set<string>();
      const reusableInactiveByTripType = new Map(
        inactiveRatesForBoat.map((item) => [item.tripTypeId, item]),
      );

      for (const row of normalizedRows) {
        const formValues: BoatTripTypeRateFormValues = {
          boatId: selectedBoatId,
          tripTypeId: row.tripTypeId,
          retailPrice: row.retailPrice,
          ownerContractPrice: row.ownerContractPrice,
          status: "active",
        };

        const payload = normalizeBoatTripTypeRatePayload(formValues, boats, tripTypes);
        const refId = row.rateId || reusableInactiveByTripType.get(row.tripTypeId)?.id;
        const ref = refId
          ? doc(db, ...boatTripTypeRatesCollectionPath, refId)
          : doc(collection(db, ...boatTripTypeRatesCollectionPath));

        batch.set(
          ref,
          {
            ...payload,
            updatedAt: serverTimestamp(),
            ...(refId ? {} : { createdAt: serverTimestamp() }),
          },
          { merge: true },
        );

        usedExistingIds.add(ref.id);
      }

      for (const existing of activeRatesForBoat) {
        if (usedExistingIds.has(existing.id)) continue;
        batch.set(
          doc(db, ...boatTripTypeRatesCollectionPath, existing.id),
          {
            status: "inactive",
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();
      setStatusMessage(`Saved trip pricing for ${selectedBoat.name || "selected boat"}.`);
    } catch (saveError) {
      setStatusMessage(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  function updateRow(localId: string, patch: Partial<EditableRateRow>) {
    setRows((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(localId: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length > 0 ? next : [makeRow()];
    });
  }

  function restoreInactive(rateId: string) {
    const match = inactiveRatesForBoat.find((item) => item.id === rateId);
    if (!match) return;

    setRows((prev) => [
      ...prev,
      makeRow({
        rateId: match.id,
        tripTypeId: match.tripTypeId,
        retailPrice: String(match.retailPrice),
        ownerContractPrice: match.ownerContractPrice == null ? "" : String(match.ownerContractPrice),
      }),
    ]);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Trip Pricing</div>
            <div className="mt-1 text-sm opacity-75">
              Set pricing in a single grid per boat. Each row is one trip type with retail and optional contract pricing.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="Active" value={String(items.filter((item) => item.status === "active").length)} />
            <SummaryCard label="Inactive" value={String(items.filter((item) => item.status === "inactive").length)} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="block space-y-2">
            <div className="text-sm font-medium">Boat</div>
            <select
              value={selectedBoatId}
              disabled={loading || saving}
              onChange={(event) => setSelectedBoatId(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
            >
              <option value="">Select a boat</option>
              {boats.map((boat) => (
                <option key={boat.id} value={boat.id}>
                  {boat.name || "Unnamed boat"}
                  {boat.status === "inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={addRow}
            disabled={loading || saving || !selectedBoatId}
            className="h-12 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium active:bg-white/10 disabled:opacity-60"
          >
            Add row
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving || !selectedBoatId}
            className="h-12 rounded-xl border border-white/20 bg-white px-4 text-sm font-medium text-black disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save pricing"}
          </button>
        </div>

        {error ? <div className="text-sm text-red-300">Failed to load trip pricing: {error}</div> : null}
        {statusMessage ? <div className="text-sm opacity-80">{statusMessage}</div> : null}

        {selectedBoat ? (
          <div className="text-sm opacity-75">
            Editing pricing for <span className="font-medium text-white">{selectedBoat.name || "Unnamed boat"}</span>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="hidden md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-3 px-2 pb-3 text-xs uppercase tracking-wider opacity-60">
          <div>Trip Type</div>
          <div>Retail Price</div>
          <div>Contract Price</div>
          <div></div>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <RateEditorRow
              key={row.localId}
              row={row}
              tripTypes={tripTypeOptions}
              disabled={loading || saving || !selectedBoatId}
              onChange={updateRow}
              onRemove={removeRow}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Inactive pricing rows</div>
        <div className="mt-3 space-y-3">
          {inactiveRatesForBoat.length === 0 ? (
            <div className="text-sm opacity-70">No inactive pricing rows for this boat.</div>
          ) : (
            inactiveRatesForBoat.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{item.tripTypeNameSnapshot || "Unnamed trip type"}</div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <Pill label={`Retail ${formatMoney(item.retailPrice)}`} />
                      <Pill label={`Contract ${formatMoney(item.ownerContractPrice)}`} />
                      <Pill label="Inactive" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreInactive(item.id)}
                    className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm active:bg-white/10"
                  >
                    Restore
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-75">
        Legacy single-record routes still exist if needed: <Link href="/admin/boat-rates/new" className="underline">new rate</Link>
      </section>
    </div>
  );
}

function findDuplicateTripTypes(rows: EditableRateRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const tripTypeId = row.tripTypeId.trim();
    if (!tripTypeId) continue;
    counts.set(tripTypeId, (counts.get(tripTypeId) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([tripTypeId]) => tripTypeId);
}

function compareRates(a: BoatTripTypeRateListItem, b: BoatTripTypeRateListItem) {
  const boatCompare = (a.boatNameSnapshot || "").localeCompare(b.boatNameSnapshot || "", undefined, { sensitivity: "base" });
  if (boatCompare !== 0) return boatCompare;
  return (a.tripTypeNameSnapshot || "").localeCompare(b.tripTypeNameSnapshot || "", undefined, { sensitivity: "base" });
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-wider opacity-60">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
    </div>
  );
}

function RateEditorRow(props: {
  row: EditableRateRow;
  tripTypes: BoatRateTripTypeOption[];
  disabled: boolean;
  onChange: (localId: string, patch: Partial<EditableRateRow>) => void;
  onRemove: (localId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] md:gap-3 md:items-center space-y-3 md:space-y-0">
      <label className="block space-y-2 md:space-y-0">
        <div className="text-xs uppercase tracking-wider opacity-60 md:hidden">Trip Type</div>
        <select
          value={props.row.tripTypeId}
          disabled={props.disabled}
          onChange={(event) => props.onChange(props.row.localId, { tripTypeId: event.target.value })}
          className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
        >
          <option value="">Select trip type</option>
          {props.tripTypes.map((tripType) => (
            <option key={tripType.id} value={tripType.id}>
              {tripType.name || "Unnamed trip type"}
              {tripType.status === "inactive" ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-2 md:space-y-0">
        <div className="text-xs uppercase tracking-wider opacity-60 md:hidden">Retail Price</div>
        <input
          value={props.row.retailPrice}
          inputMode="decimal"
          placeholder="0"
          disabled={props.disabled}
          onChange={(event) => props.onChange(props.row.localId, { retailPrice: event.target.value })}
          className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
        />
      </label>

      <label className="block space-y-2 md:space-y-0">
        <div className="text-xs uppercase tracking-wider opacity-60 md:hidden">Contract Price</div>
        <input
          value={props.row.ownerContractPrice}
          inputMode="decimal"
          placeholder="Optional"
          disabled={props.disabled}
          onChange={(event) => props.onChange(props.row.localId, { ownerContractPrice: event.target.value })}
          className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
        />
      </label>

      <button
        type="button"
        onClick={() => props.onRemove(props.row.localId)}
        disabled={props.disabled}
        className="h-12 rounded-xl border border-white/10 bg-white/5 px-3 text-sm active:bg-white/10 disabled:opacity-60"
      >
        Remove
      </button>
    </div>
  );
}

function Pill(props: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{props.label}</span>;
}
