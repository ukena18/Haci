import express from "express";
import cors from "cors";

import userRoutes from "./routes/users.js";
import publicCustomerRoutes from "./routes/publicCustomers.js";
import adminRoutes from "./routes/admin.js";

const app = express(); // ✅ app FIRST

app.use(cors());
app.use(express.json());

// ✅ routes AFTER app exists
app.use("/api/users", userRoutes);
app.use("/api/public-customers", publicCustomerRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, from: "express" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
