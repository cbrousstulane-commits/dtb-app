"use client";

import React from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

type AdminConfig = {
  companyName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
};

export default function AdminConfigPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<AdminConfig>({
    companyName: "",
    primaryPhone: "",
    primaryEmail: "",
  });

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setStatus(null);
      try {
        const ref = doc(db, "admin", "config");
        const snap = await getDoc(ref);

        if (!cancelled) {
          const data = snap.exists() ? (snap.data() as Partial<AdminConfig>) : {};
          setForm({
            companyName: data.companyName ?? "",
            primaryPhone: data.primaryPhone ?? "",
            primaryEmail: data.primaryEmail ?? "",
          });
        }
      } catch (e: unknown) {
        if (!cancelled) setStatus(`Load failed: ${errorMessage(e)}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      const ref = doc(db, "admin", "config");
      await setDoc(
        ref,
        {
          ...form,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setStatus("Saved.");
    } catch (e: unknown) {
      setStatus(`Save failed: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Config</div>
        <div className="mt-1 text-sm opacity-80">
          Settings stored in Firestore at <code className="opacity-90">admin/config</code>.
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
        {loading ? (
          <div className="text-sm opacity-80">Loading…</div>
        ) : (
          <>
            <Field
              label="Company name"
              value={form.companyName ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, companyName: v }))}
              placeholder="Down the Bayou Charters"
            />
            <Field
              label="Primary phone"
              value={form.primaryPhone ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, primaryPhone: v }))}
              placeholder="(504) 555-1234"
            />
            <Field
              label="Primary email"
              value={form.primaryEmail ?? ""}
              onChange={(v) => setForm((p) => ({ ...p, primaryEmail: v }))}
              placeholder="ops@downthebayou.com"
            />

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="h-12 w-full rounded-xl border border-white/10 bg-white/10 active:bg-white/15 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>

            {status && <div className="text-sm opacity-80">{status}</div>}
          </>
        )}
      </section>
    </div>
  );
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25"
      />
    </div>
  );
}