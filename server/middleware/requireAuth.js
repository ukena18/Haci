import admin from "firebase-admin";

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token" });
  }

  const token = header.replace("Bearer ", "");

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // 👈 THIS feeds requireAdmin
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
