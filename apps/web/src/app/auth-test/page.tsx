"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, getIdTokenResult, User } from "firebase/auth";
import { auth } from "../../lib/firebase/client";
import Link from "next/link";

type Status = "loading" | "ready";

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setClaims(null);
        setIsAdmin(false);
        setStatus("ready");
        return;
      }

      try {
        const token = await getIdTokenResult(u, true);
        setClaims(token.claims as Record<string, unknown>);
        setIsAdmin(token.claims.admin === true);
      } catch (err) {
        console.error("Auth test: failed to read token claims", err);
        setClaims(null);
        setIsAdmin(false);
      } finally {
        setStatus("ready");
      }
    });

    return () => unsub();
  }, []);

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <main style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Auth / Admin Claim Test</h1>

      {status === "loading" ? (
        <p style={{ marginTop: 12 }}>Checking auth...</p>
      ) : user ? (
        <>
          <p style={{ marginTop: 12 }}>
            Signed in as <b>{user.displayName ?? "Unknown"}</b>
          </p>
          <p>Email: {user.email}</p>
          <p>UID: {user.uid}</p>
          <p style={{ marginTop: 12 }}>
            Admin claim:{" "}
            <b style={{ color: isAdmin ? "green" : "crimson" }}>{String(isAdmin)}</b>
          </p>

          <div style={{ marginTop: 12 }}>
            <p style={{ marginBottom: 6, fontWeight: 600 }}>Token claims</p>
            <pre
              style={{
                padding: 12,
                background: "#111",
                color: "#eee",
                overflowX: "auto",
                borderRadius: 8,
              }}
            >
              {JSON.stringify(claims ?? {}, null, 2)}
            </pre>
          </div>

          {!isAdmin && (
            <p style={{ marginTop: 12, color: "crimson" }}>
              Access denied: your ID token does not include <b>admin: true</b>. Run the
              bootstrap script, then sign out/in and refresh this page.
            </p>
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/admin">Go to /admin</Link>
            <button onClick={handleSignOut} style={{ padding: "10px 14px" }}>
              Sign out
            </button>
          </div>
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