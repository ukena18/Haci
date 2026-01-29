import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = express.Router();

// absolute path to your existing JSON file
const DATA_FILE = path.resolve(process.cwd(), "../public_customers.json");

// helpers
function readCustomers() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw || "[]");
}

function writeCustomers(customers) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(customers, null, 2));
}

/**
 * GET /api/customers
 */
router.get("/", (req, res) => {
  const customers = readCustomers();
  res.json(customers);
});

/**
 * POST /api/customers
 */
router.post("/", (req, res) => {
  const customers = readCustomers();

  const customer = {
    ...req.body,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  customers.push(customer);
  writeCustomers(customers);

  res.status(201).json(customer);
});

/**
 * DELETE /api/customers/:id
 */
router.delete("/:id", (req, res) => {
  const customers = readCustomers().filter((c) => c.id !== req.params.id);

  writeCustomers(customers);
  res.json({ ok: true });
});

export default router;
