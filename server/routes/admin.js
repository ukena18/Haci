import express from "express";
import admin from "firebase-admin";
import { db } from "../firebase.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

// GET /api/admin/users?limit=50&pageToken=...
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 50), 1000);
  const pageToken = req.query.pageToken;

  const result = await admin.auth().listUsers(limit, pageToken);

  // Return minimal safe fields
  const users = result.users.map((u) => ({
    uid: u.uid,
    email: u.email || null,
    displayName: u.displayName || null,
    disabled: !!u.disabled,
    createdAt: u.metadata?.creationTime || null,
    lastSignInAt: u.metadata?.lastSignInTime || null,
    claims: u.customClaims || {},
  }));

  res.json({ users, nextPageToken: result.pageToken || null });
});

// GET /api/admin/user/:uid (reads Firestore doc)
router.get("/user/:uid", requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const snap = await db.collection("users").doc(uid).get();
  res.json({ uid, data: snap.exists ? snap.data() : null });
});

// POST /api/admin/user/:uid/disable
router.post(
  "/user/:uid/disable",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { uid } = req.params;
    await admin.auth().updateUser(uid, { disabled: true });
    res.json({ ok: true });
  },
);

// POST /api/admin/user/:uid/enable
router.post(
  "/user/:uid/enable",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { uid } = req.params;
    await admin.auth().updateUser(uid, { disabled: false });
    res.json({ ok: true });
  },
);

// DELETE /api/admin/user/:uid (dangerous)
router.delete("/user/:uid", requireAuth, requireAdmin, async (req, res) => {
  const { uid } = req.params;

  // Delete auth user
  await admin.auth().deleteUser(uid);

  // Optional: also delete Firestore data (careful!)
  // await db.collection("users").doc(uid).delete();

  res.json({ ok: true });
});

export default router;
