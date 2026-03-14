"use client";

import Link from "next/link";
import React from "react";
import { collection, doc, getDocs, serverTimestamp, writeBatch } from "firebase/firestore";

import {
  appendAdditionalEmail,
  appendAdditionalName,
  appendAdditionalPhone,
  clearCustomersCache,
  customerDocPath,
  CustomerListItem,
  CustomerRecord,
  customersCollectionPath,
  hydrateCustomerRecord,
  normalizeAdditionalEmails,
  normalizeAdditionalNames,
  normalizeAdditionalPhones,
  normalizeMergeIgnoreKeys,
  sanitizeCustomerEmailFields,
  sanitizeCustomerPhoneFields,
} from "@/lib/admin/customers";
import { db } from "@/lib/firebase/client";

type DuplicateGroup = {
  key: string;
  type: "email" | "name" | "phone";
  label: string;
  customerIds: string[];
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

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildGroups(customers: CustomerListItem[], type: DuplicateGroup["type"]): DuplicateGroup[] {
  const map = new Map<string, Set<string>>();

  for (const customer of customers) {
    if (customer.status === "merged") continue;

    let values: string[] = [];
    if (type === "email") values = [customer.email, ...customer.additionalEmails];
    if (type === "phone") values = [customer.phone, ...customer.additionalPhones];
    if (type === "name") values = [customer.fullName, ...customer.additionalNames];

    for (const value of values) {
      const normalized = normalizeKey(value);
      if (!normalized) continue;
      const next = map.get(normalized) ?? new Set<string>();
      next.add(customer.id);
      map.set(normalized, next);
    }
  }

  return Array.from(map.entries())
    .filter(([, ids]) => ids.size > 1)
    .map(([label, ids]) => ({
      key: `${type}:${label}`,
      type,
      label,
      customerIds: Array.from(ids),
    }))
    .filter((group) => {
      const participants = group.customerIds
        .map((id) => customers.find((customer) => customer.id === id))
        .filter(Boolean) as CustomerListItem[];

      return !participants.every((customer) => customer.mergeIgnoreKeys.includes(group.key));
    })
    .sort((a, b) => b.customerIds.length - a.customerIds.length || a.label.localeCompare(b.label));
}

function chooseMatchStatus(customers: CustomerListItem[]): CustomerRecord["customerMatchStatus"] {
  if (customers.some((customer) => customer.customerMatchStatus === "matched")) return "matched";
  if (customers.some((customer) => customer.customerMatchStatus === "review")) return "review";
  if (customers.some((customer) => customer.customerMatchStatus === "new")) return "new";
  return "unresolved";
}

export default function CustomerMergePage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null);
  const [customers, setCustomers] = React.useState<CustomerListItem[]>([]);
  const [primaryByGroup, setPrimaryByGroup] = React.useState<Record<string, string>>({});
  const [processingGroupKey, setProcessingGroupKey] = React.useState<string | null>(null);
  const [purgingContacts, setPurgingContacts] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const snapshot = await getDocs(collection(db, ...customersCollectionPath));
        if (cancelled) return;
        setCustomers(snapshot.docs.map((docSnap) => hydrateCustomerRecord(docSnap.id, docSnap.data() as Partial<CustomerRecord>)));
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const emailGroups = React.useMemo(() => buildGroups(customers, "email"), [customers]);
  const nameGroups = React.useMemo(() => buildGroups(customers, "name"), [customers]);
  const phoneGroups = React.useMemo(() => buildGroups(customers, "phone"), [customers]);

  React.useEffect(() => {
    const defaults: Record<string, string> = {};
    for (const group of [...emailGroups, ...nameGroups, ...phoneGroups]) {
      defaults[group.key] = primaryByGroup[group.key] ?? group.customerIds[0] ?? "";
    }
    setPrimaryByGroup((prev) => ({ ...defaults, ...prev }));
  }, [emailGroups, nameGroups, phoneGroups]);

  async function mergeGroup(group: DuplicateGroup) {
    const selectedPrimaryId = primaryByGroup[group.key];
    const groupCustomers = group.customerIds
      .map((id) => customers.find((customer) => customer.id === id))
      .filter(Boolean) as CustomerListItem[];

    const primary = groupCustomers.find((customer) => customer.id === selectedPrimaryId) ?? groupCustomers[0];
    if (!primary) {
      setStatusMessage("No primary customer selected.");
      return;
    }

    const others = groupCustomers.filter((customer) => customer.id !== primary.id);
    if (others.length === 0) {
      setStatusMessage("That group only has one active customer left.");
      return;
    }

    setProcessingGroupKey(group.key);
    setStatusMessage(null);

    try {
      let fullName = primary.fullName;
      let email = primary.email;
      let phone = primary.phone;
      let additionalNames = normalizeAdditionalNames(primary.additionalNames);
      let additionalEmails = normalizeAdditionalEmails(primary.additionalEmails);
      let additionalPhones = normalizeAdditionalPhones(primary.additionalPhones);
      let mergeIgnoreKeys = normalizeMergeIgnoreKeys(primary.mergeIgnoreKeys).filter((key) => key !== group.key);
      let squareCustomerId = primary.squareCustomerId;
      let websiteCustomerId = primary.websiteCustomerId;
      let source = primary.source;
      let status: CustomerRecord["status"] = primary.status === "merged" ? "active" : primary.status;

      for (const other of others) {
        if (!fullName && other.fullName) {
          fullName = other.fullName;
        } else if (other.fullName && normalizeKey(other.fullName) !== normalizeKey(fullName)) {
          additionalNames = appendAdditionalName(additionalNames, other.fullName);
        }

        for (const name of other.additionalNames) {
          if (normalizeKey(name) !== normalizeKey(fullName)) {
            additionalNames = appendAdditionalName(additionalNames, name);
          }
        }

        if (!email && other.email) {
          email = other.email;
        } else if (other.email && normalizeKey(other.email) !== normalizeKey(email)) {
          additionalEmails = appendAdditionalEmail(additionalEmails, other.email);
        }

        for (const alias of other.additionalEmails) {
          if (normalizeKey(alias) !== normalizeKey(email)) {
            additionalEmails = appendAdditionalEmail(additionalEmails, alias);
          }
        }

        if (!phone && other.phone) {
          phone = other.phone;
        } else if (other.phone && other.phone !== phone) {
          additionalPhones = appendAdditionalPhone(additionalPhones, other.phone);
        }

        for (const alias of other.additionalPhones) {
          if (alias !== phone) {
            additionalPhones = appendAdditionalPhone(additionalPhones, alias);
          }
        }

        mergeIgnoreKeys = normalizeMergeIgnoreKeys([...mergeIgnoreKeys, ...other.mergeIgnoreKeys].filter((key) => key !== group.key));

        if (!squareCustomerId && other.squareCustomerId) squareCustomerId = other.squareCustomerId;
        if (!websiteCustomerId && other.websiteCustomerId) websiteCustomerId = other.websiteCustomerId;
        if (source === "manual" && other.source !== "manual") source = other.source;
        if (status !== "active" && other.status === "active") status = "active";
      }

      const emailFields = sanitizeCustomerEmailFields(email, additionalEmails);
      const phoneFields = sanitizeCustomerPhoneFields(phone, additionalPhones);
      email = emailFields.email;
      additionalEmails = emailFields.additionalEmails;
      phone = phoneFields.phone;
      additionalPhones = phoneFields.additionalPhones;
      additionalNames = additionalNames.filter((value) => normalizeKey(value) !== normalizeKey(fullName));

      const mergedCustomerStatus = chooseMatchStatus([primary, ...others]);
      const batch = writeBatch(db);

      batch.set(
        doc(db, ...customerDocPath(primary.id)),
        {
          fullName,
          fullNameLower: fullName.toLowerCase(),
          additionalNames,
          email,
          additionalEmails,
          phone,
          additionalPhones,
          mergeIgnoreKeys,
          source,
          squareCustomerId,
          websiteCustomerId,
          customerMatchStatus: mergedCustomerStatus,
          status,
          mergedIntoCustomerId: "",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      for (const other of others) {
        batch.set(
          doc(db, ...customerDocPath(other.id)),
          {
            status: "merged",
            mergedIntoCustomerId: primary.id,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();
      clearCustomersCache();

      setCustomers((prev) => prev.map((customer) => {
        if (customer.id === primary.id) {
          return {
            ...customer,
            fullName,
            fullNameLower: fullName.toLowerCase(),
            additionalNames,
            email,
            additionalEmails,
            phone,
            additionalPhones,
            mergeIgnoreKeys,
            source,
            squareCustomerId,
            websiteCustomerId,
            customerMatchStatus: mergedCustomerStatus,
            status,
            mergedIntoCustomerId: "",
          };
        }

        if (others.some((other) => other.id === customer.id)) {
          return {
            ...customer,
            status: "merged",
            mergedIntoCustomerId: primary.id,
          };
        }

        return customer;
      }));

      setStatusMessage(`Merged ${others.length} customer record${others.length === 1 ? "" : "s"} into ${fullName || "primary customer"}.`);
    } catch (mergeError) {
      setStatusMessage(`Merge failed: ${errorMessage(mergeError)}`);
    } finally {
      setProcessingGroupKey(null);
    }
  }

  async function purgeBlockedContacts() {
    setPurgingContacts(true);
    setStatusMessage(null);

    try {
      const chunkSize = 350;
      for (let index = 0; index < customers.length; index += chunkSize) {
        const batch = writeBatch(db);
        for (const customer of customers.slice(index, index + chunkSize)) {
          batch.set(
            doc(db, ...customerDocPath(customer.id)),
            {
              email: customer.email,
              additionalEmails: customer.additionalEmails,
              phone: customer.phone,
              additionalPhones: customer.additionalPhones,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
        await batch.commit();
      }

      clearCustomersCache();
      setStatusMessage("Purged blocked captain email and phone values from current customer records.");
    } catch (purgeError) {
      setStatusMessage(`Purge failed: ${errorMessage(purgeError)}`);
    } finally {
      setPurgingContacts(false);
    }
  }

  async function ignoreGroup(group: DuplicateGroup) {
    const groupCustomers = group.customerIds
      .map((id) => customers.find((customer) => customer.id === id))
      .filter(Boolean) as CustomerListItem[];

    if (groupCustomers.length === 0) {
      setStatusMessage("No customers found for that duplicate group.");
      return;
    }

    setProcessingGroupKey(group.key);
    setStatusMessage(null);

    try {
      const batch = writeBatch(db);

      for (const customer of groupCustomers) {
        const mergeIgnoreKeys = normalizeMergeIgnoreKeys([...customer.mergeIgnoreKeys, group.key]);
        batch.set(
          doc(db, ...customerDocPath(customer.id)),
          {
            mergeIgnoreKeys,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      await batch.commit();
      clearCustomersCache();

      setCustomers((prev) => prev.map((customer) => {
        if (!group.customerIds.includes(customer.id)) return customer;
        return {
          ...customer,
          mergeIgnoreKeys: normalizeMergeIgnoreKeys([...customer.mergeIgnoreKeys, group.key]),
        };
      }));

      setStatusMessage(`Marked ${group.label} to stay separate.`);
    } catch (ignoreError) {
      setStatusMessage(`Could not update duplicate group: ${errorMessage(ignoreError)}`);
    } finally {
      setProcessingGroupKey(null);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <section className="rounded-[32px] bg-[#f8fafc] px-5 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Customers</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Merge Customers</div>
            <div className="mt-3 max-w-3xl text-sm text-slate-500">
              Review duplicate names, emails, and phone numbers. Choose one primary customer, then merge the others into it so booking imports can match against a cleaner customer record.
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={purgeBlockedContacts}
              disabled={purgingContacts || loading}
              className="inline-flex h-12 items-center rounded-2xl border border-amber-200 bg-amber-50 px-5 text-sm font-semibold text-amber-900 shadow-sm transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-60"
            >
              {purgingContacts ? "Purging..." : "Purge Captain Contacts"}
            </button>
            <Link href="/admin/customers" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50">
              Back To Customers
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Matched Emails" value={String(emailGroups.length)} />
          <StatCard label="Matched Names" value={String(nameGroups.length)} />
          <StatCard label="Matched Phones" value={String(phoneGroups.length)} />
        </div>

        {statusMessage ? <div className="mt-5 text-sm text-slate-500">{statusMessage}</div> : null}
        {error ? <div className="mt-5 text-sm text-rose-600">Failed to load customers: {error}</div> : null}
      </section>

      <GroupSection
        title="Matched Emails"
        description="Customers sharing the same primary or additional email address."
        groups={emailGroups}
        customers={customers}
        primaryByGroup={primaryByGroup}
        setPrimaryByGroup={setPrimaryByGroup}
        onMerge={mergeGroup}
        onIgnore={ignoreGroup}
        loading={loading}
        processingGroupKey={processingGroupKey}
      />

      <GroupSection
        title="Matched Names"
        description="Customers sharing the same full name or additional name alias."
        groups={nameGroups}
        customers={customers}
        primaryByGroup={primaryByGroup}
        setPrimaryByGroup={setPrimaryByGroup}
        onMerge={mergeGroup}
        onIgnore={ignoreGroup}
        loading={loading}
        processingGroupKey={processingGroupKey}
      />

      <GroupSection
        title="Matched Phones"
        description="Customers sharing the same primary or additional phone number."
        groups={phoneGroups}
        customers={customers}
        primaryByGroup={primaryByGroup}
        setPrimaryByGroup={setPrimaryByGroup}
        onMerge={mergeGroup}
        onIgnore={ignoreGroup}
        loading={loading}
        processingGroupKey={processingGroupKey}
      />
    </div>
  );
}

function GroupSection(props: {
  title: string;
  description: string;
  groups: DuplicateGroup[];
  customers: CustomerListItem[];
  primaryByGroup: Record<string, string>;
  setPrimaryByGroup: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onMerge: (group: DuplicateGroup) => void;
  onIgnore: (group: DuplicateGroup) => void;
  loading: boolean;
  processingGroupKey: string | null;
}) {
  return (
    <section className="rounded-[32px] bg-[#f8fafc] shadow-[0_24px_80px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/80">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-8">
        <div className="text-lg font-semibold text-slate-900">{props.title}</div>
        <div className="mt-1 text-sm text-slate-500">{props.description}</div>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-6 lg:px-8">
        {props.loading ? (
          <div className="text-sm text-slate-500">Loading duplicate groups...</div>
        ) : props.groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">No duplicate groups found.</div>
        ) : (
          props.groups.map((group) => {
            const groupCustomers = group.customerIds
              .map((id) => props.customers.find((customer) => customer.id === id))
              .filter(Boolean) as CustomerListItem[];
            const selectedPrimaryId = props.primaryByGroup[group.key] ?? group.customerIds[0] ?? "";

            return (
              <div key={group.key} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{group.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{group.type}</div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <label className="text-sm text-slate-500">
                      <span className="mr-2">Primary</span>
                      <select
                        value={selectedPrimaryId}
                        onChange={(event) => props.setPrimaryByGroup((prev) => ({ ...prev, [group.key]: event.target.value }))}
                        className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none"
                      >
                        {groupCustomers.map((customer) => (
                          <option key={customer.id} value={customer.id}>{customer.fullName || customer.id}</option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={() => props.onIgnore(group)}
                      disabled={props.processingGroupKey === group.key}
                      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {props.processingGroupKey === group.key ? "Working..." : "Don't Resolve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => props.onMerge(group)}
                      disabled={props.processingGroupKey === group.key}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#d8a641] px-4 text-sm font-semibold text-slate-900 shadow-[0_12px_24px_rgba(216,166,65,0.26)] transition hover:bg-[#c9922a] disabled:opacity-60"
                    >
                      {props.processingGroupKey === group.key ? "Working..." : "Merge Into Primary"}
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {groupCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{customer.fullName || "Unnamed customer"}</div>
                          <div className="mt-1 text-xs text-slate-500">{customer.id}</div>
                        </div>
                        <span className={["inline-flex rounded-full px-3 py-1 text-xs font-semibold", customer.status === "merged" ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"].join(" ")}>{customer.status}</span>
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-slate-600">
                        <div>Email: {customer.email || customer.additionalEmails[0] || "-"}</div>
                        <div>Phone: {customer.phone || customer.additionalPhones[0] || "-"}</div>
                        <div>Source: {customer.source}</div>
                        {customer.additionalNames.length > 0 ? <div>Additional names: {customer.additionalNames.join(", ")}</div> : null}
                        {customer.additionalEmails.length > 0 ? <div>Additional emails: {customer.additionalEmails.join(", ")}</div> : null}
                        {customer.additionalPhones.length > 0 ? <div>Additional phones: {customer.additionalPhones.join(", ")}</div> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function StatCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}
