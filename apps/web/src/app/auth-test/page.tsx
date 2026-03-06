"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getIdTokenResult, onAuthStateChanged, signOut, User } from "firebase/auth";

import { auth } from "@/lib/firebase/client";

type Status = "loading" | "ready";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export default function AuthTestPage() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function readClaims(currentUser: User, forceRefresh = false) {
    const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
    setClaims(tokenResult.claims as Record<string, unknown>);
    setIsAdmin(tokenResult.claims.admin === true);
    setLastRefreshAt(new Date().toLocaleString());
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setMessage(null);

      if (!nextUser) {
        setClaims(null);
        setIsAdmin(false);
        setStatus("ready");
        return;
      }

      try {
        await readClaims(nextUser, true);
      } catch (error: unknown) {
        setClaims(null);
        setIsAdmin(false);
        setMessage(`Failed to read claims: ${errorMessage(error)}`);
      } finally {
        setStatus("ready");
      }
    });

    return () => unsubscribe();
  }, []);

  async function handleRefreshToken() {
    if (!user) return;

    setRefreshing(true);
    setMessage(null);

    try {
      await readClaims(user, true);
      setMessage("Token claims refreshed.");
    } catch (error: unknown) {
      setMessage(`Refresh failed: ${errorMessage(error)}`);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">Auth / Admin Claim Test</div>
        <div className="mt-1 text-sm opacity-75">
          Inspect the current signed-in user, current ID token claims, and force a token refresh after claim changes.
        </div>
      </section>

      {status === "loading" ? (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Checking auth...
        </section>
      ) : user ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <Row label="Display name" value={user.displayName ?? "Unknown"} />
            <Row label="Email" value={user.email ?? "Unknown"} />
            <Row label="UID" value={user.uid} />
            <Row label="Admin claim" value={String(isAdmin)} />
            <Row label="Last refreshed" value={lastRefreshAt ?? "Not yet refreshed"} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold">Token claims</div>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
              {JSON.stringify(claims ?? {}, null, 2)}
            </pre>

            {!isAdmin ? (
              <div className="mt-3 text-sm text-amber-300">
                Access denied: this ID token does not currently include `admin: true`.
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRefreshToken}
                disabled={refreshing}
                className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh token"}
              </button>

              <Link
                href="/admin"
                className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center"
              >
                Go to /admin
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10"
              >
                Sign out
              </button>
            </div>

            {message ? <div className="mt-3 text-sm opacity-80">{message}</div> : null}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-sm opacity-80">Not signed in.</div>
          <Link
            href="/login"
            className="inline-flex h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 items-center"
          >
            Go to /login
          </Link>
        </section>
      )}
    </div>
  );
}

function Row(props: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <div className="text-xs uppercase tracking-wider opacity-60">{props.label}</div>
      <div className="break-all text-sm">{props.value}</div>
    </div>
  );
}