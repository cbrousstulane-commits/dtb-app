"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc } from "firebase/firestore";

import BoatTripTypeRateForm from "@/components/admin/BoatTripTypeRateForm";
import { db } from "@/lib/firebase/client";
import { boatTripTypeRateDocPath, BoatTripTypeRateRecord, toBoatTripTypeRateFormValues } from "@/lib/admin/boatTripTypeRates";

type BoatTripTypeRateEditPageProps = {
  rateId: string;
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

export default function BoatTripTypeRateEditPage({ rateId }: BoatTripTypeRateEditPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Partial<BoatTripTypeRateRecord> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const snap = await getDoc(doc(db, ...boatTripTypeRateDocPath(rateId)));

        if (cancelled) return;

        if (!snap.exists()) {
          setNotFound(true);
          setData(null);
          return;
        }

        setData(snap.data() as Partial<BoatTripTypeRateRecord>);
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
  }, [rateId]);

  if (loading) {
    return <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">Loading boat rate...</section>;
  }

  if (error) {
    return <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">Failed to load boat rate: {error}</section>;
  }

  if (notFound) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="text-lg font-semibold">Boat rate not found</div>
        <Link href="/admin/boat-rates" className="inline-flex h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 items-center">
          Back to boat rates
        </Link>
      </section>
    );
  }

  return <BoatTripTypeRateForm mode="edit" rateId={rateId} initialValues={toBoatTripTypeRateFormValues(data)} />;
}
