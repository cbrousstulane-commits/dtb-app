"use client";

import Link from "next/link";
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { TripTypeRecord, tripTypesCollectionPath } from "@/lib/admin/tripTypes";

type TripTypeListItem = TripTypeRecord & {
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

export default function TripTypesList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<TripTypeListItem[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, ...tripTypesCollectionPath), orderBy("name"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: TripTypeListItem[] = snapshot.docs.map((docSnap) => {
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

  const activeTripTypes = items.filter((item) => item.status === "active");
  const inactiveTripTypes = items.filter((item) => item.status === "inactive");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Trip Types</div>
            <div className="mt-1 text-sm opacity-75">
              Manage the admin-defined trip catalog and store each trip type duration in hours.
            </div>
          </div>

          <Link
            href="/admin/trip-types/new"
            className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center shrink-0"
          >
            New trip type
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryCard label="Active" value={String(activeTripTypes.length)} />
          <SummaryCard label="Inactive" value={String(inactiveTripTypes.length)} />
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Loading trip types...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          Failed to load trip types: {error}
        </section>
      ) : (
        <>
          <TripTypeSection title="Active trip types" items={activeTripTypes} emptyLabel="No active trip types yet." />
          <TripTypeSection title="Inactive trip types" items={inactiveTripTypes} emptyLabel="No inactive trip types." />
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

function TripTypeSection(props: {
  title: string;
  items: TripTypeListItem[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>

      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => <TripTypeRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function TripTypeRow({ item }: { item: TripTypeListItem }) {
  return (
    <Link
      href={`/admin/trip-types/${item.id}`}
      className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.name || "Unnamed trip type"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">slug: {item.slug || "-"}</div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label={`${item.durationHours} hours`} />
          </div>
        </div>

        <div className="text-sm opacity-60">{"->"}</div>
      </div>
    </Link>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
      {label}
    </span>
  );
}