'use client';

import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { FeedbackButton } from "@/components/feedback-button";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
        <FeedbackButton />
      </AuthProvider>
    </ThemeProvider>
  );
}
