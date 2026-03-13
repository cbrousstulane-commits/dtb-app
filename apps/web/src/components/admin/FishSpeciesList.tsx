"use client";

import Link from "next/link";
import React from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { FishSpeciesRecord, fishSpeciesCollectionPath } from "@/lib/admin/fishSpecies";

type FishSpeciesListItem = FishSpeciesRecord & {
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

async function loadFishSpecies() {
  const snapshot = await getDocs(query(collection(db, ...fishSpeciesCollectionPath), orderBy("name")));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<FishSpeciesRecord>;
    return {
      id: docSnap.id,
      name: data.name ?? "",
      nameLower: data.nameLower ?? "",
      slug: data.slug ?? "",
      status: data.status === "inactive" ? "inactive" : "active",
      subspecies: Array.isArray(data.subspecies) ? data.subspecies : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } satisfies FishSpeciesListItem;
  });
}

export default function FishSpeciesList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<FishSpeciesListItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await loadFishSpecies();
        if (cancelled) return;
        setItems(next);
        setError(null);
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
  }, []);

  const activeItems = items.filter((item) => item.status === "active");
  const inactiveItems = items.filter((item) => item.status === "inactive");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Fish Species</div>
            <div className="mt-1 text-sm opacity-75">
              Define fish species and maintain subspecies rows inside each species record for catch reporting.
            </div>
          </div>

          <Link href="/admin/fish-species/new" className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center shrink-0">
            New species
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryCard label="Active" value={String(activeItems.length)} />
          <SummaryCard label="Inactive" value={String(inactiveItems.length)} />
          <SummaryCard label="Subspecies" value={String(items.reduce((sum, item) => sum + item.subspecies.length, 0))} />
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">Loading fish species...</section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">Failed to load fish species: {error}</section>
      ) : (
        <>
          <FishSection title="Active species" items={activeItems} emptyLabel="No active species yet." />
          <FishSection title="Inactive species" items={inactiveItems} emptyLabel="No inactive species." />
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

function FishSection(props: { title: string; items: FishSpeciesListItem[]; emptyLabel: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => <FishRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function FishRow({ item }: { item: FishSpeciesListItem }) {
  const activeSubspecies = item.subspecies.filter((sub) => sub.status !== "inactive").length;
  return (
    <Link href={`/admin/fish-species/${item.id}`} className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.name || "Unnamed species"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">slug: {item.slug || "-"}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label={`${activeSubspecies} active subspecies`} />
            <Pill label={`${item.subspecies.length} total rows`} />
          </div>
        </div>
        <div className="text-sm opacity-60">{"->"}</div>
      </div>
    </Link>
  );
}

function Pill({ label }: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{label}</span>;
}
