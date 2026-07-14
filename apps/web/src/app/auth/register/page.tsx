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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.register({ ...form, role: "SENDER" });
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
              error={!!error}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-sm font-medium text-muted-foreground">
              Email
            </label>
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              error={!!error}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-password" className="text-sm font-medium text-muted-foreground">
              Password
            </label>
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              error={!!error}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-country" className="text-sm font-medium text-muted-foreground">
              Country (ISO code, e.g. SG)
            </label>
            <Input
              id="reg-country"
              autoComplete="country"
              error={!!error}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />
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
