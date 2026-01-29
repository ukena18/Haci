import express from "express";
import { db } from "../firebase.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

/**
 * Ensure user data exists
 */
router.post("/:userId/ensure", requireAuth, async (req, res) => {
  const { userId } = req.params;

  if (req.user.uid !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const ref = db.collection("users").doc(userId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      profile: { phone: "", address: "" },
      vaults: [
        {
          id: "main_vault",
          name: "Main Vault",
          balance: 0,
          currency: "TRY",
          createdAt: Date.now(),
        },
      ],
      activeVaultId: "main_vault",
      customers: [],
      jobs: [],
      payments: [],
      reservations: [],
      createdAt: Date.now(),
    });
  }

  res.json({ ok: true });
});

/**
 * Load user data
 */
router.get("/:userId", requireAuth, async (req, res) => {
  const { userId } = req.params;

  if (req.user.uid !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const ref = db.collection("users").doc(userId);
  const snap = await ref.get();

  if (!snap.exists) return res.json(null);

  const data = snap.data();

  res.json({
    ...data,
    vaults: data.vaults || data.Vaults || [],
    reservations: data.reservations || [],
  });
});

/**
 * Save user data (replace)
 */
router.put("/:userId", requireAuth, async (req, res) => {
  const { userId } = req.params;

  if (req.user.uid !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  await db
    .collection("users")
    .doc(userId)
    .set(
      {
        ...req.body,
        updatedAt: Date.now(),
      },
      { merge: false },
    );

  res.json({ ok: true });
});

export default router;
