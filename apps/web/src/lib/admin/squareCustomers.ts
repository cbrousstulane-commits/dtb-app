import {
  appendAdditionalName,
  CustomerMatchStatus,
  CustomerRecord,
  normalizeAdditionalEmails,
  normalizeAdditionalNames,
  normalizeAdditionalPhones,
  normalizePhone,
} from "@/lib/admin/customers";

export type SquareImportRunStatus = "pending" | "completed" | "failed";
export type SquareImportRowStatus = "matched" | "created" | "review" | "skipped" | "failed";

export type SquareCustomerImportRunRecord = {
  source: "square-csv";
  sourceFileName: string;
  sourceFileChecksum: string;
  status: SquareImportRunStatus;
  rowCount: number;
  matchedCount: number;
  createdCount: number;
  reviewCount: number;
  skippedCount: number;
  failedCount: number;
  startedAt?: unknown;
  completedAt?: unknown;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SquareCustomerImportRowRecord = {
  source: "square-csv";
  importRunId: string;
  sourceRowNumber: number;
  squareCustomerId: string;
  givenName: string;
  familyName: string;
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  rawImportReference: string;
  matchStatus: CustomerMatchStatus;
  rowStatus: SquareImportRowStatus;
  matchedCustomerId: string;
  reviewReason: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SquareCustomerCsvRow = {
  referenceId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nickname: string;
  companyName: string;
  memo: string;
  squareCustomerId: string;
  creationSource: string;
};

export type SquareCustomerPreviewRow = {
  sourceRowNumber: number;
  squareCustomerId: string;
  fullName: string;
  email: string;
  phone: string;
  matchStatus: CustomerMatchStatus;
  rowStatus: SquareImportRowStatus;
  matchedCustomerId: string;
  reviewReason: string;
  additionalNames: string[];
  rawRow: SquareCustomerCsvRow;
};

export const squareCustomerImportRunsCollectionPath = ["admin", "data", "squareCustomerImportRuns"] as const;
export const squareCustomerImportRowsCollectionPath = ["admin", "data", "squareCustomerImportRows"] as const;

export function squareCustomerImportRunDocPath(importRunId: string) {
  return [...squareCustomerImportRunsCollectionPath, importRunId] as const;
}

export function squareCustomerImportRowDocPath(rowId: string) {
  return [...squareCustomerImportRowsCollectionPath, rowId] as const;
}

export function emptySquareCustomerImportRun(): SquareCustomerImportRunRecord {
  return {
    source: "square-csv",
    sourceFileName: "",
    sourceFileChecksum: "",
    status: "pending",
    rowCount: 0,
    matchedCount: 0,
    createdCount: 0,
    reviewCount: 0,
    skippedCount: 0,
    failedCount: 0,
    notes: "",
  };
}

export function emptySquareCustomerImportRow(): SquareCustomerImportRowRecord {
  return {
    source: "square-csv",
    importRunId: "",
    sourceRowNumber: 0,
    squareCustomerId: "",
    givenName: "",
    familyName: "",
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    rawImportReference: "",
    matchStatus: "unresolved",
    rowStatus: "skipped",
    matchedCustomerId: "",
    reviewReason: "",
  };
}

export function normalizeSquareEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeSquarePhone(value: string) {
  return normalizePhone(value.replace(/^'+/, "").trim());
}

export function buildSquareFullName(row: Pick<SquareCustomerCsvRow, "firstName" | "lastName">) {
  return [row.firstName.trim(), row.lastName.trim()].filter(Boolean).join(" ").trim();
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      currentRow.push(currentValue);
      currentValue = "";

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseSquareCustomerCsv(text: string): SquareCustomerCsvRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((value) => value.trim());
  const indexOf = (label: string) => header.indexOf(label);

  const getValue = (row: string[], label: string) => {
    const index = indexOf(label);
    return index >= 0 ? (row[index] ?? "").trim() : "";
  };

  return rows.slice(1).map((row) => {
    const draft: SquareCustomerCsvRow = {
      referenceId: getValue(row, "Reference ID"),
      firstName: getValue(row, "First Name"),
      lastName: getValue(row, "Last Name"),
      email: normalizeSquareEmail(getValue(row, "Email Address")),
      phone: normalizeSquarePhone(getValue(row, "Phone Number")),
      nickname: getValue(row, "Nickname"),
      companyName: getValue(row, "Company Name"),
      memo: getValue(row, "Memo"),
      squareCustomerId: getValue(row, "Square Customer ID"),
      creationSource: getValue(row, "Creation Source"),
    };

    return {
      ...draft,
      fullName: buildSquareFullName(draft),
    } as SquareCustomerCsvRow & { fullName?: string };
  }).map((row) => ({
    referenceId: row.referenceId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    nickname: row.nickname,
    companyName: row.companyName,
    memo: row.memo,
    squareCustomerId: row.squareCustomerId,
    creationSource: row.creationSource,
  }));
}

export function rowFullName(row: SquareCustomerCsvRow) {
  return buildSquareFullName(row);
}

function lastNameKey(value: string) {
  return value.trim().toLowerCase();
}

export function collectAdditionalNames(row: SquareCustomerCsvRow, customer?: Partial<CustomerRecord> | null) {
  let next = normalizeAdditionalNames(customer?.additionalNames);
  const candidates = [rowFullName(row), row.nickname, row.companyName].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    if (trimmed.toLowerCase() === (customer?.fullName ?? "").trim().toLowerCase()) continue;
    next = appendAdditionalName(next, trimmed);
  }

  return next;
}

export function buildSquarePreviewRows(
  rows: SquareCustomerCsvRow[],
  customers: Array<CustomerRecord & { id: string }>,
): SquareCustomerPreviewRow[] {
  const bySquareId = new Map<string, Array<CustomerRecord & { id: string }>>();
  const byEmail = new Map<string, Array<CustomerRecord & { id: string }>>();
  const byPhone = new Map<string, Array<CustomerRecord & { id: string }>>();
  const byLastName = new Map<string, Array<CustomerRecord & { id: string }>>();

  for (const customer of customers) {
    if (customer.squareCustomerId) {
      const next = bySquareId.get(customer.squareCustomerId) ?? [];
      next.push(customer);
      bySquareId.set(customer.squareCustomerId, next);
    }
    for (const email of [customer.email, ...normalizeAdditionalEmails(customer.additionalEmails)]) {
      if (!email) continue;
      const next = byEmail.get(email) ?? [];
      next.push(customer);
      byEmail.set(email, next);
    }
    for (const phone of [customer.phone, ...normalizeAdditionalPhones(customer.additionalPhones)]) {
      if (!phone) continue;
      const next = byPhone.get(phone) ?? [];
      next.push(customer);
      byPhone.set(phone, next);
    }
    const lastName = lastNameKey(customer.fullName.split(" ").slice(-1)[0] ?? "");
    if (lastName) {
      const next = byLastName.get(lastName) ?? [];
      next.push(customer);
      byLastName.set(lastName, next);
    }
  }

  return rows.map((row, index) => {
    const fullName = rowFullName(row);
    const squareMatches = row.squareCustomerId ? bySquareId.get(row.squareCustomerId) ?? [] : [];
    const emailMatches = row.email ? byEmail.get(row.email) ?? [] : [];
    const phoneMatches = row.phone ? byPhone.get(row.phone) ?? [] : [];
    const lastNameMatches = row.lastName ? byLastName.get(lastNameKey(row.lastName)) ?? [] : [];

    const stableMatches = squareMatches.length > 0 ? squareMatches : emailMatches.length > 0 ? emailMatches : phoneMatches;

    if (stableMatches.length === 1) {
      const matched = stableMatches[0];
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "matched" as const,
        rowStatus: "matched" as const,
        matchedCustomerId: matched.id,
        reviewReason: "",
        additionalNames: collectAdditionalNames(row, matched),
        rawRow: row,
      };
    }

    if (stableMatches.length > 1) {
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "review" as const,
        rowStatus: "review" as const,
        matchedCustomerId: "",
        reviewReason: "Multiple existing customers match the same stable identifier.",
        additionalNames: [],
        rawRow: row,
      };
    }

    if (!row.email && !row.phone && lastNameMatches.length > 0) {
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "review" as const,
        rowStatus: "review" as const,
        matchedCustomerId: "",
        reviewReason: "Last name matches an existing customer but email/phone do not.",
        additionalNames: [],
        rawRow: row,
      };
    }

    if (!row.email && !row.phone && !fullName) {
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "unresolved" as const,
        rowStatus: "skipped" as const,
        matchedCustomerId: "",
        reviewReason: "Row does not contain usable identity fields.",
        additionalNames: [],
        rawRow: row,
      };
    }

    if (!row.email && !row.phone && lastNameMatches.length === 0) {
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "new" as const,
        rowStatus: "created" as const,
        matchedCustomerId: "",
        reviewReason: "",
        additionalNames: collectAdditionalNames(row),
        rawRow: row,
      };
    }

    if (lastNameMatches.length > 0 && !row.email && !row.phone) {
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "review" as const,
        rowStatus: "review" as const,
        matchedCustomerId: "",
        reviewReason: "Last name matches an existing customer but email/phone do not.",
        additionalNames: [],
        rawRow: row,
      };
    }

    if (lastNameMatches.length > 0 && !emailMatches.length && !phoneMatches.length) {
      return {
        sourceRowNumber: index + 2,
        squareCustomerId: row.squareCustomerId,
        fullName,
        email: row.email,
        phone: row.phone,
        matchStatus: "review" as const,
        rowStatus: "review" as const,
        matchedCustomerId: "",
        reviewReason: "Last name matches an existing customer but email/phone do not.",
        additionalNames: [],
        rawRow: row,
      };
    }

    return {
      sourceRowNumber: index + 2,
      squareCustomerId: row.squareCustomerId,
      fullName,
      email: row.email,
      phone: row.phone,
      matchStatus: "new" as const,
      rowStatus: "created" as const,
      matchedCustomerId: "",
      reviewReason: "",
      additionalNames: collectAdditionalNames(row),
      rawRow: row,
    };
  });
}