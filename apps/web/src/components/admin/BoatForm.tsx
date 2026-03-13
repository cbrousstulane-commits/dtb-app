"use client";

import Link from "next/link";
import React from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import { CaptainRecord, captainsCollectionPath } from "@/lib/admin/captains";
import {
  boatDocPath,
  boatsCollectionPath,
  BoatFormValues,
  BoatRecord,
  CaptainOption,
  emptyBoatForm,
  normalizeBoatPayload,
  slugifyBoat,
  toBoatFormValues,
} from "@/lib/admin/boats";

type BoatFormProps = {
  mode: "create" | "edit";
  boatId?: string;
  initialValues?: Partial<BoatFormValues> | Partial<BoatRecord> | null;
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

async function loadCaptains() {
  const snapshot = await getDocs(query(collection(db, ...captainsCollectionPath), orderBy("name")));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<CaptainRecord>;

    return {
      id: docSnap.id,
      name: data.name ?? "",
      status: data.status === "inactive" ? "inactive" : "active",
    } satisfies CaptainOption;
  });
}

export default function BoatForm({ mode, boatId, initialValues }: BoatFormProps) {
  const router = useRouter();

  const initialForm = React.useMemo(
    () => toBoatFormValues(initialValues ?? emptyBoatForm()),
    [initialValues],
  );

  const [form, setForm] = React.useState<BoatFormValues>(initialForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(Boolean(initialForm.slug));
  const [captainsLoading, setCaptainsLoading] = React.useState(true);
  const [captainsError, setCaptainsError] = React.useState<string | null>(null);
  const [captains, setCaptains] = React.useState<CaptainOption[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next = toBoatFormValues(initialValues ?? emptyBoatForm());
    setForm(next);
    setSlugManuallyEdited(Boolean(next.slug));
  }, [initialValues]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await loadCaptains();
        if (cancelled) return;
        setCaptains(next);
        setCaptainsError(null);
      } catch (loadError) {
        if (!cancelled) {
          setCaptainsError(errorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setCaptainsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const availableCaptains = React.useMemo(() => {
    return captains.filter((captain) => {
      if (captain.status === "active") return true;
      return captain.id === form.primaryCaptainId;
    });
  }, [captains, form.primaryCaptainId]);

  function updateName(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugManuallyEdited ? prev.slug : slugifyBoat(value),
    }));
  }

  function updateSlug(value: string) {
    setSlugManuallyEdited(true);
    setForm((prev) => ({
      ...prev,
      slug: slugifyBoat(value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      if (!form.name.trim()) {
        throw new Error("Boat name is required.");
      }

      const payload = normalizeBoatPayload(form, captains);

      if (!payload.slug) {
        throw new Error("Slug could not be generated. Add a valid name or slug.");
      }

      if (!payload.primaryCaptainId) {
        throw new Error("Select a primary captain.");
      }

      if (!payload.primaryCaptainNameSnapshot) {
        throw new Error("The selected primary captain could not be resolved.");
      }

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...boatsCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        router.replace(`/admin/boats/${ref.id}`);
        router.refresh();
        return;
      }

      if (!boatId) {
        throw new Error("Missing boat ID for edit mode.");
      }

      await setDoc(
        doc(db, ...boatDocPath(boatId)),
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
        <div className="text-lg font-semibold">{mode === "create" ? "New Boat" : "Edit Boat"}</div>
        <div className="mt-1 text-sm opacity-75">
          Boats are first-class assets. Each boat keeps a default primary captain for later operational defaults.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <Field
            label="Boat name"
            value={form.name}
            placeholder="Bayou Runner"
            onChange={updateName}
            disabled={saving}
          />

          <Field
            label="Slug"
            value={form.slug}
            placeholder="bayou-runner"
            onChange={updateSlug}
            disabled={saving}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">Primary captain</div>
            <select
              value={form.primaryCaptainId}
              disabled={saving || captainsLoading}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  primaryCaptainId: event.target.value,
                }))
              }
              className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
            >
              <option value="">Select a captain</option>
              {availableCaptains.map((captain) => (
                <option key={captain.id} value={captain.id}>
                  {captain.name || "Unnamed captain"}
                  {captain.status === "inactive" ? " (inactive)" : ""}
                </option>
              ))}
            </select>
            <div className="text-xs opacity-70">
              {captainsLoading
                ? "Loading captains..."
                : captainsError
                  ? `Failed to load captains: ${captainsError}`
                  : "Choose the captain that should prefill by default for this boat."}
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
              disabled={saving || captainsLoading}
              className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create boat" : "Save changes"}
            </button>

            <Link
              href="/admin/boats"
              className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
            >
              Back to boats
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
