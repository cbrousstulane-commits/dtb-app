import Link from "next/link";

export default function AdminBackupRestorePage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Settings</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Backup And Restore</div>
        <div className="mt-3 max-w-3xl text-sm text-slate-500">
          This workspace centralizes import, export, backup, and restore actions. Existing live tools route here first, and future restore flows should be added here instead of scattered across the admin.
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Import Data"
          description="Bring external data into the app without spreading upload tools across unrelated sections."
        >
          <div className="space-y-3">
            <ActionCard
              href="/admin/customers/import-square"
              title="Import Customers CSV"
              description="Upload the Square customer export and reconcile customer records."
              status="Live"
            />
            <ActionCard
              href="/admin/bookings"
              title="Import Trips CSV"
              description="Use the bookings area for website trip-import work as the importer is completed."
              status="Shell"
            />
          </div>
        </Panel>

        <Panel
          title="Export And Restore"
          description="These actions will live here as backup and restore tooling is built out."
        >
          <div className="space-y-3">
            <PlaceholderCard
              title="Export Customers CSV"
              description="Planned export of customer master data for backup and external review."
            />
            <PlaceholderCard
              title="Export Trips CSV"
              description="Planned export of operational and imported trip data once those records are finalized."
            />
            <PlaceholderCard
              title="Restore Data"
              description="Future restore workflows should land here so recovery actions stay centralized and deliberate."
            />
          </div>
        </Panel>
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/config" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
            Back To Settings
          </Link>
          <Link href="/admin/customers" className="inline-flex h-12 items-center rounded-2xl bg-[#d8a641] px-5 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a]">
            Go To Customers
          </Link>
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

function ActionCard(props: { href: string; title: string; description: string; status: string }) {
  return (
    <Link href={props.href} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
      <div>
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900">{props.title}</div>
          <span className="inline-flex rounded-full bg-[#f2e7cf] px-2.5 py-1 text-xs font-semibold text-[#8b5e12]">{props.status}</span>
        </div>
        <div className="mt-2 text-sm text-slate-500">{props.description}</div>
      </div>
      <div className="text-slate-400">-&gt;</div>
    </Link>
  );
}

function PlaceholderCard(props: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
      <div className="text-sm font-semibold text-slate-900">{props.title}</div>
      <div className="mt-2 text-sm text-slate-500">{props.description}</div>
    </div>
  );
}
