import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { buildManagedAccessClaims, mergeManagedAccessClaims } from "@/lib/auth/access";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

type CaptainMatch = {
  id: string;
  adminAccess: boolean;
  authUid: string;
};

type AccessUserMatch = {
  id: string;
  role: "user" | "admin";
  authUid: string;
};

function normalizeNextPath(value: unknown) {
  if (typeof value !== "string") return "/admin";
  return value.startsWith("/") ? value : "/admin";
}

async function findCaptainByEmail(email: string): Promise<CaptainMatch | null> {
  const snapshot = await adminDb
    .collection("admin")
    .doc("data")
    .collection("captains")
    .where("email", "==", email)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    id: docSnap.id,
    adminAccess: data.adminAccess === true,
    authUid: typeof data.authUid === "string" ? data.authUid : "",
  };
}

async function findAccessUserByEmail(email: string): Promise<AccessUserMatch | null> {
  const snapshot = await adminDb
    .collection("admin")
    .doc("data")
    .collection("accessUsers")
    .where("email", "==", email)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const docSnap = snapshot.docs[0];
  const data = docSnap.data();

  return {
    id: docSnap.id,
    role: data.role === "admin" ? "admin" : "user",
    authUid: typeof data.authUid === "string" ? data.authUid : "",
  };
}

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing bearer token." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { nextPath?: string };
    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Signed-in Google account is missing an email address." }, { status: 400 });
    }

    const [captainMatch, accessUserMatch, userRecord] = await Promise.all([
      findCaptainByEmail(email),
      findAccessUserByEmail(email),
      adminAuth.getUser(decoded.uid),
    ]);

    const effectiveRole = captainMatch
      ? captainMatch.adminAccess
        ? "admin"
        : "captain"
      : accessUserMatch
        ? accessUserMatch.role
        : "none";

    const managedClaims = buildManagedAccessClaims({
      role: effectiveRole,
      captainId: captainMatch?.id,
      accessUserId: accessUserMatch?.id,
    });

    const nextClaims = mergeManagedAccessClaims(
      userRecord.customClaims as Record<string, unknown> | undefined,
      managedClaims,
    );

    await adminAuth.setCustomUserClaims(decoded.uid, nextClaims);

    const updates: Promise<unknown>[] = [];

    if (captainMatch && captainMatch.authUid !== decoded.uid) {
      updates.push(
        adminDb.collection("admin").doc("data").collection("captains").doc(captainMatch.id).set(
          {
            authUid: decoded.uid,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      );
    }

    if (accessUserMatch && accessUserMatch.authUid !== decoded.uid) {
      updates.push(
        adminDb.collection("admin").doc("data").collection("accessUsers").doc(accessUserMatch.id).set(
          {
            authUid: decoded.uid,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        ),
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    const nextPath = normalizeNextPath(body.nextPath);
    const redirectPath = effectiveRole === "admin" ? nextPath : "/access";

    return NextResponse.json({
      ok: true,
      role: effectiveRole,
      allowed: managedClaims.siteAccess === true,
      redirectPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}