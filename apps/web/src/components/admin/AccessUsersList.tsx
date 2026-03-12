"use client";

import Link from "next/link";
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { AccessUserRecord, accessUsersCollectionPath } from "@/lib/admin/accessUsers";
import { db } from "@/lib/firebase/client";

type AccessUserListItem = AccessUserRecord & {
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

export default function AccessUsersList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<AccessUserListItem[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, ...accessUsersCollectionPath), orderBy("name"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: AccessUserListItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<AccessUserRecord>;

          return {
            id: docSnap.id,
            name: data.name ?? "",
            nameLower: data.nameLower ?? "",
            email: data.email ?? "",
            authUid: data.authUid ?? "",
            role: data.role === "admin" ? "admin" : "user",
            status: data.status === "inactive" ? "inactive" : "active",
            notes: data.notes ?? "",
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
  const adminCount = items.filter((item) => item.role === "admin" && item.status === "active").length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Access Users</div>
            <div className="mt-1 text-sm opacity-75">
              Manage Google-email access for non-captain staff and admin users. Claims are assigned automatically after sign-in.
            </div>
          </div>

          <Link
            href="/admin/users/new"
            className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center shrink-0"
          >
            New user
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <SummaryCard label="Active" value={String(activeItems.length)} />
          <SummaryCard label="Inactive" value={String(inactiveItems.length)} />
          <SummaryCard label="Admins" value={String(adminCount)} />
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Loading access users...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          Failed to load access users: {error}
        </section>
      ) : (
        <>
          <AccessUserSection title="Active users" items={activeItems} emptyLabel="No active access users yet." />
          <AccessUserSection title="Inactive users" items={inactiveItems} emptyLabel="No inactive access users." />
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

function AccessUserSection(props: {
  title: string;
  items: AccessUserListItem[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>

      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => <AccessUserRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function AccessUserRow({ item }: { item: AccessUserListItem }) {
  return (
    <Link
      href={`/admin/users/${item.id}`}
      className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.name || "Unnamed user"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">{item.email || "No email"}</div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label={item.role === "admin" ? "Admin" : "User"} />
            <Pill label={item.authUid ? "Auth linked" : "Auth not linked"} />
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