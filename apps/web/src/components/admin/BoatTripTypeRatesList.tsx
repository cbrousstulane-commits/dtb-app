"use client";

import Link from "next/link";
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { BoatTripTypeRateRecord, boatTripTypeRatesCollectionPath, formatMoney } from "@/lib/admin/boatTripTypeRates";

type BoatTripTypeRateListItem = BoatTripTypeRateRecord & {
  id: string;
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

export default function BoatTripTypeRatesList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<BoatTripTypeRateListItem[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, ...boatTripTypeRatesCollectionPath), orderBy("boatNameSnapshot"), orderBy("tripTypeNameSnapshot"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: BoatTripTypeRateListItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<BoatTripTypeRateRecord>;
          return {
            id: docSnap.id,
            boatId: data.boatId ?? "",
            boatNameSnapshot: data.boatNameSnapshot ?? "",
            tripTypeId: data.tripTypeId ?? "",
            tripTypeNameSnapshot: data.tripTypeNameSnapshot ?? "",
            retailPrice: typeof data.retailPrice === "number" ? data.retailPrice : 0,
            ownerContractPrice: typeof data.ownerContractPrice === "number" ? data.ownerContractPrice : null,
            status: data.status === "inactive" ? "inactive" : "active",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
        });

        setItems(next);
        setError(null);
        setLoading(false);
      },
      (snapshotError) => {
        setError(errorMessage(snapshotError));
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const activeItems = items.filter((item) => item.status === "active");
  const inactiveItems = items.filter((item) => item.status === "inactive");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Trip Pricing</div>
            <div className="mt-1 text-sm opacity-75">
              Boat trip type rates set the retail price and optional owner contract price owed to the boat owner for each trip type.
            </div>
          </div>

          <Link
            href="/admin/boat-rates/new"
            className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center shrink-0"
          >
            New rate
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryCard label="Active" value={String(activeItems.length)} />
          <SummaryCard label="Inactive" value={String(inactiveItems.length)} />
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">Loading trip pricing...</section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">Failed to load trip pricing: {error}</section>
      ) : (
        <>
          <RateSection title="Active rates" items={activeItems} emptyLabel="No active trip pricing yet." />
          <RateSection title="Inactive rates" items={inactiveItems} emptyLabel="No inactive trip pricing." />
        </>
      )}
    </div>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs uppercase tracking-wider opacity-60">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold">{props.value}</div>
    </div>
  );
}

function RateSection(props: { title: string; items: BoatTripTypeRateListItem[]; emptyLabel: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? <div className="text-sm opacity-70">{props.emptyLabel}</div> : props.items.map((item) => <RateRow key={item.id} item={item} />)}
      </div>
    </section>
  );
}

function RateRow({ item }: { item: BoatTripTypeRateListItem }) {
  return (
    <Link href={`/admin/boat-rates/${item.id}`} className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.boatNameSnapshot || "Unnamed boat"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">{item.tripTypeNameSnapshot || "Unnamed trip type"}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label={`Retail ${formatMoney(item.retailPrice)}`} />
            <Pill label={`Contract ${formatMoney(item.ownerContractPrice)}`} />
          </div>
        </div>
        <div className="text-sm opacity-60">-&gt;</div>
      </div>
    </Link>
  );
}

function Pill(props: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{props.label}</span>;
}
