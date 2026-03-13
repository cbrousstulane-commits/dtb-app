import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Dashboard</div>
        <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">DTB Admin Dashboard</div>
        <div className="mt-3 max-w-3xl text-sm text-slate-500">
          Website data remains the forward-looking public source of truth. This admin app is the retrospective operational record for customers, bookings, rooms, and internal pricing and settings.
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ActionCard href="/admin/customers" title="Customers" description="Search, manage, and review the customer master record." />
        <ActionCard href="/admin/lodge-rooms" title="Lodge Rooms" description="Manage the 8 nightly room units as individual inventory records." />
        <ActionCard href="/admin/bookings" title="Bookings" description="Review the website booking shell and future import history." />
        <ActionCard href="/admin/config" title="Settings" description="Boats, captains, trip types, rates, users, and data import/export now live here." />
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="text-sm font-semibold text-slate-900">Build sequence</div>
        <div className="mt-4 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
          <div>1. Admin shell stabilization</div>
          <div>2. Boats CRUD with primary captain relationship</div>
          <div>3. Lodge rooms CRUD</div>
          <div>4. Trip types CRUD</div>
          <div>5. Customers CRUD</div>
          <div>6. Access and role linkage</div>
          <div>7. Website booking shell</div>
          <div>8. Square customer CSV import</div>
          <div>9. Boat trip type rate tables</div>
        </div>
      </section>

      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="text-sm font-semibold text-slate-900">System</div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <MiniLink href="/admin/config" label="Settings" />
          <MiniLink href="/access" label="Access" />
          <MiniLink href="/auth-test" label="Auth Test" />
          <MiniLink href="/admin/users" label="Users and Captains" />
        </div>
      </section>
    </div>
  );
}

function ActionCard(props: { href: string; title: string; description: string }) {
  return (
    <Link href={props.href} className="rounded-[28px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
      <div className="font-semibold text-slate-900">{props.title}</div>
      <div className="mt-2 text-sm text-slate-500">{props.description}</div>
      <div className="mt-4 text-sm font-medium text-[#8b5e12]">Open</div>
    </Link>
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
