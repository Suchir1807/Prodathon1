"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  invalid?: boolean;
};

export function PasswordInput({
  className,
  invalid = false,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={cn(
          "pr-10",
          invalid && "border-rose-500/70 focus-visible:ring-rose-500/30",
          className,
        )}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 transition-colors hover:text-neutral-100 focus-visible:text-neutral-100 focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
