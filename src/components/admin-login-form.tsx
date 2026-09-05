"use client";
import { useState } from "react";
import { buildLoginRequestBody } from "@/lib/admin-validation";

const FIELD_ERROR_TEXT: Record<"empty_email" | "invalid_email" | "empty_password", string> = {
  empty_email: "Enter your admin email.",
  invalid_email: "Enter a valid email address.",
  empty_password: "Enter your password.",
};

function messageForStatus(status: number, serverError: string | undefined): string {
  if (status === 401) return serverError || "Invalid email or password.";
  if (status === 400) return "Enter a valid email and password.";
  if (status === 429) return serverError || "Too many attempts. Please try again later.";
  return "Unable to sign in. Please try again.";
}

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = new FormData(e.currentTarget);
    const built = buildLoginRequestBody(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    if (!built.ok) {
      setError(FIELD_ERROR_TEXT[built.error]);
      return;
    }

    setBusy(true);
    let r: Response;
    try {
      r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(built.body),
      });
    } catch {
      setError(messageForStatus(0, undefined));
      setBusy(false);
      return;
    }

    if (!r.ok) {
      const payload = await r.json().catch(() => ({}) as { error?: string });
      setError(messageForStatus(r.status, payload.error));
      setBusy(false);
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <form className="admin-form" method="post" action="/api/admin/login" onSubmit={submit}>
      <input name="email" type="email" placeholder="Admin email" autoComplete="username" required />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
      <button type="submit" className="button button-primary" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
