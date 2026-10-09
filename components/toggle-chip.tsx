"use client";

import { cn } from "@/lib/utils";

export function ToggleChip({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-medium transition",
        selected
          ? "border-[#ccff00] bg-slate-900 text-[#ccff00] shadow-[0_0_12px_rgba(204,255,0,0.45)]"
          : "border-transparent bg-slate-800/70 text-slate-500 hover:text-slate-300",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
