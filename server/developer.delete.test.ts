import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { canDeleteChatRoom, canLeaveChatRoom } from "./supabase";
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

describe("ChatPlay cleanup authorization", () => {
  it("allows only the owner to delete a room", () => {
    expect(canDeleteChatRoom("owner-id", "owner-id")).toBe(true);
    expect(canDeleteChatRoom("owner-id", "member-id")).toBe(false);
  });

  it("prevents owners from leaving their own room", () => {
    expect(canLeaveChatRoom("owner")).toBe(false);
    expect(canLeaveChatRoom("admin")).toBe(true);
    expect(canLeaveChatRoom("member")).toBe(true);
  });
  it("rejects unauthenticated cleanup and room lifecycle calls", async () => {
    const caller = appRouter.createCaller({ user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] });

    await expect(caller.chatplay.clearMyData()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chatplay.leaveRoom({ roomId: "00000000-0000-0000-0000-000000000000" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.chatplay.deleteRoom({ roomId: "00000000-0000-0000-0000-000000000000" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
