import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const BLOCKED_EMAILS = new Set([
  "joeymaciasz22@gmail.com",
  "owenbelknap@gmail.com",
]);

const BLOCKED_PHONES = new Set([
  "2256504039",
  "3189572339",
]);

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  }
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D+/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

function normalizeArray(value, normalize) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const next = [];
  for (const item of value) {
    const normalized = normalize(item);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    next.push(normalized);
  }
  return next;
}

function sanitizeEmailFields(primaryValue, additionalValues) {
  let email = normalizeEmail(primaryValue);
  let additionalEmails = normalizeArray(additionalValues, normalizeEmail).filter((value) => !BLOCKED_EMAILS.has(value));

  if (BLOCKED_EMAILS.has(email)) {
    email = "";
  }

  additionalEmails = additionalEmails.filter((value) => value !== email);

  if (!email && additionalEmails.length > 0) {
    email = additionalEmails[0];
    additionalEmails = additionalEmails.slice(1);
  }

  return { email, additionalEmails };
}

function sanitizePhoneFields(primaryValue, additionalValues) {
  let phone = normalizePhone(primaryValue);
  let additionalPhones = normalizeArray(additionalValues, normalizePhone).filter((value) => !BLOCKED_PHONES.has(value));

  if (BLOCKED_PHONES.has(phone)) {
    phone = "";
  }

  additionalPhones = additionalPhones.filter((value) => value !== phone);

  if (!phone && additionalPhones.length > 0) {
    phone = additionalPhones[0];
    additionalPhones = additionalPhones.slice(1);
  }

  return { phone, additionalPhones };
}

async function main() {
  loadEnvFile();

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. Expected it in .env.local or environment.");
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: applicationDefault(),
        projectId,
      });

  const db = getFirestore(app);
  const snapshot = await db.collection("admin").doc("data").collection("customers").get();

  let changed = 0;
  let touchedEmails = 0;
  let touchedPhones = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() ?? {};
    const emailFields = sanitizeEmailFields(data.email ?? "", data.additionalEmails ?? []);
    const phoneFields = sanitizePhoneFields(data.phone ?? "", data.additionalPhones ?? []);

    const emailChanged = normalizeEmail(data.email ?? "") !== emailFields.email
      || JSON.stringify(normalizeArray(data.additionalEmails ?? [], normalizeEmail)) !== JSON.stringify(emailFields.additionalEmails);
    const phoneChanged = normalizePhone(data.phone ?? "") !== phoneFields.phone
      || JSON.stringify(normalizeArray(data.additionalPhones ?? [], normalizePhone)) !== JSON.stringify(phoneFields.additionalPhones);

    if (!emailChanged && !phoneChanged) {
      continue;
    }

    changed += 1;
    if (emailChanged) touchedEmails += 1;
    if (phoneChanged) touchedPhones += 1;

    batch.set(docSnap.ref, {
      email: emailFields.email,
      additionalEmails: emailFields.additionalEmails,
      phone: phoneFields.phone,
      additionalPhones: phoneFields.additionalPhones,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batchCount += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(JSON.stringify({
    checked: snapshot.size,
    changed,
    touchedEmails,
    touchedPhones,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
