import express from "express";
import { db } from "../firebase.js";

const router = express.Router();

/**
 * PUT /api/public-customers/:customerId
 * Publish or update public customer snapshot
 */
router.put("/:customerId", async (req, res) => {
  const { customerId } = req.params;
  const payload = req.body;

  if (!customerId) {
    return res.status(400).json({ error: "Missing customerId" });
  }

  await db
    .collection("public_customers")
    .doc(customerId)
    .set(
      {
        ...payload,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

  res.json({ ok: true });
});

export default router;

/**
 * GET /api/public-customers/:customerId
 * Public read-only customer snapshot
 */
router.get("/:customerId", async (req, res) => {
  const { customerId } = req.params;

  const snap = await db.collection("public_customers").doc(customerId).get();

  if (!snap.exists) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json(snap.data());
});
