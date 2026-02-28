"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import Link from "next/link";

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setStatus("ready");
    });
    return () => unsub();
  }, []);

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Auth Test</h1>

      {status === "loading" ? (
        <p style={{ marginTop: 12 }}>Checking auth…</p>
      ) : user ? (
        <>
          <p style={{ marginTop: 12 }}>
            Signed in as <b>{user.displayName ?? "Unknown"}</b>
          </p>
          <p>Email: {user.email}</p>
          <p>UID: {user.uid}</p>

          <button onClick={handleSignOut} style={{ marginTop: 16, padding: "10px 14px" }}>
            Sign out
          </button>
        </>
      ) : (
        <>
          <p style={{ marginTop: 12 }}>Not signed in.</p>
          <Link href="/login">Go to /login</Link>
        </>
      )}
    </main>
  );
}
