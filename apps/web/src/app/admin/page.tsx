// apps/web/app/admin/page.tsx
import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      {/* Quick status / intro */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Admin Dashboard</div>
        <div className="mt-1 text-sm opacity-80">
          Mobile-first shell is active. Use the tabs below to manage entities.
        </div>
      </section>

      {/* Primary actions */}
      <section className="grid gap-3">
        <Link
          href="/admin/boats"
          className="h-14 rounded-2xl border border-white/10 bg-white/5 active:bg-white/10 px-4 flex items-center justify-between"
        >
          <div>
            <div className="font-semibold">Boats</div>
            <div className="text-xs opacity-70">Create, edit, deactivate</div>
          </div>
          <div className="text-sm opacity-70">→</div>
        </Link>

        <Link
          href="/admin/customers"
          className="h-14 rounded-2xl border border-white/10 bg-white/5 active:bg-white/10 px-4 flex items-center justify-between"
        >
          <div>
            <div className="font-semibold">Customers</div>
            <div className="text-xs opacity-70">Profiles and contact info</div>
          </div>
          <div className="text-sm opacity-70">→</div>
        </Link>
      </section>

      {/* Secondary / system */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold">System</div>
        <div className="mt-3 grid gap-2">
          <Link
            href="/admin/config"
            className="h-12 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 px-4 flex items-center justify-between"
          >
            <span>Config</span>
            <span className="opacity-70">→</span>
          </Link>

          <Link
            href="/auth-test"
            className="h-12 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 px-4 flex items-center justify-between"
          >
            <span>Auth Test</span>
            <span className="opacity-70">→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}