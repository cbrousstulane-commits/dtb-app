import Link from "next/link";

export default function AdminBoatsPlaceholderPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Boats</div>
        <div className="mt-1 text-sm opacity-75">
          Boats is the next CRUD module after Captains. Each boat will carry a default primary captain and become the anchor for trip and maintenance logs.
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="text-sm font-semibold">What comes next here</div>
        <div className="text-sm opacity-75">
          Create, edit, rename, deactivate/reactivate, and attach a primary captain.
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/captains"
            className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
          >
            View captains
          </Link>

          <Link
            href="/admin"
            className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
          >
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}