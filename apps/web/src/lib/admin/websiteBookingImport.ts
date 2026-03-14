import { normalizePhone, CustomerRecord } from "@/lib/admin/customers";
import { parseCsv } from "@/lib/admin/squareCustomers";
import { BoatRecord } from "@/lib/admin/boats";
import { CaptainRecord } from "@/lib/admin/captains";
import { TripTypeRecord } from "@/lib/admin/tripTypes";
import { BookingGroupStatus, BookingImportRowStatus, BookingImportRowType, CustomerMatchStatus } from "@/lib/admin/websiteBookings";

export type WebsiteBookingCsvRow = {
  sourceRowNumber: number;
  raw: Record<string, string>;
  bookingId: string;
  bookingStatus: string;
  calendarId: string;
  calendarName: string;
  startDate: string;
  endDate: string;
  dateCreated: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string;
  termsAccepted: boolean;
  totalAmount: number;
  depositPaid: number;
  remainingPaymentDue: number;
  guestCount: number;
  sourceGuestCount: string;
  tripLabel: string;
  tripOptions: string[];
  rowType: BookingImportRowType;
};

export type ExistingCustomerOption = CustomerRecord & { id: string };
export type ExistingCaptainOption = CaptainRecord & { id: string };
export type ExistingBoatOption = BoatRecord & { id: string };
export type ExistingTripTypeOption = TripTypeRecord & { id: string };

