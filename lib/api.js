// Reads user from localStorage fresh on every call — no stale closure issues
function getStoredUserId() {
  if (typeof window === "undefined") return null;
  try {
    const user = JSON.parse(localStorage.getItem("los_user") || "null");
    return user?.id ? String(user.id) : null;
  } catch { return null; }
}
export async function apiFetch(url, options = {}) {
  const userId = getStoredUserId();
  const headers = {
    ...(options.body !== undefined && !options.headers?.["Content-Type"] ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
    ...(userId ? { "x-user-id": userId } : {}),
  };
  return fetch(url, { ...options, headers });
}
