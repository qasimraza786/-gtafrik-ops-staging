"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { getSession } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    if (getSession()) {
      setAuthed(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--surface-1)",
          color: "var(--text-muted)",
          fontSize: 13,
        }}
      >
        Authenticating…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--surface-1)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>{children}</main>
    </div>
  );
}
