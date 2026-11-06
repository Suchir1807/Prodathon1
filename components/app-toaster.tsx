"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      theme="dark"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "!border !border-border !bg-popover/95 !font-sans !text-popover-foreground !shadow-[var(--shadow-surface)] !backdrop-blur-xl",
          title: "!text-sm !font-semibold !text-foreground",
          description: "!text-xs !text-muted-foreground",
          success: "!border-success/40",
          error: "!border-destructive/40",
          warning: "!border-warning/40",
          info: "!border-accent",
          closeButton: "!border-border !bg-muted !text-muted-foreground",
        },
      }}
    />
  );
}
