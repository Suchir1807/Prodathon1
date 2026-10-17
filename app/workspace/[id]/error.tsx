"use client";

import { useEffect } from "react";

import { RouteErrorPanel } from "@/components/route-error-panel";

export default function WorkspaceError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Workspace route error:", error);
  }, [error]);

  return (
    <RouteErrorPanel
      title="The workspace could not be loaded."
      description="Check your connection, then retry. Your shared tasks and notes remain saved."
      diagnostic={error.digest}
      onRetry={retry}
    />
  );
}
