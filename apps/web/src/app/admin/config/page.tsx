"use client";

import Link from "next/link";
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
        { merge: true },
      );
      setStatus("Saved.");
    } catch (e: unknown) {
      setStatus(`Save failed: ${errorMessage(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Settings</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Admin Settings</div>
        <div className="mt-3 max-w-3xl text-sm text-slate-500">
          This is the home for lower-frequency admin functions like master data, trip pricing, users, and backup or restore actions.
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Panel title="General" description="Saved in Firestore at admin/config.">
            {loading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-4">
                <Field label="Company name" value={form.companyName ?? ""} onChange={(v) => setForm((p) => ({ ...p, companyName: v }))} placeholder="Down the Bayou Charters" />
                <Field label="Primary phone" value={form.primaryPhone ?? ""} onChange={(v) => setForm((p) => ({ ...p, primaryPhone: v }))} placeholder="(504) 555-1234" />
                <Field label="Primary email" value={form.primaryEmail ?? ""} onChange={(v) => setForm((p) => ({ ...p, primaryEmail: v }))} placeholder="ops@downthebayou.com" />

                <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-12 items-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:opacity-60">
                  {saving ? "Saving..." : "Save settings"}
                </button>

                {status ? <div className="text-sm text-slate-500">{status}</div> : null}
              </div>
            )}
          </Panel>

          <Panel title="Backup And Restore" description="All data import, export, backup, and restore actions now route through one workspace.">
            <ActionLink
              href="/admin/config/backup-restore"
              title="Open Backup And Restore"
              description="Go to the centralized workspace for customer imports, booking imports, and future CSV export or restore tools."
            />
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Master Data" description="Core entities used across pricing, imports, and operations.">
            <div className="space-y-3">
              <ActionRow href="/admin/boats" label="Boats" body="Manage boat records and primary captain defaults." />
              <ActionRow href="/admin/captains" label="Captains" body="Manage captain records and admin-access flags." />
              <ActionRow href="/admin/lodge-rooms" label="Lodge Rooms" body="Manage the 8 nightly room units as master inventory records." />
              <ActionRow href="/admin/trip-types" label="Trip Types" body="Manage trip durations and active/inactive catalog state." />
              <ActionRow href="/admin/users" label="Users and Captains" body="Manage non-captain access users and review captain access records." />
            </div>
          </Panel>

          <Panel title="Trip Pricing" description="Set rates by boat and trip type.">
            <div className="space-y-3">
              <ActionRow href="/admin/boat-rates" label="Boat Trip Type Rates" body="Set the retail price and optional owner contract price for each boat and trip type combination." />
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function Panel(props: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
      <div className="text-lg font-semibold text-slate-900">{props.title}</div>
      {props.description ? <div className="mt-2 text-sm text-slate-500">{props.description}</div> : null}
      <div className="mt-5">{props.children}</div>
    </section>
  );
}

function ActionRow(props: { href: string; label: string; body: string }) {
  return (
    <Link href={props.href} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
      <div>
        <div className="text-sm font-semibold text-slate-900">{props.label}</div>
        <div className="mt-1 text-sm text-slate-500">{props.body}</div>
      </div>
      <div className="text-slate-400">-&gt;</div>
    </Link>
  );
}

function ActionLink(props: { href: string; title: string; description: string }) {
  return (
    <Link href={props.href} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 block">
      <div className="text-sm font-semibold text-slate-900">{props.title}</div>
      <div className="mt-2 text-sm text-slate-500">{props.description}</div>
    </Link>
  );
}

function Field(props: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-700">{props.label}</div>
      <input value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-300" />
    </div>
  );
}
