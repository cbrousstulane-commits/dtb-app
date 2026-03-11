"use client";

import Link from "next/link";
import React from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import {
  emptyLodgeRoomForm,
  lodgeRoomDocPath,
  lodgeRoomsCollectionPath,
  LODGE_ROOM_LIMIT,
  LodgeRoomFormValues,
  LodgeRoomRecord,
  normalizeLodgeRoomPayload,
  slugifyLodgeRoom,
  toLodgeRoomFormValues,
} from "@/lib/admin/lodgeRooms";

type LodgeRoomFormProps = {
  mode: "create" | "edit";
  roomId?: string;
  initialValues?: Partial<LodgeRoomFormValues> | Partial<LodgeRoomRecord> | null;
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

export default function LodgeRoomForm({ mode, roomId, initialValues }: LodgeRoomFormProps) {
  const router = useRouter();

  const initialForm = React.useMemo(
    () => toLodgeRoomFormValues(initialValues ?? emptyLodgeRoomForm()),
    [initialValues],
  );

  const [form, setForm] = React.useState<LodgeRoomFormValues>(initialForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(Boolean(initialForm.slug));
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [roomCount, setRoomCount] = React.useState<number | null>(null);

  React.useEffect(() => {
    const next = toLodgeRoomFormValues(initialValues ?? emptyLodgeRoomForm());
    setForm(next);
    setSlugManuallyEdited(Boolean(next.slug));
  }, [initialValues]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadRoomCount() {
      try {
        const snapshot = await getDocs(query(collection(db, ...lodgeRoomsCollectionPath)));
        if (!cancelled) {
          setRoomCount(snapshot.size);
        }
      } catch {
        if (!cancelled) {
          setRoomCount(null);
        }
      }
    }

    void loadRoomCount();
    return () => {
      cancelled = true;
    };
  }, []);

  const roomLimitReached = mode === "create" && roomCount !== null && roomCount >= LODGE_ROOM_LIMIT;

  function updateName(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugManuallyEdited ? prev.slug : slugifyLodgeRoom(value),
    }));
  }

  function updateSlug(value: string) {
    setSlugManuallyEdited(true);
    setForm((prev) => ({
      ...prev,
      slug: slugifyLodgeRoom(value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      if (!form.name.trim()) {
        throw new Error("Room name is required.");
      }

      if (roomLimitReached) {
        throw new Error(`All ${LODGE_ROOM_LIMIT} lodge room records already exist.`);
      }

      const payload = normalizeLodgeRoomPayload(form);

      if (!payload.slug) {
        throw new Error("Slug could not be generated. Add a valid name or slug.");
      }

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...lodgeRoomsCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        router.replace(`/admin/lodge-rooms/${ref.id}`);
        router.refresh();
        return;
      }

      if (!roomId) {
        throw new Error("Missing room ID for edit mode.");
      }

      await setDoc(
        doc(db, ...lodgeRoomDocPath(roomId)),
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
        <div className="text-lg font-semibold">{mode === "create" ? "New Lodge Room" : "Edit Lodge Room"}</div>
        <div className="mt-1 text-sm opacity-75">
          Lodge rooms are individual nightly units. The system should never exceed {LODGE_ROOM_LIMIT} total room records.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <Field
            label="Room name"
            value={form.name}
            placeholder="Room 1"
            onChange={updateName}
            disabled={saving}
          />

          <Field
            label="Slug"
            value={form.slug}
            placeholder="room-1"
            onChange={updateSlug}
            disabled={saving}
          />

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

          {mode === "create" ? (
            <div className="text-xs opacity-70">
              {roomCount === null
                ? `Checking how many of the ${LODGE_ROOM_LIMIT} room slots are already in use...`
                : roomLimitReached
                  ? `All ${LODGE_ROOM_LIMIT} room records already exist. Edit one of those rooms instead of creating another.`
                  : `${LODGE_ROOM_LIMIT - roomCount} room slots remain available.`}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || roomLimitReached}
              className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create room" : "Save changes"}
            </button>

            <Link
              href="/admin/lodge-rooms"
              className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
            >
              Back to lodge rooms
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
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium">{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
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