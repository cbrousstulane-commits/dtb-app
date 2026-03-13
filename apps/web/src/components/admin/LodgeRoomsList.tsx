"use client";

import Link from "next/link";
import React from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import {
  LODGE_ROOM_LIMIT,
  LodgeRoomRecord,
  lodgeRoomsCollectionPath,
} from "@/lib/admin/lodgeRooms";

type LodgeRoomListItem = LodgeRoomRecord & {
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

async function loadLodgeRooms() {
  const snapshot = await getDocs(query(collection(db, ...lodgeRoomsCollectionPath), orderBy("name")));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<LodgeRoomRecord>;

    return {
      id: docSnap.id,
      name: data.name ?? "",
      nameLower: data.nameLower ?? "",
      slug: data.slug ?? "",
      status: data.status === "inactive" ? "inactive" : "active",
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } satisfies LodgeRoomListItem;
  });
}

export default function LodgeRoomsList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<LodgeRoomListItem[]>([]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await loadLodgeRooms();
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

  const activeRooms = items.filter((item) => item.status === "active");
  const inactiveRooms = items.filter((item) => item.status === "inactive");
  const roomSlotsRemaining = Math.max(LODGE_ROOM_LIMIT - items.length, 0);
  const creationDisabled = items.length >= LODGE_ROOM_LIMIT;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Lodge Rooms</div>
            <div className="mt-1 text-sm opacity-75">
              Manage the 8 nightly lodge room units as individual inventory-of-1 assets.
            </div>
          </div>

          <Link
            href="/admin/lodge-rooms/new"
            aria-disabled={creationDisabled}
            className={[
              "h-12 px-4 rounded-xl border font-medium flex items-center shrink-0",
              creationDisabled
                ? "border-white/10 bg-white/5 text-white/50 pointer-events-none"
                : "border-white/20 bg-white text-black",
            ].join(" ")}
          >
            New room
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <SummaryCard label="Active" value={String(activeRooms.length)} />
          <SummaryCard label="Inactive" value={String(inactiveRooms.length)} />
          <SummaryCard label="Open slots" value={String(roomSlotsRemaining)} />
        </div>

        <div className="mt-3 text-xs opacity-70">
          {creationDisabled
            ? `All ${LODGE_ROOM_LIMIT} room slots are already used. Edit an existing room instead of creating a ninth unit.`
            : `${roomSlotsRemaining} of ${LODGE_ROOM_LIMIT} room slots remain available.`}
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Loading lodge rooms...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          Failed to load lodge rooms: {error}
        </section>
      ) : (
        <>
          <LodgeRoomSection title="Active rooms" items={activeRooms} emptyLabel="No active rooms yet." />
          <LodgeRoomSection title="Inactive rooms" items={inactiveRooms} emptyLabel="No inactive rooms." />
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

function LodgeRoomSection(props: {
  title: string;
  items: LodgeRoomListItem[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>

      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => <LodgeRoomRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function LodgeRoomRow({ item }: { item: LodgeRoomListItem }) {
  return (
    <Link
      href={`/admin/lodge-rooms/${item.id}`}
      className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.name || "Unnamed room"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">slug: {item.slug || "-"}</div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label="Nightly unit" />
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
