export function requireAdmin(req, res, next) {
  // requireAuth must run before this
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });

  // custom claim
  if (req.user.admin !== true) {
    return res.status(403).json({ error: "Admin only" });
  }

  next();
}
