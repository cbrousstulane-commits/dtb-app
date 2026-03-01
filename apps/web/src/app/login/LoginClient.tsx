"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { auth } from "../../lib/firebase/client";

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    const n = params.get("next");
    return n && n.startsWith("/") ? n : "/admin";
  }, [params]);

  async function handleGooglePopup() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.replace(nextPath);
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    }
  }

  async function handleGoogleRedirect() {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (e: any) {
      setError(e?.message ?? "Login failed");
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>DTB Admin Panel</h1>
      <p style={{ marginTop: 8 }}>Sign in to continue.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={handleGooglePopup} style={{ padding: "10px 14px" }}>
          Sign in with Google (popup)
        </button>
        <button onClick={handleGoogleRedirect} style={{ padding: "10px 14px" }}>
          Sign in with Google (redirect)
        </button>
      </div>

      {error && (
        <p style={{ marginTop: 16, color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>
      )}
    </main>
  );
}