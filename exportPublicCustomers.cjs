const admin = require("firebase-admin");
const fs = require("fs");

// 🔑 Load service account
const serviceAccount = require("./serviceAccountKey.json");

// 🔥 Init Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function exportPublicCustomers() {
  const snapshot = await db.collection("public_customers").get();

  const data = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  fs.writeFileSync(
    "public_customers.json",
    JSON.stringify(data, null, 2),
    "utf-8",
  );

  console.log(`✅ Exported ${data.length} customers`);
}

exportPublicCustomers().catch(console.error);
