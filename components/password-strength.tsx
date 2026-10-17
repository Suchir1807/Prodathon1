"use client";

import { useMemo } from "react";

export function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => {
    if (!password) return 0;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^a-zA-Z0-9]/.test(password);
    const alphabetSize =
      (hasLower ? 26 : 0) +
      (hasUpper ? 26 : 0) +
      (hasDigit ? 10 : 0) +
      (hasSpecial ? 32 : 0);
    const estimatedEntropy = password.length * Math.log2(Math.max(alphabetSize, 1));

    return [
      password.length >= 8,
      password.length >= 12,
      estimatedEntropy >= 45,
      hasSpecial,
      [hasLower || hasUpper, hasDigit, hasSpecial].filter(Boolean).length >= 2,
    ].filter(Boolean).length;
  }, [password]);

  if (!password) return null;

  const label = strength <= 2 ? "Weak" : strength <= 3 ? "Fair" : "Strong";
  const tone =
    strength <= 2
      ? "bg-rose-500"
      : strength <= 3
        ? "bg-amber-400"
        : "bg-emerald-400";
  const textTone =
    strength <= 2
      ? "text-rose-400"
      : strength <= 3
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <div aria-live="polite" className="space-y-1.5">
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-1 flex-1 rounded-full ${index < strength ? tone : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className={`font-mono text-[10px] ${textTone}`}>Password strength: {label}</p>
    </div>
  );
}
