"use client";

import React from "react";
import { collection, getDocs } from "firebase/firestore";

import {
  bookingGroupsCollectionPath,
  bookingImportRunsCollectionPath,
  bookingItemsCollectionPath,
} from "@/lib/admin/websiteBookings";
import { db } from "@/lib/firebase/client";

type Counts = {
  importRuns: number;
  bookingGroups: number;
  bookingItems: number;
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

async function loadCounts(): Promise<Counts> {
  const [importRuns, bookingGroups, bookingItems] = await Promise.all([
    getDocs(collection(db, ...bookingImportRunsCollectionPath)),
    getDocs(collection(db, ...bookingGroupsCollectionPath)),
    getDocs(collection(db, ...bookingItemsCollectionPath)),
  ]);

  return {
    importRuns: importRuns.size,
    bookingGroups: bookingGroups.size,
    bookingItems: bookingItems.size,
  };
}

export default function WebsiteBookingsOverview() {
  const [counts, setCounts] = React.useState<Counts>({
    importRuns: 0,
    bookingGroups: 0,
    bookingItems: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await loadCounts();
        if (cancelled) return;
        setCounts(next);
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

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Website Booking Import Shell</div>
        <div className="mt-1 text-sm opacity-75">
          The raw booking collections now exist in the app model. This page is the landing spot for the CSV import flow once the website export is available again.
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <SummaryCard label="Import runs" value={String(counts.importRuns)} />
        <SummaryCard label="Booking groups" value={String(counts.bookingGroups)} />
        <SummaryCard label="Booking items" value={String(counts.bookingItems)} />
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Loading booking shell counts...
        </section>
      ) : null}

      {error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          Failed to load booking shell counts: {error}
        </section>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Collections</div>
        <div className="mt-3 space-y-3 text-sm opacity-80">
          <CollectionRow
            label="bookingImportRuns"
            path="admin/data/bookingImportRuns"
            description="One record per import attempt, including file snapshot metadata and row counts."
          />
          <CollectionRow
            label="bookingGroups"
            path="admin/data/bookingGroups"
            description="One record per overall website reservation or order."
          />
          <CollectionRow
            label="bookingItems"
            path="admin/data/bookingItems"
            description="One record per imported trip, lodge, or add-on component."
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Planned import behavior</div>
        <div className="mt-3 space-y-2 text-sm opacity-80">
          <div>1. Preserve the website CSV data first as raw booking groups and booking items.</div>
          <div>2. Keep unresolved customer and trip-type matching safe instead of forcing guessed links.</div>
          <div>3. Let cancellations and modifications survive as status and history, not destructive deletes.</div>
          <div>4. Assemble operational trip contexts later from preserved imported components.</div>
        </div>
      </section>
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

function CollectionRow(props: {
  label: string;
  path: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="font-medium">{props.label}</div>
      <div className="mt-1 text-xs opacity-60">{props.path}</div>
      <div className="mt-2 text-sm opacity-80">{props.description}</div>
    </div>
  );
}
