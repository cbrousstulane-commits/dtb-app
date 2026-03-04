import admin from "firebase-admin";

const email = process.env.ADMIN_EMAIL;
if (!email) {
  console.error("Missing ADMIN_EMAIL env var.");
  process.exit(1);
}

// Uses GOOGLE_APPLICATION_CREDENTIALS pointing to a service-account JSON file
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  const existing = user.customClaims || {};

  await admin.auth().setCustomUserClaims(user.uid, {
    ...existing,
    admin: true,
  });

  console.log(`OK: Set admin=true for ${email} (uid=${user.uid})`);
  console.log("Next: sign out/in to refresh your ID token (or force refresh in code).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});