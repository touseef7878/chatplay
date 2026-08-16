import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createDeveloperContext(openId: string): TrpcContext {
  return {
    user: {
      id: 999,
      openId,
      email: "developer@example.com",
      name: "Developer",
      loginMethod: "password",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("developer account deletion", () => {
  it("protects the current developer owner account", async () => {
    const ownerOpenId = process.env.OWNER_OPEN_ID ?? "sample-owner";
    const caller = appRouter.createCaller(createDeveloperContext(ownerOpenId));

    await expect(caller.developer.deleteUser({ openId: ownerOpenId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects a generic admin who is not the developer owner", async () => {
    const caller = appRouter.createCaller(createDeveloperContext("another-admin"));

    await expect(caller.developer.deleteUser({ openId: "target-user" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
