"use client";

import Link from "next/link";

export default function AdminHomePage() {
  return (
    <main style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin</h1>

      <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <Link href="/admin/config">Admin Config</Link>
        <Link href="/auth-test">Auth / Admin Claim Test</Link>
      </div>
    </main>
  );
}