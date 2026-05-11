export function getUserId(req) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return null;
  return parseInt(userId, 10) || null;
}
export function requireUserId(req) {
  const userId = getUserId(req);
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}
