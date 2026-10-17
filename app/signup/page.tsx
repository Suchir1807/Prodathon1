"use client";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

import { AuthCard, AuthLink } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";
import { signupSchema, type SignupValues } from "@/lib/validation/schemas";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const submissionRef = useRef(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { username: "", password: "", confirm: "" },
  });
  const password = useWatch({ control, name: "password" });

  async function submit(values: SignupValues) {
    if (submissionRef.current) return;
    submissionRef.current = true;
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Signup failed.");
        return;
      }

      router.push("/login");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Network error. Try again.");
    } finally {
      submissionRef.current = false;
    }
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <AuthCard
      title="Initialize account"
      subtitle="Pick a username and secure password to join the network."
      footer={
        <>
          Already registered? <AuthLink href="/login">Sign in</AuthLink>
        </>
      }
    >
      <form onSubmit={submitForm} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="username" className="text-slate-300">
            Username
          </Label>
          <Input
            id="username"
            autoComplete="username"
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? "signup-username-error" : undefined}
            {...register("username")}
            className={`h-10 border-white/10 bg-black/30 ${errors.username ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}`}
          />
          {errors.username ? <p id="signup-username-error" className="text-xs font-mono text-rose-500">{errors.username.message}</p> : null}
          <p className="text-xs text-slate-500">
            3–32 characters; letters, numbers, underscores.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "signup-password-error" : undefined}
            {...register("password")}
            className="h-10 border-white/10 bg-black/30"
          />
          {errors.password ? <p id="signup-password-error" className="text-xs font-mono text-rose-500">{errors.password.message}</p> : null}
          <PasswordStrength password={password} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-slate-300">
            Confirm password
          </Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            invalid={Boolean(errors.confirm)}
            aria-describedby={errors.confirm ? "signup-confirm-error" : undefined}
            {...register("confirm")}
            className="h-10 border-white/10 bg-black/30"
          />
          {errors.confirm ? <p id="signup-confirm-error" className="text-xs font-mono text-rose-500">{errors.confirm.message}</p> : null}
        </div>
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-10 w-full" loading={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
