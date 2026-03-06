"use client";

import React from "react";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import AdminShell from "./AdminShell";

// IMPORTANT: adjust these imports to your actual firebase client module
import { auth } from "@/lib/firebase/client";

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [signedIn, setSignedIn] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setSignedIn(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setSignedIn(true);
        const token = await getIdTokenResult(user, true);
        setIsAdmin(token.claims.admin === true);
        setLoading(false);
      } catch {
        setSignedIn(false);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return <div className="min-h-dvh flex items-center justify-center p-6">Loading admin…</div>;
  }

  if (!signedIn) {
    return <div className="min-h-dvh flex items-center justify-center p-6">Sign in required.</div>;
  }

  if (!isAdmin) {
    return <div className="min-h-dvh flex items-center justify-center p-6">Not authorized (admin claim missing).</div>;
  }

  return <AdminShell>{children}</AdminShell>;
}