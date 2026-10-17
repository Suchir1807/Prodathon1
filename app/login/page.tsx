"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

import { AuthCard, AuthLink } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/password-input";
import { loginSchema, type LoginValues } from "@/lib/validation/schemas";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const submissionRef = useRef(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { username: "", password: "" },
  });

  async function submit(values: LoginValues) {
    if (submissionRef.current) return;
    submissionRef.current = true;
    setError(null);

    try {
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (!result?.ok) {
        setError("Invalid username or password.");
        return;
      }

      const response = await fetch("/api/profile", { cache: "no-store" });
      const data = (await response.json()) as { isProfileComplete?: boolean };

      if (response.ok && data.isProfileComplete) {
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } catch {
      setError("Unable to sign in. Check your connection and try again.");
    } finally {
      submissionRef.current = false;
    }
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    void handleSubmit(submit)(event);
  }

  return (
    <AuthCard
      title="Access CoFoundry"
      subtitle="Sign in with your username and password."
      footer={
        <>
          No account yet? <AuthLink href="/signup">Create one</AuthLink>
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
            aria-describedby={errors.username ? "login-username-error" : undefined}
            {...register("username")}
            className={`h-10 border-white/10 bg-black/30 ${errors.username ? "border-rose-500/70 focus-visible:ring-rose-500/30" : ""}`}
          />
          {errors.username ? <p id="login-username-error" className="text-xs font-mono text-rose-500">{errors.username.message}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">
            Password
          </Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            {...register("password")}
            className="h-10 border-white/10 bg-black/30"
          />
          {errors.password ? <p id="login-password-error" className="text-xs font-mono text-rose-500">{errors.password.message}</p> : null}
        </div>
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="h-10 w-full" loading={isSubmitting}>
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
