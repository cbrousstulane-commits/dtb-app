"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc } from "firebase/firestore";

import AccessUserForm from "@/components/admin/AccessUserForm";
import { AccessUserRecord, accessUserDocPath, toAccessUserFormValues } from "@/lib/admin/accessUsers";
import { db } from "@/lib/firebase/client";

type AccessUserEditPageProps = {
  userId: string;
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

export default function AccessUserEditPage({ userId }: AccessUserEditPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Partial<AccessUserRecord> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const snap = await getDoc(doc(db, ...accessUserDocPath(userId)));

        if (!snap.exists()) {
          if (!cancelled) {
            setData(null);
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setData(snap.data() as Partial<AccessUserRecord>);
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError));
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
        Loading access user...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Failed to load access user: {error}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Access user not found</div>
        <Link
          href="/admin/users"
          className="mt-3 inline-flex h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 items-center"
        >
          Back to users
        </Link>
      </section>
    );
  }

  return (
    <AccessUserForm
      mode="edit"
      userId={userId}
      initialValues={toAccessUserFormValues(data)}
    />
  );
}