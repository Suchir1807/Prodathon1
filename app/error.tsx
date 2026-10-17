"use client";

import { useEffect } from "react";

import { RouteErrorPanel } from "@/components/route-error-panel";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Application route error:", error);
  }, [error]);

  return (
    <RouteErrorPanel
      title="This page hit an unexpected error."
      description="Your work is still here. Retry the connection to reload this part of CoFoundry."
      diagnostic={error.digest}
      onRetry={retry}
    />
  );
}
