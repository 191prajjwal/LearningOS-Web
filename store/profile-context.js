"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { examCountdown, lsGet, lsSet } from "../lib/utils";
import { LS_KEYS, DEFAULT_SETTINGS } from "../lib/constants";

const ProfileContext = createContext(null);

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const USER_KEY = "los_user";
function getStoredUser() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}
function storeUser(user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function ProfileProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);

  // Always pass currentUser explicitly — avoids stale closure on `user` state
  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser) { setLoading(false); return; }
    try {
      const res = await fetch("/api/profile", {
        headers: { "Content-Type": "application/json", "x-user-id": String(currentUser.id) },
      });
      if (res.status === 401) { setLoading(false); return; }
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        if (!data.profile.name) setShowSetup(true);
      } else {
        setShowSetup(true);
      }
      if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    } catch {
      // Don't show setup if user isn't logged in yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      loadProfile(stored);
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (username, pin, action = "login") => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, pin, action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Auth failed");
    storeUser(data.user);
    setUser(data.user);
    await loadProfile(data.user);
    return data.user;
  }, [loadProfile]);

  const logout = useCallback(() => {
    clearStoredUser();
    setUser(null);
    setProfile(null);
    setSettings(DEFAULT_SETTINGS);
    setShowSetup(false);
  }, []);

  // updateProfile — unchanged from your original, just adds x-user-id header
  const updateProfile = useCallback(async (updates) => {
    const currentUser = getStoredUser();
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(currentUser ? { "x-user-id": String(currentUser.id) } : {}) },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update profile");
    if (data.profile) {
      setProfile(data.profile);
      setShowSetup(false);
    }
    return data;
  }, []);

  // updateSettings — unchanged from your original, just adds x-user-id header
  const updateSettings = useCallback(async (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    const currentUser = getStoredUser();
    await fetch("/api/profile/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(currentUser ? { "x-user-id": String(currentUser.id) } : {}) },
      body: JSON.stringify(updates),
    });
  }, [settings]);

  const countdown = profile?.exam_date && profile?.start_date
    ? examCountdown(profile.exam_date, profile.start_date)
    : null;

  return (
    <ProfileContext.Provider value={{
      user, profile, settings, showSetup, loading, countdown,
      login, logout, setShowSetup,
      updateProfile, updateSettings,
      reloadProfile: () => loadProfile(getStoredUser()),
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
