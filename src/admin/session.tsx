"use client";

import { createContext, useContext } from "react";

/** The signed-in admin, from the server (see src/app/admin/(app)/layout.tsx). */
export type AdminSession = {
  email: string;
  /** Funnel slugs this admin may publish; "*" means all. */
  slugs: string[];
  mustChangePassword: boolean;
};

const SessionContext = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useAdminSession(): AdminSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useAdminSession needs AdminSessionProvider");
  return session;
}

export const mayEdit = (session: Pick<AdminSession, "slugs">, slug: string) =>
  session.slugs.includes("*") || session.slugs.includes(slug);
