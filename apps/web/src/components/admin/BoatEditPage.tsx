"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc } from "firebase/firestore";

import BoatForm from "@/components/admin/BoatForm";
import { db } from "@/lib/firebase/client";
import { boatDocPath, BoatRecord, toBoatFormValues } from "@/lib/admin/boats";

type BoatEditPageProps = {
  boatId: string;
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

export default function BoatEditPage({ boatId }: BoatEditPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Partial<BoatRecord> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const snap = await getDoc(doc(db, ...boatDocPath(boatId)));

        if (cancelled) return;

        if (!snap.exists()) {
          setNotFound(true);
          setData(null);
          return;
        }

        setData(snap.data() as Partial<BoatRecord>);
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
  }, [boatId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
        Loading boat...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Failed to load boat: {error}
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="text-lg font-semibold">Boat not found</div>
        <Link
          href="/admin/boats"
          className="inline-flex h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 items-center"
        >
          Back to boats
        </Link>
      </section>
    );
  }

  return <BoatForm mode="edit" boatId={boatId} initialValues={toBoatFormValues(data)} />;
}

