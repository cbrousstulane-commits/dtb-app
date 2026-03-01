"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [email, setEmail] = useState<string | null>(null);

  const allowedEmails = useMemo(() => {
    return (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setEmail(u?.email ?? null);
      setStatus("ready");
    });
    return () => unsub();
  }, []);

  const isAllowed =
    !!email && (allowedEmails.length === 0 || allowedEmails.includes(email.toLowerCase()));

  useEffect(() => {
    if (status !== "ready") return;

    // Not signed in → go login
    if (!email) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    // Signed in but not allowed → go to auth-test (shows access denied + sign out)
    if (!isAllowed) {
      router.replace("/auth-test");
    }
  }, [status, email, isAllowed, router, pathname]);

  if (status !== "ready") {
    return <main style={{ padding: 24 }}>Loading…</main>;
  }

  if (!email || !isAllowed) {
    return <main style={{ padding: 24 }}>Redirecting…</main>;
  }

  return <>{children}</>;
}