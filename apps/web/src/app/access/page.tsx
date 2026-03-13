"use client";

import Link from "next/link";
import { getIdTokenResult, onAuthStateChanged, signOut, User } from "firebase/auth";
import React from "react";

import { auth } from "@/lib/firebase/client";

type AccessState = {
  loading: boolean;
  user: User | null;
  siteAccess: boolean;
  admin: boolean;
  captain: boolean;
  role: string;
  message: string | null;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export default function AccessPage() {
  const [state, setState] = React.useState<AccessState>({
    loading: true,
    user: null,
    siteAccess: false,
    admin: false,
    captain: false,
    role: "none",
    message: null,
  });

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setState({
          loading: false,
          user: null,
          siteAccess: false,
          admin: false,
          captain: false,
          role: "none",
          message: null,
        });
        return;
      }

      try {
        const token = await getIdTokenResult(nextUser, true);
        setState({
          loading: false,
          user: nextUser,
          siteAccess: token.claims.siteAccess === true || token.claims.admin === true,
          admin: token.claims.admin === true,
          captain: token.claims.captain === true,
          role: typeof token.claims.role === "string" ? token.claims.role : "none",
          message: null,
        });
      } catch (error) {
        setState({
          loading: false,
          user: nextUser,
          siteAccess: false,
          admin: false,
          captain: false,
          role: "none",
          message: errorMessage(error),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  if (state.loading) {
    return (
      <main className="min-h-dvh bg-black text-white px-4 py-8">
        <div className="mx-auto w-full max-w-screen-sm rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
          Checking access...
        </div>
      </main>
    );
  }

  if (!state.user) {
    return (
      <main className="min-h-dvh bg-black text-white px-4 py-8">
        <div className="mx-auto w-full max-w-screen-sm rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-lg font-semibold">Sign in required</div>
          <div className="text-sm opacity-75">Use your Google account to continue.</div>
          <Link href="/login?next=/access" className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white px-4 font-medium text-black">
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-black text-white px-4 py-8">
      <div className="mx-auto w-full max-w-screen-sm space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-lg font-semibold">DTB Access</div>
          <div className="mt-1 text-sm opacity-75">
            This is the signed-in landing area for captain and limited-access users. Day-of workflows are still growing, but daily fish catch reporting is now available for captain-linked accounts.
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <Row label="Email" value={state.user.email ?? "Unknown"} />
          <Row label="Role" value={state.role} />
          <Row label="Site access" value={String(state.siteAccess)} />
          <Row label="Captain" value={String(state.captain)} />
          <Row label="Admin" value={String(state.admin)} />
          {state.message ? <div className="text-sm text-amber-300">{state.message}</div> : null}
        </section>

        {state.siteAccess ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
            <div className="font-semibold">Access granted</div>
            <div className="text-sm opacity-80">
              Your Google email is linked to an active record. Admin tools remain separate, and captain-focused reporting tools now live alongside this access landing area.
            </div>
            <div className="flex flex-wrap gap-3">
              {state.admin ? (
                <Link href="/admin" className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white px-4 font-medium text-black">
                  Open admin
                </Link>
              ) : null}
              <Link href="/access/daily-reports" className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-4">
                Daily reports
              </Link>
              <Link href="/auth-test" className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-4">
                View token claims
              </Link>
              <button type="button" onClick={() => signOut(auth)} className="h-12 rounded-xl border border-white/10 bg-white/5 px-4">
                Sign out
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
            <div className="font-semibold">Access not assigned</div>
            <div className="text-sm opacity-80">
              You are signed in, but this Google email is not linked to an active captain or access-user record yet.
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/auth-test" className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-4">
                View token claims
              </Link>
              <button type="button" onClick={() => signOut(auth)} className="h-12 rounded-xl border border-white/10 bg-white/5 px-4">
                Sign out
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
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
