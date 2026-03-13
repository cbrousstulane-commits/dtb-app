"use client";

import Link from "next/link";
import React from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

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
import { db } from "@/lib/firebase/client";

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
  const [slugManuallyEdited, setSlugManuallyEdited] = React.useState(Boolean(initialForm.slug));
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
          Active captains can receive site access through their Google email. Turn on admin access only for captains who should open the admin panel.
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
            label="Google email"
            value={form.email}
            placeholder="captain@example.com"
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
            disabled={saving}
          />

          <Field
            label="Auth UID"
            value={form.authUid}
            placeholder="Auto-linked after first sign-in"
            onChange={(value) => setForm((prev) => ({ ...prev, authUid: value }))}
            disabled={saving}
          />

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 space-y-3">
            <div>
              <div className="text-sm font-medium">Access</div>
              <div className="mt-1 text-sm opacity-75">
                Any active captain with a matching Google email can sign in. Admin access adds the admin claim on next sign-in or token refresh.
              </div>
            </div>

            <ToggleRow
              label="Admin access"
              description="Allow this captain to open /admin in addition to the captain/user access area."
              checked={form.adminAccess}
              disabled={saving}
              onChange={(checked) => setForm((prev) => ({ ...prev, adminAccess: checked }))}
            />
          </div>

          <StatusField
            value={form.status}
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
          />

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

function ToggleRow(props: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onChange(!props.checked)}
      disabled={props.disabled}
      className="w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left disabled:opacity-60"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{props.label}</div>
          <div className="mt-1 text-xs opacity-70">{props.description}</div>
        </div>
        <span className={props.checked ? "text-emerald-300" : "opacity-60"}>
          {props.checked ? "On" : "Off"}
        </span>
      </div>
    </button>
  );
}

function StatusField(props: {
  value: CaptainFormValues["status"];
  disabled?: boolean;
  onChange: (value: CaptainFormValues["status"]) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium">Status</div>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value === "inactive" ? "inactive" : "active")}
        className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </label>
  );
}
