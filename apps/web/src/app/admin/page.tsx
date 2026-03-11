import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">DTB Admin Dashboard</div>
        <div className="mt-1 text-sm opacity-75">
          Website data remains the forward-looking public source of truth. This admin app is being shaped as the retrospective operational record for captains, boats, trip types, rooms, customers, trips, and maintenance.
        </div>
      </section>

      <section className="grid gap-3">
        <ActionCard
          href="/admin/captains"
          title="Captains"
          description="Create, edit, deactivate, and prepare captain records for future login/access."
        />
        <ActionCard
          href="/admin/boats"
          title="Boats"
          description="Fleet assets with primary captain defaults."
        />
        <ActionCard
          href="/admin/lodge-rooms"
          title="Lodge Rooms"
          description="Manage the 8 nightly room units as individual inventory records."
        />
        <ActionCard
          href="/admin/trip-types"
          title="Trip Types"
          description="Define trip durations in hours for the admin catalog."
        />
        <ActionCard
          href="/admin/customers"
          title="Customers"
          description="Manage the customer master record before import and merge flows arrive."
        />
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">Build sequence</div>

        <div className="mt-3 space-y-2 text-sm opacity-80">
          <div>1. Captains CRUD</div>
          <div>2. Boats CRUD with primary captain relationship</div>
          <div>3. Lodge rooms CRUD</div>
          <div>4. Trip types CRUD</div>
          <div>5. Customers CRUD</div>
          <div>6. Auth and role linkage</div>
          <div>7. Trip logs</div>
          <div>8. Maintenance logs</div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">System</div>

        <div className="mt-3 grid gap-2">
          <MiniLink href="/admin/config" label="Config" />
          <MiniLink href="/auth-test" label="Auth Test" />
        </div>
      </section>
    </div>
  );
}

function ActionCard(props: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={props.href}
      className="rounded-2xl border border-white/10 bg-white/5 active:bg-white/10 p-4 flex items-start justify-between gap-3"
    >
      <div>
        <div className="font-semibold">{props.title}</div>
        <div className="mt-1 text-sm opacity-75">{props.description}</div>
      </div>

      <div className="text-sm opacity-60 shrink-0">{"->"}</div>
    </Link>
  );
}

function MiniLink(props: { href: string; label: string }) {
  return (
    <Link
      href={props.href}
      className="h-12 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 px-4 flex items-center justify-between"
    >
      <span>{props.label}</span>
      <span className="opacity-60">{"->"}</span>
    </Link>
  );
}