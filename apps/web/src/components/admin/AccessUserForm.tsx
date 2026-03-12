"use client";

import Link from "next/link";
import React from "react";
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

import {
  AccessUserFormValues,
  AccessUserRecord,
  accessUserDocPath,
  accessUsersCollectionPath,
  emptyAccessUserForm,
  normalizeAccessUserPayload,
  toAccessUserFormValues,
} from "@/lib/admin/accessUsers";
import { db } from "@/lib/firebase/client";

type AccessUserFormProps = {
  mode: "create" | "edit";
  userId?: string;
  initialValues?: Partial<AccessUserFormValues> | Partial<AccessUserRecord> | null;
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

export default function AccessUserForm({
  mode,
  userId,
  initialValues,
}: AccessUserFormProps) {
  const router = useRouter();

  const initialForm = React.useMemo(
    () => toAccessUserFormValues(initialValues ?? emptyAccessUserForm()),
    [initialValues],
  );

  const [form, setForm] = React.useState<AccessUserFormValues>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(toAccessUserFormValues(initialValues ?? emptyAccessUserForm()));
  }, [initialValues]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      if (!form.name.trim()) {
        throw new Error("User name is required.");
      }

      if (!form.email.trim()) {
        throw new Error("Google email is required.");
      }

      const payload = normalizeAccessUserPayload(form);

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...accessUsersCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        router.replace(`/admin/users/${ref.id}`);
        router.refresh();
        return;
      }

      if (!userId) {
        throw new Error("Missing user ID for edit mode.");
      }

      await setDoc(
        doc(db, ...accessUserDocPath(userId)),
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
        <div className="text-lg font-semibold">{mode === "create" ? "New Access User" : "Edit Access User"}</div>
        <div className="mt-1 text-sm opacity-75">
          Use this for staff or admin users who are not modeled as captains. Claims are applied automatically after their next Google sign-in.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <Field
            label="Name"
            value={form.name}
            placeholder="Office Manager"
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
          />

          <Field
            label="Google email"
            value={form.email}
            placeholder="staff@example.com"
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          />

          <Field
            label="Auth UID"
            value={form.authUid}
            placeholder="Auto-linked after first sign-in"
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, authUid: value }))}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">Role</div>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton
                active={form.role === "user"}
                label="User"
                disabled={saving}
                onClick={() => setForm((prev) => ({ ...prev, role: "user" }))}
              />
              <ChoiceButton
                active={form.role === "admin"}
                label="Admin"
                disabled={saving}
                onClick={() => setForm((prev) => ({ ...prev, role: "admin" }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton
                active={form.status === "active"}
                label="Active"
                disabled={saving}
                onClick={() => setForm((prev) => ({ ...prev, status: "active" }))}
              />
              <ChoiceButton
                active={form.status === "inactive"}
                label="Inactive"
                disabled={saving}
                onClick={() => setForm((prev) => ({ ...prev, status: "inactive" }))}
              />
            </div>
          </div>

          <TextAreaField
            label="Notes"
            value={form.notes}
            placeholder="Optional access notes"
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create user" : "Save changes"}
            </button>

            <Link
              href="/admin/users"
              className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
            >
              Back to users
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

function ChoiceButton(props: {
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