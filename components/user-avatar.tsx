import { cn } from "@/lib/utils";

const PALETTES = [
  "from-sky-400 to-blue-600",
  "from-violet-400 to-fuchsia-600",
  "from-cyan-300 to-indigo-500",
  "from-emerald-300 to-teal-600",
  "from-amber-300 to-orange-500",
  "from-rose-300 to-pink-600",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "YO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function palette(name: string) {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PALETTES[hash % PALETTES.length];
}

export function UserAvatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br text-xs font-semibold text-white",
        palette(name || "You"),
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
