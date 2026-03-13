"use client";

import Link from "next/link";
import React from "react";
import { doc, getDoc, getDocs, serverTimestamp, setDoc, collection } from "firebase/firestore";
import { getIdTokenResult, onAuthStateChanged, signOut, User } from "firebase/auth";

import { auth, db } from "@/lib/firebase/client";
import { CaptainRecord, captainDocPath } from "@/lib/admin/captains";
import { buildDailyReportId, dailyReportDocPath, DailyReportRecord, todayDateKey } from "@/lib/admin/dailyReports";
import { FishSpeciesRecord, fishSpeciesCollectionPath } from "@/lib/admin/fishSpecies";

type FishCatchRow = {
  id: string;
  speciesId: string;
  subspeciesId: string;
  count: string;
};

type FishSpeciesOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
  subspecies: Array<{ id: string; name: string; status: "active" | "inactive" }>;
};

type AccessState = {
  loading: boolean;
  user: User | null;
  captainId: string;
  captainName: string;
  captainEmail: string;
  allowed: boolean;
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

function emptyCatchRow(): FishCatchRow {
  return {
    id: crypto.randomUUID(),
    speciesId: "",
    subspeciesId: "",
    count: "",
  };
}

async function loadFishSpecies(): Promise<FishSpeciesOption[]> {
  const snapshot = await getDocs(collection(db, ...fishSpeciesCollectionPath));
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as Partial<FishSpeciesRecord>;
      return {
        id: docSnap.id,
        name: data.name ?? "",
        status: data.status === "inactive" ? "inactive" : "active",
        subspecies: Array.isArray(data.subspecies)
          ? data.subspecies.map((row) => ({
              id: typeof row?.id === "string" ? row.id : crypto.randomUUID(),
              name: typeof row?.name === "string" ? row.name : "",
              status: row?.status === "inactive" ? "inactive" : "active",
            }))
          : [],
      } satisfies FishSpeciesOption;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export default function CaptainDailyReportPage() {
  const [accessState, setAccessState] = React.useState<AccessState>({
    loading: true,
    user: null,
    captainId: "",
    captainName: "",
    captainEmail: "",
    allowed: false,
    message: null,
  });
  const [reportDate, setReportDate] = React.useState(todayDateKey());
  const [loadingReport, setLoadingReport] = React.useState(true);
  const [species, setSpecies] = React.useState<FishSpeciesOption[]>([]);
  const [rows, setRows] = React.useState<FishCatchRow[]>([emptyCatchRow()]);
  const [notes, setNotes] = React.useState("");
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setAccessState({
          loading: false,
          user: null,
          captainId: "",
          captainName: "",
          captainEmail: "",
          allowed: false,
          message: null,
        });
        return;
      }

      try {
        const token = await getIdTokenResult(nextUser, true);
        const captainId = typeof token.claims.captainId === "string" ? token.claims.captainId : "";
        const allowed = token.claims.siteAccess === true || token.claims.admin === true;

        if (!captainId) {
          setAccessState({
            loading: false,
            user: nextUser,
            captainId: "",
            captainName: "",
            captainEmail: nextUser.email ?? "",
            allowed,
            message: "This signed-in account does not have a captain record linked yet.",
          });
          return;
        }

        const captainSnap = await getDoc(doc(db, ...captainDocPath(captainId)));
        const captainData = captainSnap.exists() ? (captainSnap.data() as Partial<CaptainRecord>) : {};
        setAccessState({
          loading: false,
          user: nextUser,
          captainId,
          captainName: captainData.name ?? nextUser.displayName ?? "Captain",
          captainEmail: captainData.email ?? nextUser.email ?? "",
          allowed,
          message: null,
        });
      } catch (error) {
        setAccessState({
          loading: false,
          user: nextUser,
          captainId: "",
          captainName: "",
          captainEmail: nextUser.email ?? "",
          allowed: false,
          message: errorMessage(error),
        });
      }
    });

    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!accessState.captainId) {
        setLoadingReport(false);
        return;
      }

      setLoadingReport(true);
      setStatusMessage(null);

      try {
        const [speciesOptions, reportSnap] = await Promise.all([
          loadFishSpecies(),
          getDoc(doc(db, ...dailyReportDocPath(buildDailyReportId(accessState.captainId, reportDate)))),
        ]);

        if (cancelled) return;

        setSpecies(speciesOptions);

        if (reportSnap.exists()) {
          const data = reportSnap.data() as Partial<DailyReportRecord>;
          setNotes(typeof data.notes === "string" ? data.notes : "");
          setRows(
            Array.isArray(data.fishCatches) && data.fishCatches.length > 0
              ? data.fishCatches.map((row) => ({
                  id: crypto.randomUUID(),
                  speciesId: typeof row?.speciesId === "string" ? row.speciesId : "",
                  subspeciesId: typeof row?.subspeciesId === "string" ? row.subspeciesId : "",
                  count: typeof row?.count === "number" ? String(row.count) : "",
                }))
              : [emptyCatchRow()],
          );
        } else {
          setNotes("");
          setRows([emptyCatchRow()]);
        }
      } catch (loadError) {
        if (!cancelled) {
          setStatusMessage(`Failed to load daily report: ${errorMessage(loadError)}`);
        }
      } finally {
        if (!cancelled) {
          setLoadingReport(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [accessState.captainId, reportDate]);

  function updateRow(id: string, patch: Partial<FishCatchRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.speciesId !== undefined && patch.speciesId !== row.speciesId) {
          next.subspeciesId = "";
        }
        return next;
      }),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, emptyCatchRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [emptyCatchRow()];
    });
  }

  async function handleSave() {
    if (!accessState.captainId) {
      setStatusMessage("Captain access is required to save a daily report.");
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const normalizedRows = rows.filter((row) => row.speciesId && row.subspeciesId && row.count.trim());
      const fishCatches = normalizedRows.map((row) => {
        const speciesOption = species.find((item) => item.id === row.speciesId);
        const subspeciesOption = speciesOption?.subspecies.find((item) => item.id === row.subspeciesId);
        const count = Number(row.count);

        if (!speciesOption || !subspeciesOption || !Number.isFinite(count) || count <= 0) {
          throw new Error("Each fish catch row needs a species, subspecies, and positive count.");
        }

        return {
          speciesId: speciesOption.id,
          speciesNameSnapshot: speciesOption.name,
          subspeciesId: subspeciesOption.id,
          subspeciesNameSnapshot: subspeciesOption.name,
          count,
        };
      });

      await setDoc(
        doc(db, ...dailyReportDocPath(buildDailyReportId(accessState.captainId, reportDate))),
        {
          captainId: accessState.captainId,
          captainNameSnapshot: accessState.captainName,
          captainEmailSnapshot: accessState.captainEmail,
          dateKey: reportDate,
          reportDate,
          notes: notes.trim(),
          fishCatches,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true },
      );

      setStatusMessage("Daily report saved.");
    } catch (error) {
      setStatusMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (accessState.loading) {
    return <main className="min-h-dvh bg-black text-white px-4 py-8"><div className="mx-auto w-full max-w-screen-lg rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">Loading daily report...</div></main>;
  }

  if (!accessState.user) {
    return (
      <main className="min-h-dvh bg-black text-white px-4 py-8">
        <div className="mx-auto w-full max-w-screen-sm rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="text-lg font-semibold">Sign in required</div>
          <div className="text-sm opacity-75">Use your Google account to continue.</div>
          <Link href="/login?next=/access/daily-reports" className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white px-4 font-medium text-black">Go to login</Link>
        </div>
      </main>
    );
  }

  if (!accessState.allowed || !accessState.captainId) {
    return (
      <main className="min-h-dvh bg-black text-white px-4 py-8">
        <div className="mx-auto w-full max-w-screen-sm rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
          <div className="text-lg font-semibold">Captain access required</div>
          <div className="text-sm opacity-80">{accessState.message ?? "This signed-in account does not have a captain record linked yet."}</div>
          <div className="flex gap-3">
            <Link href="/access" className="inline-flex h-12 items-center rounded-xl border border-white/10 bg-white/5 px-4">Back to access</Link>
            <button type="button" onClick={() => signOut(auth)} className="h-12 rounded-xl border border-white/10 bg-white/5 px-4">Sign out</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-black text-white px-4 py-8">
      <div className="mx-auto w-full max-w-screen-lg space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-lg font-semibold">Daily Fish Catch Report</div>
              <div className="mt-1 text-sm opacity-75">Record species and subspecies catches for the selected report date. These entries are stored with snapshot names for historical reporting.</div>
            </div>
            <div className="flex gap-3">
              <Link href="/access" className="inline-flex h-11 items-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm">Back to access</Link>
              <button type="button" onClick={() => signOut(auth)} className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm">Sign out</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
            <div>
              <div className="text-sm font-medium">Captain</div>
              <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">{accessState.captainName} {accessState.captainEmail ? `(${accessState.captainEmail})` : ""}</div>
            </div>
            <label className="block space-y-2">
              <div className="text-sm font-medium">Report date</div>
              <input type="date" value={reportDate} onChange={(event) => setReportDate(event.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25" />
            </label>
          </div>

          <label className="block space-y-2">
            <div className="text-sm font-medium">Notes</div>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-base outline-none focus:border-white/25" placeholder="Conditions, highlights, or anything important about the day." />
          </label>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Fish catches</div>
              <div className="mt-1 text-sm opacity-75">Choose a species, then a subspecies row, and enter the count landed.</div>
            </div>
            <button type="button" onClick={addRow} disabled={loadingReport || saving} className="h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium active:bg-white/10 disabled:opacity-60">Add row</button>
          </div>

          <div className="mt-4 space-y-3">
            {loadingReport ? (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-sm opacity-70">Loading report data...</div>
            ) : rows.map((row) => {
              const speciesOptions = species.filter((item) => item.status === "active" || item.id === row.speciesId);
              const selectedSpecies = species.find((item) => item.id === row.speciesId);
              const subspeciesOptions = (selectedSpecies?.subspecies ?? []).filter((item) => item.status === "active" || item.id === row.subspeciesId);

              return (
                <div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_160px_auto] md:gap-3 md:items-center space-y-3 md:space-y-0">
                  <label className="block space-y-2 md:space-y-0">
                    <div className="text-xs uppercase tracking-wider opacity-60 md:hidden">Species</div>
                    <select value={row.speciesId} onChange={(event) => updateRow(row.id, { speciesId: event.target.value })} disabled={saving || loadingReport} className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60">
                      <option value="">Select species</option>
                      {speciesOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2 md:space-y-0">
                    <div className="text-xs uppercase tracking-wider opacity-60 md:hidden">Subspecies</div>
                    <select value={row.subspeciesId} onChange={(event) => updateRow(row.id, { subspeciesId: event.target.value })} disabled={saving || loadingReport || !row.speciesId} className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60">
                      <option value="">Select subspecies</option>
                      {subspeciesOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2 md:space-y-0">
                    <div className="text-xs uppercase tracking-wider opacity-60 md:hidden">Count</div>
                    <input value={row.count} inputMode="numeric" placeholder="0" onChange={(event) => updateRow(row.id, { count: event.target.value })} disabled={saving || loadingReport} className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60" />
                  </label>

                  <button type="button" onClick={() => removeRow(row.id)} disabled={saving || loadingReport} className="h-12 rounded-xl border border-white/10 bg-white/5 px-3 text-sm active:bg-white/10 disabled:opacity-60">Remove</button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving || loadingReport} className="h-12 rounded-xl border border-white/20 bg-white px-4 font-medium text-black disabled:opacity-60">{saving ? "Saving..." : "Save daily report"}</button>
          </div>
          {statusMessage ? <div className="mt-3 text-sm opacity-80">{statusMessage}</div> : null}
        </section>
      </div>
    </main>
  );
}
