"use client";

import Link from "next/link";
import React from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import {
  captainDocPath,
  captainsCollectionPath,
  CaptainFormValues,
  CaptainRecord,
  emptyCaptainForm,
  normalizeCaptainPayload,
  slugify,
  toCaptainFormValues,
} from "@/lib/admin/captains";

type CaptainFormProps = {
  mode: "create" | "edit";
  captainId?: string;
  initialValues?: Partial<CaptainFormValues> | Partial<CaptainRecord> | null;
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

export default function CaptainForm({
  mode,
  captainId,
  initialValues,
}: CaptainFormProps) {
  const router = useRouter();

  const initialForm = React.useMemo(
    () => toCaptainFormValues(initialValues ?? emptyCaptainForm()),
    [initialValues],
  );

  const [form, setForm] = React.useState<CaptainFormValues>(initialForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(
    Boolean(initialForm.slug),
  );
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const next = toCaptainFormValues(initialValues ?? emptyCaptainForm());
    setForm(next);
    setSlugManuallyEdited(Boolean(next.slug));
  }, [initialValues]);

  function updateName(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugManuallyEdited ? prev.slug : slugify(value),
    }));
  }

  function updateSlug(value: string) {
    setSlugManuallyEdited(true);
    setForm((prev) => ({
      ...prev,
      slug: slugify(value),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      if (!form.name.trim()) {
        throw new Error("Captain name is required.");
      }

      const payload = normalizeCaptainPayload(form);

      if (!payload.slug) {
        throw new Error("Slug could not be generated. Add a valid name or slug.");
      }

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...captainsCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        router.replace(`/admin/captains/${ref.id}`);
        router.refresh();
        return;
      }

      if (!captainId) {
        throw new Error("Missing captain ID for edit mode.");
      }

      await setDoc(
        doc(db, ...captainDocPath(captainId)),
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
        <div className="text-lg font-semibold">
          {mode === "create" ? "New Captain" : "Edit Captain"}
        </div>
        <div className="mt-1 text-sm opacity-75">
          Captains are a first-class entity and will later support their own login/access mapping.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <Field
            label="Captain name"
            value={form.name}
            placeholder="Taylor Landry"
            onChange={updateName}
            disabled={saving}
          />

          <Field
            label="Slug"
            value={form.slug}
            placeholder="taylor-landry"
            onChange={updateSlug}
            disabled={saving}
          />

          <Field
            label="Email"
            value={form.email}
            placeholder="captain@example.com"
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            disabled={saving}
          />

          <Field
            label="Auth UID"
            value={form.authUid}
            placeholder="Leave blank until auth is linked"
            onChange={(value) => setForm((prev) => ({ ...prev, authUid: value }))}
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

          <TextAreaField
            label="Notes"
            value={form.notes}
            placeholder="Optional operations or access notes"
            onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
            disabled={saving}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create captain" : "Save changes"}
            </button>

            <Link
              href="/admin/captains"
              className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
            >
              Back to captains
            </Link>
          </div>

          {statusMessage ? (
            <div className="mt-3 text-sm opacity-80">{statusMessage}</div>
          ) : null}
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

function TextAreaField(props: {
  label: string;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium">{props.label}</div>
      <textarea
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        rows={5}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
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
        props.active
          ? "border-white/25 bg-white/10"
          : "border-white/10 bg-white/5 active:bg-white/10",
        props.disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}