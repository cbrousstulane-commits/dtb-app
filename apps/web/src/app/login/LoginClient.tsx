"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  User,
} from "firebase/auth";

import { auth } from "../../lib/firebase/client";

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "unknown error";
  }
}

async function syncAccess(user: User, nextPath: string) {
  const idToken = await user.getIdToken();
  const response = await fetch("/api/auth/sync-role", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ nextPath }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    redirectPath?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "Role sync failed.");
  }

  await user.getIdToken(true);
  return payload.redirectPath && payload.redirectPath.startsWith("/")
    ? payload.redirectPath
    : "/access";
}

export default function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const nextPath = useMemo(() => {
    const n = params.get("next");
    return n && n.startsWith("/") ? n : "/admin";
  }, [params]);

  useEffect(() => {
    let cancelled = false;

    async function finishRedirectSignIn() {
      try {
        const result = await getRedirectResult(auth);

        if (!result?.user || cancelled) {
          return;
        }

        setPending(true);
        const redirectPath = await syncAccess(result.user, nextPath);

        if (!cancelled) {
          router.replace(redirectPath);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(errorMessage(e) || "Login failed");
        }
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    }

    void finishRedirectSignIn();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  async function handleGooglePopup() {
    setError(null);
    setPending(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const redirectPath = await syncAccess(result.user, nextPath);
      router.replace(redirectPath);
    } catch (e: unknown) {
      setError(errorMessage(e) || "Login failed");
      setPending(false);
    }
  }

  async function handleGoogleRedirect() {
    setError(null);
    setPending(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (e: unknown) {
      setError(errorMessage(e) || "Login failed");
      setPending(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>DTB Access</h1>
      <p style={{ marginTop: 8 }}>
        Sign in with Google. Admins will be sent to the admin panel. Captains and limited-access users will be sent to the access page.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={handleGooglePopup} style={{ padding: "10px 14px" }} disabled={pending}>
          {pending ? "Working..." : "Sign in with Google (popup)"}
        </button>
        <button onClick={handleGoogleRedirect} style={{ padding: "10px 14px" }} disabled={pending}>
          {pending ? "Working..." : "Sign in with Google (redirect)"}
        </button>
      </div>

      {error && <p style={{ marginTop: 16, color: "crimson", whiteSpace: "pre-wrap" }}>{error}</p>}
    </main>
  );
}