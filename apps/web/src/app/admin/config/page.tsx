"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

type AdminConfig = {
  companyName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
};

type SettingsSection = {
  title: string;
  description: string;
  items: Array<{ href: string; label: string; body: string; badge?: string }>;
};

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    title: "Master Data",
    description: "Core records used across pricing, imports, and operations.",
    items: [
      { href: "/admin/boats", label: "Boats", body: "Manage boat records and primary captain defaults." },
      { href: "/admin/captains", label: "Captains", body: "Manage captain records and admin-access flags." },
      { href: "/admin/lodge-rooms", label: "Lodge Rooms", body: "Manage the 8 nightly room units as inventory-of-1 records." },
      { href: "/admin/trip-types", label: "Trip Types", body: "Manage trip durations and active or inactive catalog state." },
      { href: "/admin/users", label: "Users And Captains", body: "Manage non-captain access users and review captain access records." },
      { href: "/admin/fish-species", label: "Fish Species", body: "Define fish species and maintain subspecies rows for catch reporting." },
    ],
  },
  {
    title: "Trip Pricing",
    description: "Pricing tools for operational and owner-facing amounts.",
    items: [
      { href: "/admin/boat-rates", label: "Boat Trip Type Rates", body: "Set retail price and optional owner contract price for each boat and trip type combination.", badge: "Live" },
    ],
  },
  {
    title: "Backup And Restore",
    description: "Centralized home for import, export, backup, and restore actions.",
    items: [
      { href: "/admin/config/backup-restore", label: "Open Backup And Restore", body: "Go to the centralized workspace for customer imports, booking imports, and future export or restore tools.", badge: "Hub" },
    ],
  },
];

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

export default function AdminConfigPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState(SETTINGS_SECTIONS[0].title);

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

  const activeConfigSection = SETTINGS_SECTIONS.find((section) => section.title === activeSection) ?? SETTINGS_SECTIONS[0];

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Settings</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Admin Settings</div>
            <div className="mt-3 max-w-3xl text-sm text-slate-500">
              Lower-frequency admin tools live here: company details, master data, pricing, access, and the centralized backup and restore workspace.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px] xl:max-w-[620px] xl:flex-1">
            <SettingsStat title="General" value={loading ? "..." : "Ready"} tone="neutral" />
            <SettingsStat title="Active Section" value={activeSection} tone="highlight" />
            <SettingsStat title="Backup Hub" value="Centralized" tone="success" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <section className="rounded-[32px] bg-[#f8fafc] px-4 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-5 lg:px-6">
          <div className="text-sm font-semibold text-slate-900">Settings Menu</div>
          <div className="mt-2 text-sm text-slate-500">Use this as the main workspace for setup, pricing, and data management tasks.</div>

          <div className="mt-5 space-y-2">
            <button type="button" onClick={() => setActiveSection("General")} className={navClass(activeSection === "General")}>
              <span>General</span>
              <span className="text-slate-400">-&gt;</span>
            </button>
            {SETTINGS_SECTIONS.map((section) => (
              <button key={section.title} type="button" onClick={() => setActiveSection(section.title)} className={navClass(activeSection === section.title)}>
                <span>{section.title}</span>
                <span className="text-slate-400">-&gt;</span>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-8">
              <div>
                <div className="text-lg font-semibold text-slate-900">General</div>
                <div className="mt-1 text-sm text-slate-500">Saved in Firestore at `admin/config`.</div>
              </div>

              <button type="button" onClick={onSave} disabled={saving || loading} className="inline-flex h-11 items-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:opacity-60">
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-6">
              <Field label="Company name" value={form.companyName ?? ""} onChange={(v) => setForm((p) => ({ ...p, companyName: v }))} placeholder="Down the Bayou Charters" />
              <Field label="Primary phone" value={form.primaryPhone ?? ""} onChange={(v) => setForm((p) => ({ ...p, primaryPhone: v }))} placeholder="(504) 555-1234" />
              <div className="lg:col-span-2">
                <Field label="Primary email" value={form.primaryEmail ?? ""} onChange={(v) => setForm((p) => ({ ...p, primaryEmail: v }))} placeholder="ops@downthebayou.com" />
              </div>
            </div>

            {status ? <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:px-6 lg:px-8">{status}</div> : null}
          </section>

          <section className="rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-8">
              <div>
                <div className="text-lg font-semibold text-slate-900">{activeConfigSection.title}</div>
                <div className="mt-1 text-sm text-slate-500">{activeConfigSection.description}</div>
              </div>
              <div className="inline-flex rounded-full bg-[#f2e7cf] px-3 py-1 text-xs font-semibold text-[#8b5e12]">{activeConfigSection.items.length} item{activeConfigSection.items.length === 1 ? "" : "s"}</div>
            </div>

            <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_auto_auto] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 md:grid sm:px-6 lg:px-8">
              <div>Section</div>
              <div>Description</div>
              <div>Status</div>
              <div>Action</div>
            </div>

            <div>
              {activeConfigSection.items.map((item) => (
                <SectionRow key={item.href} href={item.href} label={item.label} body={item.body} badge={item.badge ?? "Open"} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function navClass(active: boolean) {
  return [
    "flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
    active ? "bg-[#f2e7cf] text-[#8b5e12]" : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}

function SettingsStat(props: { title: string; value: string; tone: "neutral" | "highlight" | "success" }) {
  const toneClass = props.tone === "highlight"
    ? "bg-[#fff7e4] text-[#8b5e12]"
    : props.tone === "success"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{props.title}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{props.value}</div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{props.tone === "highlight" ? "Focus" : props.tone === "success" ? "Ready" : "Live"}</span>
      </div>
    </div>
  );
}

function SectionRow(props: { href: string; label: string; body: string; badge: string }) {
  return (
    <Link href={props.href} className="grid gap-3 border-b border-slate-200 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_auto_auto] md:items-center sm:px-6 lg:px-8">
      <div className="text-sm font-semibold text-slate-900">{props.label}</div>
      <div className="text-sm text-slate-500">{props.body}</div>
      <div>
        <span className="inline-flex rounded-full bg-[#f2e7cf] px-3 py-1 text-xs font-semibold text-[#8b5e12]">{props.badge}</span>
      </div>
      <div className="text-sm font-semibold text-[#8b5e12]">Open</div>
    </Link>
  );
}

function Field(props: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-semibold text-slate-700">{props.label}</div>
      <input value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-300" />
    </label>
  );
}
