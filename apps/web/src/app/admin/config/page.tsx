"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase/client";

type AdminConfig = {
  companyName?: string;
  timezone?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export default function AdminConfigPage() {
  const ref = doc(db, "admin", "config"); // Firestore doc path: admin/config

  const [loading, setLoading] = useState(true);
  const [exists, setExists] = useState(false);
  const [data, setData] = useState<AdminConfig>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDoc(ref);
      setExists(snap.exists());
      setData((snap.data() as AdminConfig) ?? {});
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function createOrUpdate() {
    setError(null);
    try {
      await setDoc(
        ref,
        {
          companyName: data.companyName ?? "Down the Bayou Charters",
          timezone: data.timezone ?? "America/Chicago",
          updatedAt: serverTimestamp(),
          ...(exists ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 820 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin Config</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Firestore doc: <code>admin/config</code>
      </p>

      {loading ? (
        <p style={{ marginTop: 12 }}>Loading...</p>
      ) : (
        <>
          <p style={{ marginTop: 12 }}>
            Exists: <b>{String(exists)}</b>
          </p>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Company name</div>
              <input
                value={data.companyName ?? ""}
                onChange={(e) => setData((d) => ({ ...d, companyName: e.target.value }))}
                style={{ width: "100%", padding: 10 }}
                placeholder="Down the Bayou Charters"
              />
            </label>

            <label>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Timezone</div>
              <input
                value={data.timezone ?? ""}
                onChange={(e) => setData((d) => ({ ...d, timezone: e.target.value }))}
                style={{ width: "100%", padding: 10 }}
                placeholder="America/Chicago"
              />
            </label>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={createOrUpdate} style={{ padding: "10px 14px" }}>
              {exists ? "Update config" : "Create config"}
            </button>
            <button onClick={load} style={{ padding: "10px 14px" }}>
              Reload
            </button>
          </div>

          {error && (
            <p style={{ marginTop: 12, color: "crimson" }}>
              Error: <code>{error}</code>
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Current doc</p>
            <pre
              style={{
                padding: 12,
                background: "#111",
                color: "#eee",
                overflowX: "auto",
                borderRadius: 8,
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </>
      )}
    </main>
  );
}