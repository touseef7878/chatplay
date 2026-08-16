import { describe, expect, it } from "vitest";

describe("Supabase browser configuration", () => {
  it("reaches the connected project's lightweight auth health endpoint", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(publishableKey).toBeTruthy();

    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publishableKey! },
    });

    expect(response.ok).toBe(true);
  });

  it("accepts the server-only secret key for a lightweight Auth admin request", async () => {
    const url = process.env.VITE_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);
    expect(secretKey).toMatch(/^sb_secret_/);

    const response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1`, {
      headers: {
        apikey: secretKey!,
        Authorization: `Bearer ${secretKey}`,
      },
    });

    expect(response.ok).toBe(true);
  });

  it("publishes at least one ES256 key through its JWKS endpoint", async () => {
    const url = process.env.VITE_SUPABASE_URL;

    expect(url).toMatch(/^https:\/\/[^/]+\.supabase\.co$/);

    const response = await fetch(`${url}/auth/v1/.well-known/jwks.json`);
    const jwks = (await response.json()) as { keys?: Array<{ alg?: string; kid?: string }> };

    expect(response.ok).toBe(true);
    expect(jwks.keys?.some(key => key.alg === "ES256" && Boolean(key.kid))).toBe(true);
  });
});
