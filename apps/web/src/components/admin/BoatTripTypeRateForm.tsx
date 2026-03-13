"use client";

import Link from "next/link";
import React from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase/client";
import { BoatRecord, boatsCollectionPath } from "@/lib/admin/boats";
import { TripTypeRecord, tripTypesCollectionPath } from "@/lib/admin/tripTypes";
import {
  BoatRateBoatOption,
  BoatRateTripTypeOption,
  BoatTripTypeRateFormValues,
  BoatTripTypeRateRecord,
  boatTripTypeRateDocPath,
  boatTripTypeRatesCollectionPath,
  emptyBoatTripTypeRateForm,
  normalizeBoatTripTypeRatePayload,
  toBoatTripTypeRateFormValues,
} from "@/lib/admin/boatTripTypeRates";

type BoatTripTypeRateFormProps = {
  mode: "create" | "edit";
  rateId?: string;
  initialValues?: Partial<BoatTripTypeRateFormValues> | Partial<BoatTripTypeRateRecord> | null;
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

export default function BoatTripTypeRateForm({ mode, rateId, initialValues }: BoatTripTypeRateFormProps) {
  const router = useRouter();

  const initialForm = React.useMemo(
    () => toBoatTripTypeRateFormValues(initialValues ?? emptyBoatTripTypeRateForm()),
    [initialValues],
  );

  const [form, setForm] = React.useState<BoatTripTypeRateFormValues>(initialForm);
  const [boats, setBoats] = React.useState<BoatRateBoatOption[]>([]);
  const [tripTypes, setTripTypes] = React.useState<BoatRateTripTypeOption[]>([]);
  const [loadingOptions, setLoadingOptions] = React.useState(true);
  const [optionsError, setOptionsError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(toBoatTripTypeRateFormValues(initialValues ?? emptyBoatTripTypeRateForm()));
  }, [initialValues]);

  React.useEffect(() => {
    let boatsReady = false;
    let tripTypesReady = false;

    const boatUnsub = onSnapshot(
      query(collection(db, ...boatsCollectionPath)),
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<BoatRecord>;
          return {
            id: docSnap.id,
            name: data.name ?? "",
            status: data.status === "inactive" ? "inactive" : "active",
          } satisfies BoatRateBoatOption;
        });
        setBoats(next);
        boatsReady = true;
        setLoadingOptions(!(boatsReady && tripTypesReady));
        setOptionsError(null);
      },
      (error) => {
        setOptionsError(errorMessage(error));
        setLoadingOptions(false);
      },
    );

    const tripTypeUnsub = onSnapshot(
      query(collection(db, ...tripTypesCollectionPath)),
      (snapshot) => {
        const next = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as Partial<TripTypeRecord>;
          return {
            id: docSnap.id,
            name: data.name ?? "",
            status: data.status === "inactive" ? "inactive" : "active",
          } satisfies BoatRateTripTypeOption;
        });
        setTripTypes(next);
        tripTypesReady = true;
        setLoadingOptions(!(boatsReady && tripTypesReady));
        setOptionsError(null);
      },
      (error) => {
        setOptionsError(errorMessage(error));
        setLoadingOptions(false);
      },
    );

    return () => {
      boatUnsub();
      tripTypeUnsub();
    };
  }, []);

  const availableBoats = React.useMemo(
    () => boats.filter((item) => item.status === "active" || item.id === form.boatId),
    [boats, form.boatId],
  );
  const availableTripTypes = React.useMemo(
    () => tripTypes.filter((item) => item.status === "active" || item.id === form.tripTypeId),
    [tripTypes, form.tripTypeId],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const payload = normalizeBoatTripTypeRatePayload(form, boats, tripTypes);

      const duplicate = await findDuplicateRate({
        rateId,
        boatId: payload.boatId,
        tripTypeId: payload.tripTypeId,
      });

      if (duplicate) {
        throw new Error("A rate already exists for that boat and trip type.");
      }

      if (mode === "create") {
        const ref = await addDoc(collection(db, ...boatTripTypeRatesCollectionPath), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        router.replace(`/admin/boat-rates/${ref.id}`);
        router.refresh();
        return;
      }

      if (!rateId) {
        throw new Error("Missing rate ID for edit mode.");
      }

      await setDoc(
        doc(db, ...boatTripTypeRateDocPath(rateId)),
        {
          ...payload,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      setStatusMessage("Saved.");
      router.refresh();
    } catch (error: unknown) {
      setStatusMessage(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-lg font-semibold">{mode === "create" ? "New Boat Rate" : "Edit Boat Rate"}</div>
        <div className="mt-1 text-sm opacity-75">
          Set the price and optional owner contract price for one boat and one trip type.
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
          <SelectField
            label="Boat"
            value={form.boatId}
            disabled={saving || loadingOptions}
            helper={loadingOptions ? "Loading boats and trip types..." : optionsError ? `Load failed: ${optionsError}` : undefined}
            onChange={(value) => setForm((prev) => ({ ...prev, boatId: value }))}
            options={availableBoats.map((item) => ({ value: item.id, label: `${item.name || "Unnamed boat"}${item.status === "inactive" ? " (inactive)" : ""}` }))}
            placeholder="Select a boat"
          />

          <SelectField
            label="Trip type"
            value={form.tripTypeId}
            disabled={saving || loadingOptions}
            onChange={(value) => setForm((prev) => ({ ...prev, tripTypeId: value }))}
            options={availableTripTypes.map((item) => ({ value: item.id, label: `${item.name || "Unnamed trip type"}${item.status === "inactive" ? " (inactive)" : ""}` }))}
            placeholder="Select a trip type"
          />

          <Field
            label="Retail price"
            value={form.retailPrice}
            placeholder="1200"
            inputMode="decimal"
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, retailPrice: value }))}
          />

          <Field
            label="Owner contract price"
            value={form.ownerContractPrice}
            placeholder="Optional"
            inputMode="decimal"
            disabled={saving}
            onChange={(value) => setForm((prev) => ({ ...prev, ownerContractPrice: value }))}
          />

          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceButton active={form.status === "active"} label="Active" disabled={saving} onClick={() => setForm((prev) => ({ ...prev, status: "active" }))} />
              <ChoiceButton active={form.status === "inactive"} label="Inactive" disabled={saving} onClick={() => setForm((prev) => ({ ...prev, status: "inactive" }))} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <button type="submit" disabled={saving || loadingOptions} className="h-12 px-4 rounded-xl border border-white/20 bg-white text-black font-medium disabled:opacity-60">
              {saving ? "Saving..." : mode === "create" ? "Create rate" : "Save changes"}
            </button>

            <Link href="/admin/boat-rates" className="h-12 px-4 rounded-xl border border-white/10 bg-white/5 active:bg-white/10 flex items-center">
              Back to boat rates
            </Link>
          </div>

          {statusMessage ? <div className="mt-3 text-sm opacity-80">{statusMessage}</div> : null}
        </section>
      </form>
    </div>
  );
}