export type WebsiteBookingPreviewRow = {
  sourceRowNumber: number;
  externalBookingGroupId: string;
  rowType: BookingImportRowType;
  rowStatus: BookingImportRowStatus;
  reviewReason: string;
  bookingStatus: BookingGroupStatus;
  customerId: string;
  customerMatchStatus: CustomerMatchStatus;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  customerEmailSnapshot: string;
  matchedCaptainId: string;
  matchedCaptainName: string;
  matchedBoatId: string;
  matchedBoatName: string;
  matchedTripTypeId: string;
  matchedTripTypeName: string;
  sourceCalendarId: string;
  sourceCalendarName: string;
  sourceTripLabel: string;
  startDate: string;
  endDate: string;
  guestCount: number;
  termsAccepted: boolean;
  totalAmount: number;
  depositPaid: number;
  remainingPaymentDue: number;
  rawRow: WebsiteBookingCsvRow;
};

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeKey(value: string): string {
  return normalizeName(value).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function headerIncludes(header: string, fragment: string): boolean {
  return normalizeHeader(header).includes(normalizeHeader(fragment));
}

function cleanCell(value: string): string {
  const trimmed = value.trim();
  return trimmed === "-" ? "" : trimmed;
}

function parseMoney(value: string): number {
  const cleaned = cleanCell(value).replace(/[$,]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCount(value: string): number {
  const cleaned = cleanCell(value);
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstMatch(header: string[], fragments: string[]): string {
  for (const fragment of fragments) {
    const found = header.find((label) => headerIncludes(label, fragment));
    if (found) return found;
  }
  return "";
}

function getValue(row: string[], header: string[], headerLabel: string): string {
  if (!headerLabel) return "";
  const index = header.indexOf(headerLabel);
  return index >= 0 ? (row[index] ?? "") : "";
}

function collectOptionValues(raw: Record<string, string>): string[] {
  const candidates = [
    raw.shelfLongRange,
    raw.tenOrFourteenHour,
    raw.oldTenOrFourteenHour,
    raw.halfOrFullDay,
    raw.selectFollowing22,
    raw.selectFollowing27,
  ];

  const seen = new Set<string>();
  const next: string[] = [];

  for (const candidate of candidates) {
    const trimmed = cleanCell(candidate);
    if (!trimmed || trimmed === "0") continue;
    const key = normalizeKey(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(trimmed);
  }

  return next;
}

function bookingStatus(value: string): BookingGroupStatus {
  const key = normalizeKey(value);
  if (key.includes("cancel")) return "cancelled";
  if (key.includes("modif")) return "modified";
  return "active";
}

function isHistorical(date: string): boolean {
  return !!date && date < "2026-01-01";
}

function sameTokenMatch(candidateName: string, alias: string): boolean {
  const candidateTokens = normalizeKey(candidateName).split(" ").filter(Boolean);
  const aliasTokens = normalizeKey(alias).split(" ").filter(Boolean);
  if (aliasTokens.length === 0) return false;
  return aliasTokens.every((token) => candidateTokens.includes(token));
}

function matchCaptain(calendarName: string, captains: ExistingCaptainOption[]) {
  const trimmed = calendarName.trim();
  if (!trimmed || trimmed.toLowerCase().startsWith("daybreak")) {
    return { captainId: "", captainName: "", reviewReason: "" };
  }

  if (trimmed.toLowerCase().startsWith("three seater")) {
    return { captainId: "", captainName: "", reviewReason: "Three Seater calendar is mapped without a captain link." };
  }

  const alias = trimmed.split(" - ")[0]?.trim() ?? "";
  if (!alias) {
    return { captainId: "", captainName: "", reviewReason: "Calendar name does not contain a captain alias." };
  }

  const exact = captains.filter((captain) => normalizeKey(captain.name) === normalizeKey(alias));
  const fuzzy = captains.filter((captain) => sameTokenMatch(captain.name, alias) || normalizeKey(alias).includes(normalizeKey(captain.name)) || normalizeKey(captain.name).includes(normalizeKey(alias)));
  const matches = exact.length > 0 ? exact : fuzzy;

  if (matches.length === 1) {
    return { captainId: matches[0].id, captainName: matches[0].name, reviewReason: "" };
  }

  if (matches.length > 1) {
    return { captainId: "", captainName: "", reviewReason: `Multiple captains match calendar alias ${alias}.` };
  }

  return { captainId: "", captainName: "", reviewReason: `No captain matched calendar alias ${alias}.` };
}

function matchBoat(calendarName: string, startDate: string, boats: ExistingBoatOption[]) {
  const trimmed = calendarName.trim();
  if (!trimmed) {
    return { boatId: "", boatName: "", reviewReason: "" };
  }

  if (trimmed.toLowerCase().startsWith("three seater")) {
    const fincat = boats.find((boat) => normalizeKey(boat.name).includes("fincat"));
    if (fincat) {
      return { boatId: fincat.id, boatName: fincat.name, reviewReason: "" };
    }
    return { boatId: "", boatName: "", reviewReason: "Three Seater rows should map to Fincat, but no Fincat boat record exists." };
  }

  if (isHistorical(startDate)) {
    return { boatId: "", boatName: "", reviewReason: "Historical pre-2026 booking; boat intentionally left unlinked." };
  }

  const matches = boats.filter((boat) => normalizeKey(trimmed).includes(normalizeKey(boat.name)) || normalizeKey(boat.name).includes(normalizeKey(trimmed)));
  if (matches.length === 1) {
    return { boatId: matches[0].id, boatName: matches[0].name, reviewReason: "" };
  }

  if (matches.length > 1) {
    return { boatId: "", boatName: "", reviewReason: "Multiple boats match the calendar name." };
  }

  return { boatId: "", boatName: "", reviewReason: startDate >= "2026-01-01" ? "Future booking has no boat match yet." : "" };
}

function matchTripType(tripOptions: string[], tripTypes: ExistingTripTypeOption[]) {
  if (tripOptions.length === 0) {
    return { tripTypeId: "", tripTypeName: "", sourceTripLabel: "", reviewReason: "" };
  }

  const sourceTripLabel = tripOptions[0];
  const aliases = tripOptions.flatMap((value) => {
    const key = normalizeKey(value);
    const next = [key];
    if (key.includes("long range")) next.push("long range");
    if (key.includes("shelf")) next.push("shelf");
    if (key.includes("14 hour")) next.push("14 hour");
    if (key.includes("10 hour")) next.push("10 hour");
    if (key.includes("36 hour")) next.push("36 hour");
    if (key.includes("overnight")) next.push("overnight");
    return next;
  });

  const matches = tripTypes.filter((tripType) => {
    const nameKey = normalizeKey(tripType.name);
    return aliases.some((alias) => alias && (nameKey.includes(alias) || alias.includes(nameKey)));
  });

  if (matches.length === 1) {
    return { tripTypeId: matches[0].id, tripTypeName: matches[0].name, sourceTripLabel, reviewReason: "" };
  }

  if (matches.length > 1) {
    return { tripTypeId: "", tripTypeName: "", sourceTripLabel, reviewReason: `Multiple trip types match ${sourceTripLabel}.` };
  }

  return { tripTypeId: "", tripTypeName: "", sourceTripLabel, reviewReason: `No current trip type matches historical label ${sourceTripLabel}.` };
}

function matchCustomer(row: WebsiteBookingCsvRow, customers: ExistingCustomerOption[]) {
  const byPhone = row.phone ? customers.filter((customer) => normalizePhone(customer.phone) === row.phone) : [];
  if (byPhone.length === 1) {
    return { customerId: byPhone[0].id, matchStatus: "matched" as const, reviewReason: "" };
  }
  if (byPhone.length > 1) {
    return { customerId: "", matchStatus: "review" as const, reviewReason: `Multiple customers match phone ${row.phone}.` };
  }

  const fullNameKey = normalizeName(row.fullName);
  const byName = fullNameKey ? customers.filter((customer) => normalizeName(customer.fullName) === fullNameKey || customer.additionalNames.some((name) => normalizeName(name) === fullNameKey)) : [];
  if (byName.length === 1) {
    return { customerId: byName[0].id, matchStatus: "matched" as const, reviewReason: "Matched by name fallback because phone did not match." };
  }
  if (byName.length > 1) {
    return { customerId: "", matchStatus: "review" as const, reviewReason: `Multiple customers match full name ${row.fullName}.` };
  }

  return { customerId: "", matchStatus: "review" as const, reviewReason: `No customer matched phone ${row.phone} or full name ${row.fullName}.` };
}

export function parseWebsiteBookingCsv(text: string): WebsiteBookingCsvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((value) => value.trim());
  const labels = {
    bookingId: firstMatch(header, ["Booking ID"]),
    bookingStatus: firstMatch(header, ["Booking Status"]),
    calendarId: firstMatch(header, ["Calendar ID"]),
    calendarName: firstMatch(header, ["Calendar Name"]),
    startDate: firstMatch(header, ["Start Date"]),
    endDate: firstMatch(header, ["End Date"]),
    dateCreated: firstMatch(header, ["Date Created"]),
    firstName: firstMatch(header, ["First Name"]),
    lastName: firstMatch(header, ["Last name", "Last Name"]),
    phone: firstMatch(header, ["Phone Number"]),
    email: firstMatch(header, ["Email"]),
    terms: firstMatch(header, ["Terms and Conditions"]),
    totalAmount: firstMatch(header, ["Total Amount"]),
    deposit: firstMatch(header, ["Deposit - Price"]),
    finalPayment: firstMatch(header, ["Final Payment - Price"]),
    guestsParty: firstMatch(header, ["How many guests are in your party?"]),
    guestsAboard: firstMatch(header, ["Please select the number of people coming aboard"]),
    shelfLongRange: firstMatch(header, ["Would you like a Shelf Trip or Long Range Trip"]),
    tenOrFourteenHour: firstMatch(header, ["Would you like 10 Hour or 14 Hour charter"]),
    oldTenOrFourteenHour: firstMatch(header, ["Would you like a 10 hour or 14 day charter?"]),
    halfOrFullDay: firstMatch(header, ["Would you like a half or full day charter?"]),
    selectFollowing22: firstMatch(header, ["Please select from the following: (ID:22)", "Please select from the following"]),
    selectFollowing27: firstMatch(header, ["Please select from the following: (ID:27)", "Please select from the following"]),
  };

  return rows.slice(1).map((row, index) => {
    const raw = {
      bookingId: getValue(row, header, labels.bookingId),
      bookingStatus: getValue(row, header, labels.bookingStatus),
      calendarId: getValue(row, header, labels.calendarId),
      calendarName: getValue(row, header, labels.calendarName),
      startDate: getValue(row, header, labels.startDate),
      endDate: getValue(row, header, labels.endDate),
      dateCreated: getValue(row, header, labels.dateCreated),
      firstName: getValue(row, header, labels.firstName),
      lastName: getValue(row, header, labels.lastName),
      phone: getValue(row, header, labels.phone),
      email: getValue(row, header, labels.email),
      terms: getValue(row, header, labels.terms),
      totalAmount: getValue(row, header, labels.totalAmount),
      deposit: getValue(row, header, labels.deposit),
      finalPayment: getValue(row, header, labels.finalPayment),
      guestsParty: getValue(row, header, labels.guestsParty),
      guestsAboard: getValue(row, header, labels.guestsAboard),
      shelfLongRange: getValue(row, header, labels.shelfLongRange),
      tenOrFourteenHour: getValue(row, header, labels.tenOrFourteenHour),
      oldTenOrFourteenHour: getValue(row, header, labels.oldTenOrFourteenHour),
      halfOrFullDay: getValue(row, header, labels.halfOrFullDay),
      selectFollowing22: getValue(row, header, labels.selectFollowing22),
      selectFollowing27: getValue(row, header, labels.selectFollowing27),
    };

    const firstName = cleanCell(raw.firstName);
    const lastName = cleanCell(raw.lastName);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const tripOptions = collectOptionValues(raw);
    const sourceGuestCount = cleanCell(raw.guestsAboard) || cleanCell(raw.guestsParty);
    const calendarName = cleanCell(raw.calendarName);

    return {
      sourceRowNumber: index + 2,
      raw: Object.fromEntries(header.map((key, headerIndex) => [key, row[headerIndex] ?? ""])),
      bookingId: cleanCell(raw.bookingId),
      bookingStatus: cleanCell(raw.bookingStatus),
      calendarId: cleanCell(raw.calendarId),
      calendarName,
      startDate: cleanCell(raw.startDate),
      endDate: cleanCell(raw.endDate),
      dateCreated: cleanCell(raw.dateCreated),
      firstName,
      lastName,
      fullName,
      phone: normalizePhone(cleanCell(raw.phone)),
      email: cleanCell(raw.email).toLowerCase(),
      termsAccepted: cleanCell(raw.terms).length > 0,
      totalAmount: parseMoney(raw.totalAmount),
      depositPaid: parseMoney(raw.deposit),
      remainingPaymentDue: parseMoney(raw.finalPayment),
      guestCount: parseCount(sourceGuestCount),
      sourceGuestCount,
      tripLabel: tripOptions[0] ?? "",
      tripOptions,
      rowType: calendarName.toLowerCase().startsWith("daybreak") ? "lodge" : "fishing",
    } satisfies WebsiteBookingCsvRow;
  }).filter((row) => row.bookingId || row.calendarName || row.fullName);
}

export function buildWebsiteBookingPreviewRows(
  rows: WebsiteBookingCsvRow[],
  context: {
    customers: ExistingCustomerOption[];
    captains: ExistingCaptainOption[];
    boats: ExistingBoatOption[];
    tripTypes: ExistingTripTypeOption[];
  },
): WebsiteBookingPreviewRow[] {
  return rows.map((row) => {
    if (row.rowType !== "fishing") {
      return {
        sourceRowNumber: row.sourceRowNumber,
        externalBookingGroupId: row.bookingId,
        rowType: row.rowType,
        rowStatus: "skipped",
        reviewReason: "Lodge rows are preserved for later lodge import and skipped by this fishing import.",
        bookingStatus: bookingStatus(row.bookingStatus),
        customerId: "",
        customerMatchStatus: "unresolved",
        customerNameSnapshot: row.fullName,
        customerPhoneSnapshot: row.phone,
        customerEmailSnapshot: row.email,
        matchedCaptainId: "",
        matchedCaptainName: "",
        matchedBoatId: "",
        matchedBoatName: "",
        matchedTripTypeId: "",
        matchedTripTypeName: "",
        sourceCalendarId: row.calendarId,
        sourceCalendarName: row.calendarName,
        sourceTripLabel: row.tripLabel,
        startDate: row.startDate,
        endDate: row.endDate,
        guestCount: row.guestCount,
        termsAccepted: row.termsAccepted,
        totalAmount: row.totalAmount,
        depositPaid: row.depositPaid,
        remainingPaymentDue: row.remainingPaymentDue,
        rawRow: row,
      };
    }

    const customer = matchCustomer(row, context.customers);
    const captain = matchCaptain(row.calendarName, context.captains);
    const boat = matchBoat(row.calendarName, row.startDate, context.boats);
    const tripType = matchTripType(row.tripOptions, context.tripTypes);

    const reasons = [customer.reviewReason, captain.reviewReason, boat.reviewReason, tripType.reviewReason].filter(Boolean);
    const rowStatus: BookingImportRowStatus = customer.matchStatus === "review" || reasons.length > 0 ? "review" : "ready";

    return {
      sourceRowNumber: row.sourceRowNumber,
      externalBookingGroupId: row.bookingId,
      rowType: row.rowType,
      rowStatus,
      reviewReason: reasons.join(" "),
      bookingStatus: bookingStatus(row.bookingStatus),
      customerId: customer.customerId,
      customerMatchStatus: customer.matchStatus,
      customerNameSnapshot: row.fullName,
      customerPhoneSnapshot: row.phone,
      customerEmailSnapshot: row.email,
      matchedCaptainId: captain.captainId,
      matchedCaptainName: captain.captainName,
      matchedBoatId: boat.boatId,
      matchedBoatName: boat.boatName,
      matchedTripTypeId: tripType.tripTypeId,
      matchedTripTypeName: tripType.tripTypeName,
      sourceCalendarId: row.calendarId,
      sourceCalendarName: row.calendarName,
      sourceTripLabel: tripType.sourceTripLabel,
      startDate: row.startDate,
      endDate: row.endDate,
      guestCount: row.guestCount,
      termsAccepted: row.termsAccepted,
      totalAmount: row.totalAmount,
      depositPaid: row.depositPaid,
      remainingPaymentDue: row.remainingPaymentDue,
      rawRow: row,
    };
  });
}