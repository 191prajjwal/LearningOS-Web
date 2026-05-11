"use client";
import { useEffect } from "react";

/**
 * useKeyboard — attach keyboard shortcuts easily
 * @param {Object} keyMap - e.g. { "Space": () => togglePlay(), "Escape": () => close() }
 * @param {boolean} active - whether the listener is active
 * @param {Array} deps - extra dependencies
 */
export function useKeyboard(keyMap, active = true, deps = []) {
  useEffect(() => {
    if (!active) return;

    const handler = (e) => {
      // Skip if typing in an input
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      const key = e.key;
      if (keyMap[key]) {
        e.preventDefault();
        keyMap[key](e);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...deps]);
}
