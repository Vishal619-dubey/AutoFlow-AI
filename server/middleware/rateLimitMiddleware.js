const buckets = new Map();
const rateLimit = ({ windowMs = 60_000, max = 120, message = "Too many requests. Please try again later." } = {}) => (req, res, next) => {
  const now = Date.now(); const identity = req.user?._id?.toString() || req.ip || "anonymous"; const key = `${req.baseUrl}:${identity}`; const current = buckets.get(key);
  if (!current || current.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return next(); }
  current.count += 1; if (current.count > max) { res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000)); return res.status(429).json({ success: false, message }); }
  return next();
};
module.exports = { rateLimit };
