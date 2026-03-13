"use client";

import Link from "next/link";
import React from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import {
  emptyFishSpeciesForm,
  emptySubspeciesRow,
  FishSpeciesFormValues,
  FishSpeciesRecord,
  fishSpeciesCollectionPath,
  fishSpeciesDocPath,
  normalizeFishSpeciesPayload,
  slugifyFishSpecies,
  toFishSpeciesFormValues,
} from "@/lib/admin/fishSpecies";

type FishSpeciesFormProps = {
  mode: "create" | "edit";
  speciesId?: string;
  initialValues?: Partial<FishSpeciesFormValues> | Partial<FishSpeciesRecord> | null;
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

export default function FishSpeciesForm({ mode, speciesId, initialValues }: FishSpeciesFormProps) {
  const router = useRouter();
  const initialForm = React.useMemo(() => toFishSpeciesFormValues(initialValues ?? emptyFishSpeciesForm()), [initialValues]);

  const [form, setForm] = React.useState<FishSpeciesFormValues>(initialForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(Boolean(initialForm.slug));
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next = toFishSpeciesFormValues(initialValues ?? emptyFishSpeciesForm());
    setForm(next);
    setSlugManuallyEdited(Boolean(next.slug));
  }, [initialValues]);

  function updateName(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugManuallyEdited ? prev.slug : slugifyFishSpecies(value),
    }));
  }

  function updateSlug(value: string) {
    setSlugManuallyEdited(true);
    setForm((prev) => ({ ...prev, slug: slugifyFishSpecies(value) }));
  }

  function updateSubspecies(id: string, patch: Partial<FishSpeciesFormValues["subspecies"][number]>) {
    setForm((prev) => ({
      ...prev,
      subspecies: prev.subspecies.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    }));
  }

  function addSubspeciesRow() {
    setForm((prev) => ({ ...prev, subspecies: [...prev.subspecies, emptySubspeciesRow()] }));
  }

  function removeSubspeciesRow(id: string) {
    setForm((prev) => ({
      ...prev,
      subspecies: prev.subspecies.filter((row) => row.id !== id),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      if (!form.name.trim()) {
        throw new Error("Species name is required.");
      }

      const payload = normalizeFishSpeciesPayload(form);
      if (!payload.slug) {
        throw new Error("Slug could not be generated. Add a valid species name or slug.");
      }

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...fishSpeciesCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        router.replace(`/admin/fish-species/${ref.id}`);
        router.refresh();
        return;
      }

      if (!speciesId) {
        throw new Error("Missing species ID for edit mode.");
      }

      await setDoc(
        doc(db, ...fishSpeciesDocPath(speciesId)),
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
        <div className="text-lg font-semibold">{mode === "create" ? "New Fish Species" : "Edit Fish Species"}</div>
        <div className="mt-1 text-sm opacity-75">
          Define the top-level species and maintain the subspecies rows captains will use in daily catch reporting.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <Field label="Species name" value={form.name} placeholder="Redfish" onChange={updateName} disabled={saving} />
          <Field label="Slug" value={form.slug} placeholder="redfish" onChange={updateSlug} disabled={saving} />

          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="grid grid-cols-2 gap-2">
              <StatusButton active={form.status === "active"} label="Active" onClick={() => setForm((prev) => ({ ...prev, status: "active" }))} disabled={saving} />
              <StatusButton active={form.status === "inactive"} label="Inactive" onClick={() => setForm((prev) => ({ ...prev, status: "inactive" }))} disabled={saving} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Subspecies</div>
              <div className="mt-1 text-sm opacity-75">Add the subspecies rows captains can choose under this species.</div>
            </div>
            <button type="button" onClick={addSubspeciesRow} disabled={saving} className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium active:bg-white/10 disabled:opacity-60">
              Add row
            </button>
          </div>

          <div className="space-y-3">
            {form.subspecies.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm opacity-70">No subspecies rows yet.</div>
            ) : (
              form.subspecies.map((row) => (
                <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_auto] md:items-center md:gap-3 space-y-3 md:space-y-0">
                  <Field label="Subspecies name" value={row.name} placeholder="Bull Red" onChange={(value) => updateSubspecies(row.id, { name: value })} disabled={saving} compact />
                  <div className="space-y-2 md:space-y-0">
                    <div className="text-sm font-medium md:hidden">Status</div>
                    <select value={row.status} disabled={saving} onChange={(event) => updateSubspecies(row.id, { status: event.target.value === "inactive" ? "inactive" : "active" })} className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => removeSubspeciesRow(row.id)} disabled={saving} className="h-12 rounded-xl border border-white/10 bg-white/5 px-3 text-sm active:bg-white/10 disabled:opacity-60">
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60">
              {saving ? "Saving..." : mode === "create" ? "Create species" : "Save changes"}
            </button>
            <Link href="/admin/fish-species" className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center">
              Back to fish species
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
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium">{props.label}</div>
      <input value={props.value} placeholder={props.placeholder} disabled={props.disabled} onChange={(event) => props.onChange(event.target.value)} className={`w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60 ${props.compact ? "h-12" : "h-12"}`} />
    </label>
  );
}

function StatusButton(props: { active: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={props.onClick} disabled={props.disabled} className={["h-12 rounded-xl border text-sm font-medium", props.active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 active:bg-white/10", props.disabled ? "opacity-60" : ""].join(" ")}>
      {props.label}
    </button>
  );
}
