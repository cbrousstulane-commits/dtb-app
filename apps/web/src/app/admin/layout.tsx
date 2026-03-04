"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, getIdTokenResult, User } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import { usePathname, useRouter } from "next/navigation";

type GateStatus = "loading" | "ready";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [status, setStatus] = useState<GateStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setIsAdmin(false);
        setStatus("ready");
        return;
      }

      try {
        // Force-refresh token so newly set custom claims show up after sign-out/in
        const token = await getIdTokenResult(u, true);
        setIsAdmin(token.claims.admin === true);
      } catch (err) {
        console.error("Admin gate: failed to read token claims", err);
        setIsAdmin(false);
      } finally {
        setStatus("ready");
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (status !== "ready") return;

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isAdmin) {
      router.replace("/auth-test");
    }
  }, [status, user, isAdmin, router, pathname]);

  if (status !== "ready") return <main style={{ padding: 24 }}>Loading...</main>;
  if (!user || !isAdmin) return <main style={{ padding: 24 }}>Redirecting...</main>;

  return <>{children}</>;
}