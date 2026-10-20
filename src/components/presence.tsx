"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Tells the server "I'm here" every minute while the tab is open and visible. */
export function Heartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState === "visible") fetch("/api/presence", { method: "POST", keepalive: true }).catch(() => {});
    };
    ping();
    const id = setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
  return null;
}

/** Re-loads the server data on this page every few seconds (used for the live users list). */
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
