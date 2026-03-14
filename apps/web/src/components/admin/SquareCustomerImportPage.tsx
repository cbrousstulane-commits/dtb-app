"use client";

import Link from "next/link";
import React from "react";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import {
  appendAdditionalEmail,
  appendAdditionalName,
  appendAdditionalPhone,
  clearCustomersCache,
  CustomerListItem,
  CustomerRecord,
  customersCollectionPath,
  hydrateCustomerRecord,
  normalizeAdditionalEmails,
  normalizeAdditionalNames,
  normalizeAdditionalPhones,
} from "@/lib/admin/customers";
import {
  buildSquarePreviewRows,
  emptySquareCustomerImportRun,
  parseSquareCustomerCsv,
  squareCustomerImportRowsCollectionPath,
  squareCustomerImportRunsCollectionPath,
  SquareCustomerPreviewRow,
} from "@/lib/admin/squareCustomers";
import { db } from "@/lib/firebase/client";

type ExistingCustomer = CustomerListItem;

type PreviewCounts = {
  matched: number;
  created: number;
  review: number;
  skipped: number;
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

function summarize(rows: SquareCustomerPreviewRow[]): PreviewCounts {
  return rows.reduce(
    (acc, row) => {
      if (row.rowStatus === "matched") acc.matched += 1;
      else if (row.rowStatus === "created") acc.created += 1;
      else if (row.rowStatus === "review") acc.review += 1;
      else acc.skipped += 1;
      return acc;
    },
    { matched: 0, created: 0, review: 0, skipped: 0 },
  );
}

async function sha256(text: string) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function loadCustomers(): Promise<ExistingCustomer[]> {
  const snapshot = await getDocs(collection(db, ...customersCollectionPath));
  return snapshot.docs.map((docSnap) => hydrateCustomerRecord(docSnap.id, docSnap.data() as Partial<CustomerRecord>));
}

export default function SquareCustomerImportPage() {
  const [loadingCustomers, setLoadingCustomers] = React.useState(true);
  const [customers, setCustomers] = React.useState<ExistingCustomer[]>([]);
  const [selectedFileName, setSelectedFileName] = React.useState("");
  const [rawCsv, setRawCsv] = React.useState("");
  const [previewRows, setPreviewRows] = React.useState<SquareCustomerPreviewRow[]>([]);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await loadCustomers();
        if (!cancelled) {
          setCustomers(next);
          setLoadingCustomers(false);
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(`Failed to load customers: ${errorMessage(error)}`);
          setLoadingCustomers(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = React.useMemo(() => summarize(previewRows), [previewRows]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMessage(null);
    setSelectedFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseSquareCustomerCsv(text);
      const nextPreview = buildSquarePreviewRows(parsed, customers);
      setRawCsv(text);
      setPreviewRows(nextPreview);
      setStatusMessage(`Loaded ${nextPreview.length} Square customer rows.`);
    } catch (error) {
      setRawCsv("");
      setPreviewRows([]);
      setStatusMessage(`Failed to parse CSV: ${errorMessage(error)}`);
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }

  async function handleApplyImport() {
    if (!rawCsv || previewRows.length === 0) {
      setStatusMessage("Load a Square CSV file first.");
      return;
    }

    setApplying(true);
    setStatusMessage(null);

    try {
      const fileChecksum = await sha256(rawCsv);
      const importRunRef = doc(collection(db, ...squareCustomerImportRunsCollectionPath));
      const completedAt = new Date().toISOString();
      const runPayload = {
        ...emptySquareCustomerImportRun(),
        sourceFileName: selectedFileName,
        sourceFileChecksum: fileChecksum,
        status: "completed" as const,
        rowCount: previewRows.length,
        matchedCount: counts.matched,
        createdCount: counts.created,
        reviewCount: counts.review,
        skippedCount: counts.skipped,
        failedCount: 0,
        notes: "Imported from admin customer tab.",
        startedAt: serverTimestamp(),
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const instructions: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge?: boolean }> = [
        { ref: importRunRef, data: runPayload },
      ];

      const customersById = new Map(customers.map((customer) => [customer.id, customer]));

      for (const preview of previewRows) {
        const rowRef = doc(collection(db, ...squareCustomerImportRowsCollectionPath));
        instructions.push({
          ref: rowRef,
          data: {
            source: "square-csv",
            importRunId: importRunRef.id,
            sourceRowNumber: preview.sourceRowNumber,
            squareCustomerId: preview.squareCustomerId,
            givenName: preview.rawRow.firstName,
            familyName: preview.rawRow.lastName,
            companyName: preview.rawRow.companyName,
            fullName: preview.fullName,
            email: preview.email,
            phone: preview.phone,
            rawImportReference: JSON.stringify(preview.rawRow),
            matchStatus: preview.matchStatus,
            rowStatus: preview.rowStatus,
            matchedCustomerId: preview.matchedCustomerId,
            reviewReason: preview.reviewReason,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });

        if (preview.rowStatus === "matched" && preview.matchedCustomerId) {
          const existing = customersById.get(preview.matchedCustomerId);
          if (!existing) continue;

          const updatedAdditionalNames = preview.additionalNames.reduce(
            (names, name) => appendAdditionalName(names, name),
            normalizeAdditionalNames(existing.additionalNames),
          );
          const updatedAdditionalEmails = preview.email && preview.email !== existing.email
            ? appendAdditionalEmail(normalizeAdditionalEmails(existing.additionalEmails), preview.email)
            : normalizeAdditionalEmails(existing.additionalEmails);
          const updatedAdditionalPhones = preview.phone && preview.phone !== existing.phone
            ? appendAdditionalPhone(normalizeAdditionalPhones(existing.additionalPhones), preview.phone)
            : normalizeAdditionalPhones(existing.additionalPhones);

          instructions.push({
            ref: doc(db, ...customersCollectionPath, preview.matchedCustomerId),
            data: {
              fullName: existing.fullName || preview.fullName,
              fullNameLower: (existing.fullName || preview.fullName).toLowerCase(),
              additionalNames: updatedAdditionalNames,
              email: existing.email || preview.email,
              additionalEmails: updatedAdditionalEmails,
              phone: existing.phone || preview.phone,
              additionalPhones: updatedAdditionalPhones,
              source: existing.source === "manual" ? "square-import" : existing.source,
              squareCustomerId: existing.squareCustomerId || preview.squareCustomerId,
              customerMatchStatus: "matched",
              squareImportLastRunId: importRunRef.id,
              squareImportUpdatedAt: completedAt,
              updatedAt: serverTimestamp(),
            },
            merge: true,
          });
          continue;
        }

        if (preview.rowStatus === "created") {
          const customerRef = doc(collection(db, ...customersCollectionPath));
          instructions.push({
            ref: customerRef,
            data: {
              fullName: preview.fullName,
              fullNameLower: preview.fullName.toLowerCase(),
              additionalNames: preview.additionalNames,
              email: preview.email,
              additionalEmails: [],
              phone: preview.phone,
              additionalPhones: [],
              source: "square-import",
              squareCustomerId: preview.squareCustomerId,
              websiteCustomerId: "",
              customerMatchStatus: "new",
              squareImportLastRunId: importRunRef.id,
              squareImportUpdatedAt: completedAt,
              status: "active",
              mergedIntoCustomerId: "",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
          });
        }
      }

      const chunkSize = 350;
      for (let index = 0; index < instructions.length; index += chunkSize) {
        const batch = writeBatch(db);
        const chunk = instructions.slice(index, index + chunkSize);

        for (const instruction of chunk) {
          if (instruction.merge) {
            batch.set(instruction.ref, instruction.data, { merge: true });
          } else {
            batch.set(instruction.ref, instruction.data);
          }
        }

        await batch.commit();
      }

      clearCustomersCache();
      setStatusMessage(`Square import applied. Matched ${counts.matched}, created ${counts.created}, review ${counts.review}, skipped ${counts.skipped}.`);
      const nextCustomers = await loadCustomers();
      setCustomers(nextCustomers);
    } catch (error) {
      setStatusMessage(`Import failed: ${errorMessage(error)}`);
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Import Square Customers</div>
        <div className="mt-1 text-sm opacity-75">
          Upload the Square customer CSV from the customers tab. Matching email or phone auto-reconciles. Last-name-only similarity goes to review.
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        <label className="block space-y-2">
          <div className="text-sm font-medium">Square CSV file</div>
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={processing || applying || loadingCustomers} />
        </label>

        <div className="text-sm opacity-75">
          {loadingCustomers
            ? "Loading current customers..."
            : selectedFileName
              ? `Selected file: ${selectedFileName}`
              : "Choose a Square customer export CSV to preview."}
        </div>

        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="Matched" value={String(counts.matched)} />
          <SummaryCard label="New" value={String(counts.created)} />
          <SummaryCard label="Review" value={String(counts.review)} />
          <SummaryCard label="Skipped" value={String(counts.skipped)} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={applying || processing || loadingCustomers || previewRows.length === 0}
            className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
          >
            {applying ? "Applying..." : "Apply import"}
          </button>

          <Link
            href="/admin/customers"
            className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
          >
            Back to customers
          </Link>
        </div>

        {statusMessage ? <div className="mt-3 text-sm opacity-80">{statusMessage}</div> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Preview</div>
        <div className="mt-3 space-y-3">
          {previewRows.length === 0 ? (
            <div className="text-sm opacity-70">No preview rows yet.</div>
          ) : (
            previewRows.slice(0, 50).map((row) => <PreviewRow key={`${row.squareCustomerId}-${row.sourceRowNumber}`} row={row} />)
          )}
        </div>
        {previewRows.length > 50 ? (
          <div className="mt-3 text-xs opacity-60">Showing first 50 rows of {previewRows.length}.</div>
        ) : null}
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

function PreviewRow(props: { row: SquareCustomerPreviewRow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold truncate">{props.row.fullName || "Unnamed customer"}</div>
          <div className="mt-1 text-xs opacity-70 truncate">{props.row.email || props.row.phone || "No email or phone"}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Pill label={props.row.rowStatus} />
            <Pill label={`match: ${props.row.matchStatus}`} />
            {props.row.squareCustomerId ? <Pill label={props.row.squareCustomerId} /> : null}
            {props.row.additionalNames.length > 0 ? <Pill label={`aliases: ${props.row.additionalNames.length}`} /> : null}
          </div>
          {props.row.reviewReason ? <div className="mt-2 text-xs text-amber-300">{props.row.reviewReason}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Pill(props: { label: string }) {
  return <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">{props.label}</span>;
}