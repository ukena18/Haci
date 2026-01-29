import express from "express";
import cors from "cors";
import userRoutes from "./routes/users.js";
import publicCustomerRoutes from "./routes/publicCustomers.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/public-customers", publicCustomerRoutes);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, from: "express" });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});
