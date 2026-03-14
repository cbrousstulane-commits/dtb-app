"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "./cn";

type NavItem = {
  href: string;
  label: string;
  icon: (props: { active: boolean }) => React.ReactNode;
};

const PRIMARY_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: GridIcon },
  { href: "/admin/bookings", label: "Bookings", icon: TicketIcon },
  { href: "/admin/customers", label: "Customers", icon: UsersIcon },
  { href: "/admin/lodge", label: "Lodge", icon: BedIcon },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "/admin/config", label: "Settings", icon: GearIcon },
  { href: "/admin/users", label: "Users", icon: ShieldIcon },
  { href: "/auth-test", label: "Auth Test", icon: BoltIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const activeItem = [...PRIMARY_NAV, ...SECONDARY_NAV].find((item) => isActive(pathname, item.href));
  const title = activeItem?.label ?? "Admin";

  return (
    <div className="min-h-dvh bg-[#d6e0eb] text-slate-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] gap-0 px-0 lg:px-6 lg:py-6">
        <aside className="hidden w-[278px] shrink-0 lg:block">
          <Sidebar pathname={pathname} title={title} onNavigate={undefined} />
        </aside>

        <div className="flex min-h-dvh flex-1 flex-col lg:min-h-0">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#d6e0eb]/90 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3 px-4 py-4">
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </button>

              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">DTB Admin</div>
                <div className="mt-1 truncate text-xl font-semibold text-slate-900">{title}</div>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-4 sm:px-6 lg:px-0 lg:py-0">{children}</main>
        </div>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] p-3">
            <Sidebar pathname={pathname} title={title} onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Sidebar(props: {
  pathname: string;
  title: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[calc(100dvh-3rem)] flex-col rounded-[32px] bg-[#f8fafc] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/80 lg:min-h-full">
      <div className="flex items-center gap-3 rounded-2xl px-3 py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-sm font-black tracking-[0.2em] text-white">
          DTB
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Dash to Boat</div>
          <div className="text-base font-semibold text-slate-900">{props.title}</div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={props.pathname} onNavigate={props.onNavigate} />
        ))}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <div className="px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">System</div>
        <div className="mt-2 space-y-1">
          {SECONDARY_NAV.map((item) => (
            <NavLink key={item.href} item={item} pathname={props.pathname} onNavigate={props.onNavigate} />
          ))}
        </div>
      </div>

      <div className="mt-auto rounded-[24px] bg-slate-900 px-4 py-4 text-white">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Admin Session</div>
        <div className="mt-2 text-sm font-medium">Shared admin shell active</div>
        <div className="mt-1 text-sm text-slate-300">Use settings for boats, trip types, captains, and data import/export.</div>
      </div>
    </div>
  );
}

function NavLink(props: { item: NavItem; pathname: string; onNavigate?: () => void }) {
  const active = isActive(props.pathname, props.item.href);
  return (
    <Link
      href={props.item.href}
      onClick={props.onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors",
        active ? "bg-[#f2e7cf] text-[#8b5e12]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
      aria-current={active ? "page" : undefined}
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", active ? "border-[#e7c98b] bg-[#f8efd9]" : "border-slate-200 bg-white")}>
        {props.item.icon({ active })}
      </span>
      <span>{props.item.label}</span>
    </Link>
  );
}

function iconClass(active: boolean) {
  return active ? "stroke-[#8b5e12]" : "stroke-slate-500";
}

function GridIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></SvgBox>;
}
function TicketIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M5 7h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V7Zm4 0v12" /></SvgBox>;
}
function UsersIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 1a3 3 0 1 0 0-6M4 19a5 5 0 0 1 10 0M15 19a4 4 0 0 1 5 0" /></SvgBox>;
}
function BedIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M4 12V7h5a3 3 0 0 1 3 3v2M4 12h16v5H4zM16 12V9a2 2 0 1 1 4 0v3" /></SvgBox>;
}
function ShieldIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M12 4 5 7v5c0 4.5 2.9 7 7 8 4.1-1 7-3.5 7-8V7l-7-3Z" /></SvgBox>;
}
function GearIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7.5 3.5-1.9.7a6 6 0 0 1-.5 1.2l.8 1.8-1.7 1.7-1.8-.8a6 6 0 0 1-1.2.5l-.7 1.9h-2.4l-.7-1.9a6 6 0 0 1-1.2-.5l-1.8.8-1.7-1.7.8-1.8a6 6 0 0 1-.5-1.2L4.5 12v-2.4l1.9-.7a6 6 0 0 1 .5-1.2l-.8-1.8 1.7-1.7 1.8.8a6 6 0 0 1 1.2-.5l.7-1.9h2.4l.7 1.9a6 6 0 0 1 1.2.5l1.8-.8 1.7 1.7-.8 1.8c.2.4.4.8.5 1.2l1.9.7Z" /></SvgBox>;
}
function BoltIcon({ active }: { active: boolean }) {
  return <SvgBox className={iconClass(active)}><path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z" /></SvgBox>;
}
function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>;
}
function SvgBox(props: { children: React.ReactNode; className: string }) {
  return <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cn("h-4.5 w-4.5", props.className)}>{props.children}</svg>;
}

