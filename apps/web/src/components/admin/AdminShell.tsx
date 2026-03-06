"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "./cn";

const PRIMARY_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/boats", label: "Boats" },
  { href: "/admin/customers", label: "Customers" },
];

const SECONDARY_NAV = [
  { href: "/admin/config", label: "Config" },
  { href: "/auth-test", label: "Auth Test" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const title =
    PRIMARY_NAV.find((n) => isActive(pathname, n.href))?.label ??
    SECONDARY_NAV.find((n) => isActive(pathname, n.href))?.label ??
    "Admin";

  return (
    <div className="min-h-dvh bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto w-full max-w-screen-sm px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm opacity-70">DTB Admin</div>
            <div className="text-base font-semibold truncate">{title}</div>
          </div>

          <button
            type="button"
            className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            Menu
          </button>
        </div>
      </header>

      {/* Content */}
      <main className={cn("mx-auto w-full max-w-screen-sm px-4 pt-4", "pb-[calc(env(safe-area-inset-bottom)+88px)]")}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur">
        <div className="mx-auto w-full max-w-screen-sm px-2 py-2">
          <div className="grid grid-cols-3 gap-2">
            {PRIMARY_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "h-12 rounded-xl flex items-center justify-center text-sm border",
                    active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 active:bg-white/10"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Slide-over menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-sm border-l border-white/10 bg-black p-4">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Menu</div>
              <button
                className="h-11 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10"
                onClick={() => setMenuOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs uppercase tracking-wider opacity-60">Primary</div>
              {PRIMARY_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block h-12 rounded-xl px-4 flex items-center border",
                      active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 active:bg-white/10"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs uppercase tracking-wider opacity-60">Secondary</div>
              {SECONDARY_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "block h-12 rounded-xl px-4 flex items-center border",
                      active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 active:bg-white/10"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}