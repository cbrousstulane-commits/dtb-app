"use client";

import Link from "next/link";
import React from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

import { CustomerRecord, customersCollectionPath, normalizeAdditionalNames } from "@/lib/admin/customers";
import { db } from "@/lib/firebase/client";

type CustomerListItem = CustomerRecord & {
  id: string;
};

const PAGE_SIZE = 10;

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
  const [page, setPage] = React.useState(1);

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
    setPage(1);
  }, [search]);

  const searchTerm = search.trim().toLowerCase();
  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return items;

    return items.filter((item) => {
      const haystacks = [item.fullName, item.email, item.phone];
      return haystacks.some((value) => value.toLowerCase().includes(searchTerm));
    });
  }, [items, searchTerm]);

  const visibleItems = React.useMemo(
    () => [...filteredItems].sort(compareCustomers),
    [filteredItems],
  );

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = visibleItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const activeCount = visibleItems.filter((item) => item.status === "active").length;
  const inactiveCount = visibleItems.filter((item) => item.status === "inactive").length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Customer Directory</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Customers</h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <IconButton label="Search">
              <SearchIcon />
            </IconButton>
            <Link
              href="/admin/customers/import-square"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <UploadIcon />
              Import Square CSV
            </Link>
            <Link
              href="/admin/customers/new"
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a]"
            >
              <PlusIcon />
              Add Customer
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Visible customers" value={String(visibleItems.length)} />
          <StatCard label="Active" value={String(activeCount)} tone="green" />
          <StatCard label="Inactive" value={String(inactiveCount)} tone="slate" />
        </div>

        <label className="mt-5 block">
          <span className="sr-only">Search customers</span>
          <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
            <SearchIcon />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or phone"
              className="h-full w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>
        </label>
      </section>

      <section className="overflow-hidden rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                <th className="px-5 py-4 sm:px-6">Name</th>
                <th className="px-5 py-4 sm:px-6">Email address</th>
                <th className="px-5 py-4 sm:px-6">Phone number</th>
                <th className="px-5 py-4 sm:px-6">Status</th>
                <th className="px-5 py-4 text-right sm:px-6">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-500 sm:px-6">
                    Loading customers...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-red-600 sm:px-6">
                    Failed to load customers: {error}
                  </td>
                </tr>
              ) : pageItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-500 sm:px-6">
                    {searchTerm ? "No customers match that search." : "No customers yet."}
                  </td>
                </tr>
              ) : (
                pageItems.map((item) => <CustomerRow key={item.id} item={item} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm">
            10/Page
          </div>

          <div className="flex items-center gap-2 self-center">
            <PagerButton label="Previous" disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} />
            {buildPageNumbers(currentPage, totalPages).map((entry, index) =>
              entry === "ellipsis" ? (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400">...</span>
              ) : (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setPage(entry)}
                  className={[
                    "h-10 min-w-10 rounded-xl px-3 text-sm font-medium transition",
                    entry === currentPage ? "bg-[#f2e7cf] text-[#8b5e12]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  {entry}
                </button>
              ),
            )}
            <PagerButton label="Next" disabled={currentPage === totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))} />
          </div>

          <div className="text-sm text-slate-500 lg:text-right">
            Showing {pageItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}-{(currentPage - 1) * PAGE_SIZE + pageItems.length} of {visibleItems.length} customers
          </div>
        </div>
      </section>
    </div>
  );
}

function CustomerRow({ item }: { item: CustomerListItem }) {
  const initials = item.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <tr className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50/80">
      <td className="px-5 py-4 sm:px-6">
        <Link href={`/admin/customers/${item.id}`} className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f0d9a4] to-[#d8a641] text-sm font-semibold text-slate-900">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{item.fullName || "Unnamed customer"}</div>
            {item.additionalNames.length > 0 ? (
              <div className="truncate text-xs text-slate-500">Also known as {item.additionalNames[0]}</div>
            ) : null}
          </div>
        </Link>
      </td>
      <td className="px-5 py-4 text-sm text-slate-600 sm:px-6">{item.email || "-"}</td>
      <td className="px-5 py-4 text-sm text-slate-600 sm:px-6">{item.phone || "-"}</td>
      <td className="px-5 py-4 sm:px-6">
        <StatusBadge status={item.status} />
      </td>
      <td className="px-5 py-4 text-right sm:px-6">
        <Link
          href={`/admin/customers/${item.id}`}
          className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900"
        >
          Open
        </Link>
      </td>
    </tr>
  );
}

function StatCard(props: { label: string; value: string; tone?: "green" | "slate" }) {
  const toneClass = props.tone === "green" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{props.label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{props.value}</div>
    </div>
  );
}

function StatusBadge(props: { status: CustomerRecord["status"] }) {
  const isActive = props.status === "active";
  return (
    <span className={[
      "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
      isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600",
    ].join(" ")}>
      {isActive ? "Active" : props.status === "merged" ? "Merged" : "Inactive"}
    </span>
  );
}

function IconButton(props: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:text-slate-700"
    >
      {props.children}
    </button>
  );
}

function PagerButton(props: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {props.label}
    </button>
  );
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

function compareCustomers(a: CustomerListItem, b: CustomerListItem) {
  const aName = a.fullName.trim();
  const bName = b.fullName.trim();

  if (!aName && bName) return 1;
  if (aName && !bName) return -1;

  return aName.localeCompare(bName, undefined, { sensitivity: "base" });
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}
