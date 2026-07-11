"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, setToken } from "@/lib/api";
import type { UserRole } from "@stellarsend/shared/constants";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    fullName: "",
    country: "",
    role: "SENDER" as UserRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.register(form);
      setToken(res.token);
      router.push("/send");
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            placeholder="Country (ISO code, e.g. SG)"
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value })}
            required
          />
          <select
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
          >
            <option value="SENDER">Sender</option>
            <option value="RECEIVER">Receiver</option>
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
