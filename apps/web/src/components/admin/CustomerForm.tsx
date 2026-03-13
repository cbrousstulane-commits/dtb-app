"use client";

import Link from "next/link";
import React from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import {
  clearCustomersCache,
  customerDocPath,
  customersCollectionPath,
  CustomerFormValues,
  CustomerRecord,
  emptyCustomerForm,
  normalizeCustomerPayload,
  toCustomerFormValues,
} from "@/lib/admin/customers";

type CustomerFormProps = {
  mode: "create" | "edit";
  customerId?: string;
  initialValues?: Partial<CustomerFormValues> | Partial<CustomerRecord> | null;
  existingRecord?: Partial<CustomerRecord> | null;
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

export default function CustomerForm({ mode, customerId, initialValues, existingRecord }: CustomerFormProps) {
  const router = useRouter();

  const initialForm = React.useMemo(
    () => toCustomerFormValues(initialValues ?? emptyCustomerForm()),
    [initialValues],
  );

  const [form, setForm] = React.useState<CustomerFormValues>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(toCustomerFormValues(initialValues ?? emptyCustomerForm()));
  }, [initialValues]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      if (!form.fullName.trim()) {
        throw new Error("Customer full name is required.");
      }

      const payload = normalizeCustomerPayload(form, existingRecord);

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...customersCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        clearCustomersCache();
        router.replace(`/admin/customers/${ref.id}`);
        router.refresh();
        return;
      }

      if (!customerId) {
        throw new Error("Missing customer ID for edit mode.");
      }

      await setDoc(
        doc(db, ...customerDocPath(customerId)),
        {
          ...payload,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      clearCustomersCache();
      setStatusMessage("Saved.");
      router.refresh();
    } catch (error: unknown) {
      setStatusMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-2 lg:py-8">
      <div className="fixed inset-0 hidden bg-slate-950/25 backdrop-blur-[2px] lg:block" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-slate-200/80">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-7">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-slate-900">Customers</div>
            <div className="mt-2 text-sm text-slate-500">{mode === "create" ? "Add a new customer record." : "Update the customer master record."}</div>
          </div>
          <Link
            href="/admin/customers"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-slate-300 hover:text-slate-800"
            aria-label="Close customer form"
          >
            <CloseIcon />
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 px-6 py-6 sm:px-7 sm:py-7">
          <section className="space-y-4">
            <div className="text-sm font-semibold text-slate-900">General</div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <AvatarIcon />
              </div>
              <div className="inline-flex h-11 items-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm">
                Profile placeholder
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Full Name"
                value={form.fullName}
                placeholder="Taylor Landry"
                onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                disabled={saving}
              />
              <StatusSelect value={form.status} onChange={(value) => setForm((prev) => ({ ...prev, status: value }))} disabled={saving} />
            </div>
          </section>

          <section className="space-y-4">
            <div className="text-sm font-semibold text-slate-900">Contact</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Phone Number"
                value={form.phone}
                placeholder="(504) 555-1234"
                inputMode="tel"
                onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
                disabled={saving}
              />
              <Field
                label="Email Address"
                value={form.email}
                placeholder="customer@example.com"
                inputMode="email"
                onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
                disabled={saving}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div className="text-sm font-semibold text-slate-900">Record Details</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Source" value={existingRecord?.source ?? "manual"} />
              <ReadOnlyField
                label="Match Status"
                value={existingRecord?.customerMatchStatus ?? "unresolved"}
              />
            </div>
            {existingRecord?.additionalNames && existingRecord.additionalNames.length > 0 ? (
              <ReadOnlyField label="Additional Names" value={existingRecord.additionalNames.join(", ")} />
            ) : null}
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/admin/customers"
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Add Customer" : "Save Customer"}
            </button>
          </div>

          {statusMessage ? <div className="text-sm text-slate-500">{statusMessage}</div> : null}
        </form>
      </div>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium text-slate-700">{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-300 disabled:opacity-60"
      />
    </label>
  );
}

function ReadOnlyField(props: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{props.label}</div>
      <div className="min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
        {props.value}
      </div>
    </div>
  );
}

function StatusSelect(props: {
  value: CustomerFormValues["status"];
  disabled?: boolean;
  onChange: (value: CustomerFormValues["status"]) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium text-slate-700">Status</div>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value === "inactive" ? "inactive" : "active")}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-300 disabled:opacity-60"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </label>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

function AvatarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-8 w-8">
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 7a6 6 0 0 1 12 0" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
