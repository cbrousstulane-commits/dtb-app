"use client";

import Link from "next/link";
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { CustomerRecord, customersCollectionPath } from "@/lib/admin/customers";

type CustomerListItem = CustomerRecord & {
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

export default function CustomersList() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<CustomerListItem[]>([]);

  React.useEffect(() => {
    const q = query(collection(db, ...customersCollectionPath), orderBy("fullName"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const next: CustomerListItem[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<CustomerRecord>;

          return {
            id: docSnap.id,
            fullName: data.fullName ?? "",
            fullNameLower: data.fullNameLower ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            source: data.source ?? "manual",
            squareCustomerId: data.squareCustomerId ?? "",
            websiteCustomerId: data.websiteCustomerId ?? "",
            status: data.status === "inactive" ? "inactive" : data.status === "merged" ? "merged" : "active",
            mergedIntoCustomerId: data.mergedIntoCustomerId ?? "",
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

  const activeCustomers = items.filter((item) => item.status === "active");
  const inactiveCustomers = items.filter((item) => item.status === "inactive");

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Customers</div>
            <div className="mt-1 text-sm opacity-75">
              Manage the customer master record manually now so imports and operational workflows have a stable destination later.
            </div>
          </div>

          <Link
            href="/admin/customers/new"
            className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center shrink-0"
          >
            New customer
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryCard label="Active" value={String(activeCustomers.length)} />
          <SummaryCard label="Inactive" value={String(inactiveCustomers.length)} />
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Loading customers...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
          Failed to load customers: {error}
        </section>
      ) : (
        <>
          <CustomerSection title="Active customers" items={activeCustomers} emptyLabel="No active customers yet." />
          <CustomerSection title="Inactive customers" items={inactiveCustomers} emptyLabel="No inactive customers." />
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

function CustomerSection(props: {
  title: string;
  items: CustomerListItem[];
  emptyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold">{props.title}</div>

      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          props.items.map((item) => <CustomerRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function CustomerRow({ item }: { item: CustomerListItem }) {
  return (
    <Link
      href={`/admin/customers/${item.id}`}
      className="block rounded-2xl border border-white/10 bg-black/20 p-4 active:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{item.fullName || "Unnamed customer"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">{item.email || item.phone || "No contact info"}</div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={item.status === "active" ? "Active" : "Inactive"} />
            <Pill label={item.source === "manual" ? "Manual" : item.source} />
            {item.phone ? <Pill label={item.phone} /> : null}
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