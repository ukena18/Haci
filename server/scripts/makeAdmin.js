import admin from "firebase-admin";
import fs from "fs";

admin.initializeApp({
  credential: admin.credential.cert(
    JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
  ),
});

const uid = process.argv[2];
if (!uid) throw new Error("Usage: node makeAdmin.js <uid>");

await admin.auth().setCustomUserClaims(uid, { admin: true });
console.log("✅ Admin claim set for:", uid);
process.exit(0);
