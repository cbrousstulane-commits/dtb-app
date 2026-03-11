"use client";

import Link from "next/link";
import React from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import {
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

      setStatusMessage("Saved.");
      router.refresh();
    } catch (error: unknown) {
      setStatusMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">{mode === "create" ? "New Customer" : "Edit Customer"}</div>
        <div className="mt-1 text-sm opacity-75">
          Customers are the admin-managed master record that later imports and day-of workflows will reference.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <Field
            label="Full name"
            value={form.fullName}
            placeholder="Taylor Landry"
            onChange={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
            disabled={saving}
          />

          <Field
            label="Email"
            value={form.email}
            placeholder="customer@example.com"
            inputMode="email"
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            disabled={saving}
          />

          <Field
            label="Phone"
            value={form.phone}
            placeholder="(504) 555-1234"
            inputMode="tel"
            onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))}
            disabled={saving}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">Source</div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm opacity-80">
              {existingRecord?.source ?? "manual"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="grid grid-cols-2 gap-2">
              <StatusButton
                active={form.status === "active"}
                label="Active"
                onClick={() => setForm((prev) => ({ ...prev, status: "active" }))}
                disabled={saving}
              />
              <StatusButton
                active={form.status === "inactive"}
                label="Inactive"
                onClick={() => setForm((prev) => ({ ...prev, status: "inactive" }))}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create customer" : "Save changes"}
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
      </form>
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
      <div className="text-sm font-medium">{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
      />
    </label>
  );
}

function StatusButton(props: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "h-12 rounded-xl border text-sm font-medium",
        props.active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 active:bg-white/10",
        props.disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}