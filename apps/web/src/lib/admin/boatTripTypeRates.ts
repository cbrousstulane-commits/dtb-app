export type BoatTripTypeRateStatus = "active" | "inactive";

export type BoatTripTypeRateFormValues = {
  boatId: string;
  tripTypeId: string;
  retailPrice: string;
  ownerContractPrice: string;
  status: BoatTripTypeRateStatus;
};

export type BoatTripTypeRateRecord = {
  boatId: string;
  boatNameSnapshot: string;
  tripTypeId: string;
  tripTypeNameSnapshot: string;
  retailPrice: number;
  ownerContractPrice: number | null;
  status: BoatTripTypeRateStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type BoatRateBoatOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

export type BoatRateTripTypeOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

export const boatTripTypeRatesCollectionPath = ["admin", "data", "boatTripTypeRates"] as const;

export function boatTripTypeRateDocPath(rateId: string) {
  return [...boatTripTypeRatesCollectionPath, rateId] as const;
}

export function emptyBoatTripTypeRateForm(): BoatTripTypeRateFormValues {
  return {
    boatId: "",
    tripTypeId: "",
    retailPrice: "",
    ownerContractPrice: "",
    status: "active",
  };
}

function parseMoney(value: string, fieldLabel: string, allowBlank: boolean) {
  const trimmed = value.trim();

  if (!trimmed) {
    if (allowBlank) return null;
    throw new Error(`${fieldLabel} is required.`);
  }

  const normalized = Number(trimmed.replace(/[$,]/g, ""));
  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error(`${fieldLabel} must be a valid number.`);
  }

  return normalized;
}

export function normalizeBoatTripTypeRatePayload(
  values: BoatTripTypeRateFormValues,
  boats: BoatRateBoatOption[],
  tripTypes: BoatRateTripTypeOption[],
): BoatTripTypeRateRecord {
  const boatId = values.boatId.trim();
  const tripTypeId = values.tripTypeId.trim();
  const boat = boats.find((item) => item.id === boatId);
  const tripType = tripTypes.find((item) => item.id === tripTypeId);

  if (!boatId || !boat) {
    throw new Error("Select a boat.");
  }

  if (!tripTypeId || !tripType) {
    throw new Error("Select a trip type.");
  }

  return {
    boatId,
    boatNameSnapshot: boat.name,
    tripTypeId,
    tripTypeNameSnapshot: tripType.name,
    retailPrice: parseMoney(values.retailPrice, "Retail price", false) as number,
    ownerContractPrice: parseMoney(values.ownerContractPrice, "Owner contract price", true),
    status: values.status === "inactive" ? "inactive" : "active",
  };
}

export function toBoatTripTypeRateFormValues(
  value?: Partial<BoatTripTypeRateFormValues> | Partial<BoatTripTypeRateRecord> | null,
): BoatTripTypeRateFormValues {
  return {
    boatId: value?.boatId ?? "",
    tripTypeId: value?.tripTypeId ?? "",
    retailPrice: typeof value?.retailPrice === "number" ? String(value.retailPrice) : (value?.retailPrice ?? ""),
    ownerContractPrice:
      typeof value?.ownerContractPrice === "number" ? String(value.ownerContractPrice) : (value?.ownerContractPrice ?? ""),
    status: value?.status === "inactive" ? "inactive" : "active",
  };
}

export function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number") return "-";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
