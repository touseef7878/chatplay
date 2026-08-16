import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: () => undefined,
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("local username/password auth contracts", () => {
  it("rejects invalid registration input before account creation", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.auth.register({
        username: "ab",
        password: "short",
        displayName: "",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects empty login credentials before authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.auth.login({ username: "", password: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

