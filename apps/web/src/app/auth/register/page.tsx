"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api, setToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    country: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; fullName?: string; country?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    const errs: { email?: string; password?: string; fullName?: string; country?: string } = {};
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email.trim())) errs.email = "Enter a valid email address.";
    if (form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!form.country.trim()) errs.country = "Country is required.";
    setFieldErrors(errs);
    const first = Object.values(errs)[0];
    return first ?? null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const firstErr = validate();
    if (firstErr) return;
    setLoading(true);
    try {
      const res = await api.auth.register({ ...form });
      setToken(res.token);
      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full space-y-4">
        <CardTitle>Create account</CardTitle>
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="text-sm font-medium text-muted-foreground">
              Full name
            </label>
            <Input
              id="reg-name"
              autoComplete="name"
              error={!!fieldErrors.fullName}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            {fieldErrors.fullName && <p className="text-xs text-danger">{fieldErrors.fullName}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              error={!!fieldErrors.email}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            {fieldErrors.email && <p className="text-xs text-danger">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-medium text-muted-foreground">
              Password
            </label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              error={!!fieldErrors.password}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            {fieldErrors.password && <p className="text-xs text-danger">{fieldErrors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-country" className="text-sm font-medium text-muted-foreground">
              Country (ISO code, e.g. SG)
            </label>
            <Input
              id="reg-country"
              autoComplete="country"
              error={!!fieldErrors.country}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />
            {fieldErrors.country && <p className="text-xs text-danger">{fieldErrors.country}</p>}
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button type="submit" className="w-full" loading={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
