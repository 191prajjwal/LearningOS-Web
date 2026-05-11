"use client";
import { useState, useEffect, useCallback } from "react";

export function useSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/courses");
      const d = await r.json();
      setSubjects(d.subjects || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createSubject = async (data) => {
    const r = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const d = await r.json();
    await load();
    return d.subject;
  };

  const deleteSubject = async (id) => {
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    await load();
  };

  return { subjects, loading, error, reload: load, createSubject, deleteSubject };
}
