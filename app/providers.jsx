"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/components/auth/AuthProvider";

/**
 * Client-only providers, isolated here so app/layout.jsx stays a Server
 * Component. Replaces what the Vite app did across src/main.jsx (ThemeProvider),
 * src/App.jsx (axios.defaults.withCredentials) and per-page <Toaster /> mounts.
 */
export default function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>{children}</AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}
