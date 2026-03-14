import Link from "next/link";

const PRIMARY_ACTIONS: Array<{ href: string; title: string; description: string; tone: "live" | "shell" | "system" }> = [
  {
    href: "/admin/customers",
    title: "Customers",
    description: "Search, manage, and review the customer master record.",
    tone: "live",
  },
  {
    href: "/admin/bookings",
    title: "Fishing Trips",
    description: "Import and review historical fishing trips from the website export.",
    tone: "shell",
  },
  {
    href: "/admin/config",
    title: "Settings",
    description: "Manage master data, pricing, users, and centralized backup or restore actions.",
    tone: "system",
  },
];

const DASHBOARD_ROWS = [
  {
    label: "Customer Records",
    body: "Customers, imports, and future review workflows.",
    href: "/admin/customers",
    status: "Live",
  },
  {
    label: "Fishing Trips",
    body: "Historical fishing-trip import, review, and reconciliation workspace.",
    href: "/admin/bookings",
    status: "Shell",
  },
  {
    label: "Master Data",
    body: "Boats, captains, rooms, trip types, and user access live under Settings.",
    href: "/admin/config",
    status: "Live",
  },
  {
    label: "Trip Pricing",
    body: "Boat plus trip type pricing grid with retail and contract price support.",
    href: "/admin/boat-rates",
    status: "Live",
  },
];

const SYSTEM_LINKS = [
  { href: "/admin/config/backup-restore", label: "Backup And Restore" },
  { href: "/admin/users", label: "Users And Captains" },
  { href: "/access", label: "Access" },
  { href: "/auth-test", label: "Auth Test" },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Dashboard</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">DTB Admin Dashboard</div>
            <div className="mt-3 max-w-3xl text-sm text-slate-500">
              Website data remains the forward-looking public source of truth. This admin app is the retrospective operational record for customers, bookings, pricing, settings, and internal workflows.
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[540px] xl:max-w-[620px] xl:flex-1">
            {PRIMARY_ACTIONS.map((item) => (
              <TopActionCard key={item.href} {...item} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-8">
            <div>
              <div className="text-lg font-semibold text-slate-900">Operations Overview</div>
              <div className="mt-1 text-sm text-slate-500">Current active admin surfaces and the operational purpose of each area.</div>
            </div>
            <Link href="/admin/config" className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              Open Settings
            </Link>
          </div>

          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_auto_auto] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 md:grid sm:px-6 lg:px-8">
            <div>Area</div>
            <div>Purpose</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          <div>
            {DASHBOARD_ROWS.map((row) => (
              <DashboardRow key={row.href} {...row} />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Build Sequence" description="Current build order and completed foundational work.">
            <ol className="space-y-3 text-sm text-slate-600">
              <SequenceItem index="1" label="Core admin foundation complete" />
              <SequenceItem index="2" label="Customer import complete" />
              <SequenceItem index="3" label="Fishing and lodge imports in progress" />
              <SequenceItem index="4" label="Review and merge workflow after imports" />
              <SequenceItem index="5" label="Shared activity and day-of operations later" />
            </ol>
          </Panel>

          <Panel title="System" description="Support links and lower-frequency admin entry points.">
            <div className="space-y-3">
              {SYSTEM_LINKS.map((item) => (
                <MiniLink key={item.href} href={item.href} label={item.label} />
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

function TopActionCard(props: { href: string; title: string; description: string; tone: "live" | "shell" | "system" }) {
  const toneClass = props.tone === "live"
    ? "bg-[#fff7e4] text-[#8b5e12]"
    : props.tone === "shell"
      ? "bg-[#eaf2ff] text-[#305b9a]"
      : "bg-slate-100 text-slate-700";

  return (
    <Link href={props.href} className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-3">
        <div className="text-base font-semibold text-slate-900">{props.title}</div>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass}`}>{props.tone === "live" ? "Live" : props.tone === "shell" ? "Shell" : "System"}</span>
      </div>
      <div className="mt-3 text-sm text-slate-500">{props.description}</div>
      <div className="mt-4 text-sm font-semibold text-[#8b5e12]">Open</div>
    </Link>
  );
}

function DashboardRow(props: { label: string; body: string; href: string; status: string }) {
  return (
    <Link href={props.href} className="grid gap-3 border-b border-slate-200 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)_auto_auto] md:items-center sm:px-6 lg:px-8">
      <div className="text-sm font-semibold text-slate-900">{props.label}</div>
      <div className="text-sm text-slate-500">{props.body}</div>
      <div>
        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{props.status}</span>
      </div>
      <div className="text-sm font-semibold text-[#8b5e12]">Open</div>
    </Link>
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

function SequenceItem(props: { index: string; label: string }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f2e7cf] text-sm font-semibold text-[#8b5e12]">{props.index}</span>
      <span className="pt-1">{props.label}</span>
    </li>
  );
}

function MiniLink(props: { href: string; label: string }) {
  return (
    <Link href={props.href} className="flex h-14 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900">
      <span>{props.label}</span>
      <span className="text-slate-400">-&gt;</span>
    </Link>
  );
}

