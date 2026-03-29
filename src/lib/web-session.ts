"use client";

const webSessionStorageKey = "cartpilot-web-session";

export function getOrCreateWebSessionId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(webSessionStorageKey);
  if (existing) return existing;

  const generated = `web_${crypto.randomUUID()}`;
  window.localStorage.setItem(webSessionStorageKey, generated);
  return generated;
}
