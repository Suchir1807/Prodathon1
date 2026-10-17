"use client";

import { useEffect } from "react";

import { RouteErrorPanel } from "@/components/route-error-panel";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark min-h-full antialiased">
      <body className="min-h-dvh">
        <RouteErrorPanel
          title="CoFoundry could not finish loading."
          description="The application shell encountered an unexpected error. Retry the connection to try loading it again."
          diagnostic={error.digest}
          onRetry={retry}
        />
      </body>
    </html>
  );
}
