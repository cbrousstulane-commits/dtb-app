"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc } from "firebase/firestore";

import LodgeRoomForm from "@/components/admin/LodgeRoomForm";
import { db } from "@/lib/firebase/client";
import { lodgeRoomDocPath, LodgeRoomRecord, toLodgeRoomFormValues } from "@/lib/admin/lodgeRooms";

type LodgeRoomEditPageProps = {
  roomId: string;
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

export default function LodgeRoomEditPage({ roomId }: LodgeRoomEditPageProps) {
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Partial<LodgeRoomRecord> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const snap = await getDoc(doc(db, ...lodgeRoomDocPath(roomId)));

        if (cancelled) return;

        if (!snap.exists()) {
          setNotFound(true);
          setData(null);
          return;
        }

        setData(snap.data() as Partial<LodgeRoomRecord>);
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
  }, [roomId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
        Loading lodge room...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
        Failed to load lodge room: {error}
      </section>
    );
  }

  if (notFound) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="text-lg font-semibold">Lodge room not found</div>
        <Link
          href="/admin/lodge-rooms"
          className="inline-flex h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 items-center"
        >
          Back to lodge rooms
        </Link>
      </section>
    );
  }

  return <LodgeRoomForm mode="edit" roomId={roomId} initialValues={toLodgeRoomFormValues(data)} />;
}