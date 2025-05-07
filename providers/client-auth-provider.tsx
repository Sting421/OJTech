'use client';

import { AuthProvider } from "@/providers/auth-provider";

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}