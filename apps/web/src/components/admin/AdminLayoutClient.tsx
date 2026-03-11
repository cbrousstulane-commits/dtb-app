"use client";

import Link from "next/link";
import React from "react";
import { getIdTokenResult, onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase/client";
import AdminShell from "./AdminShell";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
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
    return (
      <CenteredState
        title="Loading admin..."
        body="Checking sign-in state and admin claim."
      />
    );
  }

  if (!signedIn) {
    return (
      <CenteredState
        title="Sign in required"
        body="You must sign in before opening the admin panel."
        actionHref="/login"
        actionLabel="Go to login"
      />
    );
  }

  if (!isAdmin) {
    return (
      <CenteredState
        title="Not authorized"
        body="Your account is signed in, but this ID token does not currently include admin access."
        actionHref="/auth-test"
        actionLabel="Open auth test"
      />
    );
  }

  return <AdminShell>{children}</AdminShell>;
}

function CenteredState(props: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="min-h-screen bg-[#08111f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-lg font-semibold">{props.title}</div>
          <div className="mt-2 text-sm opacity-75">{props.body}</div>

          {props.actionHref && props.actionLabel ? (
            <Link
              href={props.actionHref}
              className="mt-4 flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium active:bg-white/10"
            >
              {props.actionLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}