async function findDuplicateRate(input: { rateId?: string; boatId: string; tripTypeId: string }) {
  const snapshot = await onetimeRates();
  return snapshot.some((item) => item.boatId === input.boatId && item.tripTypeId === input.tripTypeId && item.id !== input.rateId);
}

async function onetimeRates() {
  const { getDocs } = await import("firebase/firestore");
  const snapshot = await getDocs(collection(db, ...boatTripTypeRatesCollectionPath));
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as Partial<BoatTripTypeRateRecord>;
    return {
      id: docSnap.id,
      boatId: data.boatId ?? "",
      tripTypeId: data.tripTypeId ?? "",
    };
  });
}

function Field(props: {
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="text-sm font-medium">{props.label}</div>
      <input
        value={props.value}
        placeholder={props.placeholder}
        inputMode={props.inputMode}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  helper?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{props.label}</div>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-base outline-none focus:border-white/25 disabled:opacity-60"
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {props.helper ? <div className="text-xs opacity-70">{props.helper}</div> : null}
    </div>
  );
}

function ChoiceButton(props: { active: boolean; label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "h-12 rounded-xl border text-sm font-medium",
        props.active ? "border-white/25 bg-white/10" : "border-white/10 bg-white/5 active:bg-white/10",
        props.disabled ? "opacity-60" : "",
      ].join(" ")}
    >
      {props.label}
    </button>
  );
}
