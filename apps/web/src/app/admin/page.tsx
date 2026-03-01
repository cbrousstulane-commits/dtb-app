"use client";

import Link from "next/link";

export default function AdminHome() {
  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>DTB Admin</h1>
      <p style={{ marginTop: 8 }}>You’re authenticated. This is the admin landing page.</p>

      <ul style={{ marginTop: 16, lineHeight: 1.8 }}>
        <li>
          <Link href="/auth-test">Auth test</Link>
        </li>
        <li>
          <Link href="/login">Login</Link>
        </li>
      </ul>
    </main>
  );
}