import admin from "firebase-admin";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const token = header.split(" ")[1];

    const decoded = await admin.auth().verifyIdToken(token);

    // 🔍 DEBUG (keep for now)
    console.log("DECODED UID:", decoded.uid);
    console.log("REQ PARAM UID:", req.params.userId);

    req.user = decoded;
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ error: "Invalid auth token" });
  }
}
