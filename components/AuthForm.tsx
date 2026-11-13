"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const [form, setForm] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(safeNext);
        router.refresh();
        return;
      }
      if (data.fieldErrors) setErrors(data.fieldErrors);
      setFormError(data.error ?? "Something went wrong");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const input = (k: keyof typeof form, label: string, type = "text", autoComplete?: string) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input
        id={k}
        type={type}
        className="input"
        value={form[k]}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        aria-invalid={!!errors[k]}
        autoComplete={autoComplete}
        data-testid={`${mode}-${k}`}
      />
      {errors[k] && <p className="field-error" data-testid={`error-${k}`}>{errors[k]}</p>}
    </div>
  );

  return (
    <div className="container-x flex justify-center py-16">
      <form onSubmit={submit} noValidate className="w-full max-w-md space-y-5 rounded-3xl border border-line bg-white p-8" data-testid={`${mode}-form`}>
        <h1 className="text-3xl font-black tracking-tight">{mode === "login" ? "Welcome back" : "Create account"}</h1>
        {formError && (
          <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" data-testid={`${mode}-error`}>
            {formError}
          </div>
        )}
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-4">
            {input("firstName", "First name", "text", "given-name")}
            {input("lastName", "Last name", "text", "family-name")}
          </div>
        )}
        {input("email", "Email", "email", "email")}
        {input("password", "Password", "password", mode === "login" ? "current-password" : "new-password")}
        <button type="submit" disabled={busy} className="btn-primary w-full py-3.5" data-testid={`${mode}-submit`}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
        <p className="text-center text-sm text-muted">
          {mode === "login" ? (
            <>New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-ink underline">Create an account</Link></>
          ) : (
            <>Already have an account? <Link href="/login" className="font-semibold text-ink underline">Log in</Link></>
          )}
        </p>
        {mode === "login" && (
          <p className="rounded-xl bg-paper px-4 py-3 text-xs text-muted" data-testid="demo-credentials">
            Demo account: <b>demo@islamsshop.test</b> / <b>Test@1234</b>
          </p>
        )}
      </form>
    </div>
  );
}
