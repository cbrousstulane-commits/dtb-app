"use client";

import Link from "next/link";
import React from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { CaptainRecord, captainsCollectionPath } from "@/lib/admin/captains";
import { db } from "@/lib/firebase/client";

type CaptainListItem = CaptainRecord & {
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

async function loadCaptains() {
  const snapshot = await getDocs(query(collection(db, ...captainsCollectionPath), orderBy("name")));
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
    } satisfies CaptainListItem;
  });
}

export default function CaptainsList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<CaptainListItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await loadCaptains();
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

  const activeCaptains = items.filter((item) => item.status === "active");
  const inactiveCaptains = items.filter((item) => item.status === "inactive");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Captains</div>
            <div className="mt-1 text-sm opacity-75">
              Active captains can sign in through their Google email. Admin access can be turned on per captain when needed.
            </div>
          </div>

          <Link
            href="/admin/captains/new"
            className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center shrink-0"
          >
            New captain
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryCard label="Active" value={String(activeCaptains.length)} />
          <SummaryCard label="Inactive" value={String(inactiveCaptains.length)} />
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Loading captains...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          Failed to load captains: {error}
        </section>
      ) : (
        <>
          <CaptainSection title="Active captains" items={activeCaptains} emptyLabel="No active captains yet." />
          <CaptainSection title="Inactive captains" items={inactiveCaptains} emptyLabel="No inactive captains." />
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

function CaptainSection(props: {
  title: string;
  items: CaptainListItem[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>

      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => <CaptainRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function CaptainRow({ item }: { item: CaptainListItem }) {
  return (
    <Link
      href={`/admin/captains/${item.id}`}
      className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.name || "Unnamed captain"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">slug: {item.slug || "-"}</div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label={item.authUid ? "Auth linked" : "Auth not linked"} />
            <Pill label={item.adminAccess ? "Admin access" : "Captain access"} />
            {item.email ? <Pill label={item.email} /> : null}
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
