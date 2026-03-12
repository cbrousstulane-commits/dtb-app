"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc } from "firebase/firestore";

import CustomerForm from "@/components/admin/CustomerForm";
import { db } from "@/lib/firebase/client";
import { customerDocPath, CustomerRecord, toCustomerFormValues } from "@/lib/admin/customers";

type CustomerEditPageProps = {
  customerId: string;
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

export default function CustomerEditPage({ customerId }: CustomerEditPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Partial<CustomerRecord> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const snap = await getDoc(doc(db, ...customerDocPath(customerId)));

        if (cancelled) return;

        if (!snap.exists()) {
          setNotFound(true);
          setData(null);
          return;
        }

        setData(snap.data() as Partial<CustomerRecord>);
      } catch (loadError: unknown) {
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
  }, [customerId]);

  if (loading) {
    return (
      <section className="rounded-[32px] bg-[#f8fafc] px-6 py-16 text-center text-sm text-slate-500 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        Loading customer...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[32px] bg-[#f8fafc] px-6 py-16 text-center text-sm text-red-600 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        Failed to load customer: {error}
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="rounded-[32px] bg-[#f8fafc] px-6 py-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
        <div className="text-2xl font-semibold text-slate-900">Customer not found</div>
        <div className="mt-2 text-sm text-slate-500">That record does not exist or is no longer available.</div>
        <Link
          href="/admin/customers"
          className="mt-6 inline-flex h-12 items-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-400 hover:text-slate-900"
        >
          Back to customers
        </Link>
      </section>
    );
  }

  return (
    <CustomerForm
      mode="edit"
      customerId={customerId}
      initialValues={toCustomerFormValues(data)}
      existingRecord={data}
    />
  );
}
