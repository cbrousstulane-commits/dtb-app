"use client";

import Link from "next/link";
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { CustomerRecord, customersCollectionPath, normalizeAdditionalNames } from "@/lib/admin/customers";
import { db } from "@/lib/firebase/client";

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
  const [search, setSearch] = React.useState("");
  const [activePage, setActivePage] = React.useState(1);
  const [inactivePage, setInactivePage] = React.useState(1);

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
            additionalNames: normalizeAdditionalNames(data.additionalNames),
            email: data.email ?? "",
            phone: data.phone ?? "",
            source: data.source ?? "manual",
            squareCustomerId: data.squareCustomerId ?? "",
            websiteCustomerId: data.websiteCustomerId ?? "",
            customerMatchStatus: data.customerMatchStatus ?? "unresolved",
            squareImportLastRunId: data.squareImportLastRunId ?? "",
            squareImportUpdatedAt: data.squareImportUpdatedAt ?? "",
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

  React.useEffect(() => {
    setActivePage(1);
    setInactivePage(1);
  }, [search]);

  const searchTerm = search.trim().toLowerCase();
  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return items;

    return items.filter((item) => {
      const haystacks = [item.fullName, item.email, item.phone];
      return haystacks.some((value) => value.toLowerCase().includes(searchTerm));
    });
  }, [items, searchTerm]);

  const sortedItems = React.useMemo(() => [...filteredItems].sort(compareCustomers), [filteredItems]);

  const activeCustomers = sortedItems.filter((item) => item.status === "active");
  const inactiveCustomers = sortedItems.filter((item) => item.status === "inactive");

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

          <div className="flex gap-3 shrink-0">
            <Link
              href="/admin/customers/import-square"
              className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
            >
              Import Square CSV
            </Link>
            <Link
              href="/admin/customers/new"
              className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium flex items-center"
            >
              New customer
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <SummaryCard label="Active" value={String(activeCustomers.length)} />
          <SummaryCard label="Inactive" value={String(inactiveCustomers.length)} />
        </div>

        <label className="mt-4 block space-y-2">
          <div className="text-sm font-medium">Search customers</div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or phone"
            className="h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none placeholder:text-white/40"
          />
        </label>
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
          <CustomerSection
            title="Active customers"
            items={activeCustomers}
            emptyLabel="No active customers yet."
            page={activePage}
            onPageChange={setActivePage}
          />
          <CustomerSection
            title="Inactive customers"
            items={inactiveCustomers}
            emptyLabel="No inactive customers."
            page={inactivePage}
            onPageChange={setInactivePage}
          />
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
  page: number;
  onPageChange: (page: number) => void;
}) {
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(props.items.length / pageSize));
  const currentPage = Math.min(props.page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageItems = props.items.slice(startIndex, startIndex + pageSize);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{props.title}</div>
        {props.items.length > 0 ? (
          <div className="text-xs opacity-60">
            Page {currentPage} of {totalPages}
          </div>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {props.items.length === 0 ? (
          <div className="text-sm opacity-70">{props.emptyLabel}</div>
        ) : (
          pageItems.map((item) => <CustomerRow key={item.id} item={item} />)
        )}
      </div>

      {props.items.length > pageSize ? (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <button
            type="button"
            onClick={() => props.onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => props.onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="h-10 rounded-xl border border-white/10 bg-black/20 px-4 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      ) : null}
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
            {item.customerMatchStatus !== "unresolved" ? <Pill label={`match: ${item.customerMatchStatus}`} /> : null}
            {item.additionalNames.length > 0 ? <Pill label={`aliases: ${item.additionalNames.length}`} /> : null}
            {item.phone ? <Pill label={item.phone} /> : null}
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

function compareCustomers(a: CustomerListItem, b: CustomerListItem) {
  const aName = a.fullName.trim();
  const bName = b.fullName.trim();

  if (!aName && bName) return 1;
  if (aName && !bName) return -1;

  return aName.localeCompare(bName, undefined, { sensitivity: "base" });
}
