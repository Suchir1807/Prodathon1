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
            "!border !border-white/10 !bg-[#0c1324]/95 !font-mono !text-slate-100 !shadow-[0_12px_40px_rgba(0,0,0,0.45)] !backdrop-blur-xl",
          title: "!text-sm !font-semibold !text-white",
          description: "!text-xs !text-slate-400",
          success: "!border-lime-400/40",
          error: "!border-rose-400/40",
          warning: "!border-amber-400/40",
          info: "!border-sky-400/40",
          closeButton: "!border-white/10 !bg-white/5 !text-slate-300",
        },
      }}
    />
  );
}
