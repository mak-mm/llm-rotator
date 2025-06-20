"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { queryClient } from "@/lib/api";
import { QueryProvider } from "@/contexts/query-context";
import { SSEProvider } from "@/contexts/sse-context";
import { QuerySSEService } from "@/components/services/query-sse-service";

export function Providers({ children }: { children: React.ReactNode }) {

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <QueryProvider>
          <SSEProvider>
            <QuerySSEService />
            {children}
          </SSEProvider>
        </QueryProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}