import { describe, expect, it } from "vitest";
import { canInviteRoomMember, canJoinPublicRoom, cleanupBatchCount, isValidRoomInvitation } from "./supabase";
import { connectionBannerState, shouldRefreshDirectory, shouldStickToBottom } from "../client/src/lib/connection-utils";
import { CHAT_IMAGE_MAX_BYTES, isSupportedChatImage } from "../client/src/lib/media-utils";

describe("batched cleanup", () => {
  it("calculates bounded cleanup batches", () => {
    expect(cleanupBatchCount(0)).toBe(0);
    expect(cleanupBatchCount(1)).toBe(1);
    expect(cleanupBatchCount(100)).toBe(1);
    expect(cleanupBatchCount(101)).toBe(2);
    expect(cleanupBatchCount(250, 50)).toBe(5);
  });
});

describe("image attachments", () => {
  it("accepts supported images within the size limit", () => {
    expect(isSupportedChatImage({ type: "image/jpeg", size: 1024 })).toBe(true);
    expect(isSupportedChatImage({ type: "image/webp", size: CHAT_IMAGE_MAX_BYTES })).toBe(true);
  });

  it("rejects unsupported types and oversized files", () => {
    expect(isSupportedChatImage({ type: "application/pdf", size: 1024 })).toBe(false);
    expect(isSupportedChatImage({ type: "image/png", size: CHAT_IMAGE_MAX_BYTES + 1 })).toBe(false);
  });
});

describe("room invitation acceptance", () => {
  it("accepts only a room invite addressed to the current recipient", () => {
    expect(isValidRoomInvitation({ recipient_id: "guest", kind: "room_invite", room_id: "room-1" }, "guest")).toBe(true);
    expect(isValidRoomInvitation({ recipient_id: "owner", kind: "room_invite", room_id: "room-1" }, "guest")).toBe(false);
    expect(isValidRoomInvitation({ recipient_id: "guest", kind: "game_invite", room_id: "room-1" }, "guest")).toBe(false);
    expect(isValidRoomInvitation(null, "guest")).toBe(false);
  });
});

describe("room invitation authorization", () => {
  it("allows only the private-room owner to invite another user", () => {
    expect(canInviteRoomMember("owner", "owner", "guest")).toBe(true);
    expect(canInviteRoomMember("owner", "admin", "guest")).toBe(false);
    expect(canInviteRoomMember("owner", "owner", "owner")).toBe(false);
  });
});

describe("realtime account directory", () => {
  it("refreshes after the configured interval without refreshing early", () => {
    expect(shouldRefreshDirectory(1000, 3999, 3000)).toBe(false);
    expect(shouldRefreshDirectory(1000, 4000, 3000)).toBe(true);
  });
});

describe("public room joining", () => {
  it("allows public rooms only", () => {
    expect(canJoinPublicRoom("public")).toBe(true);
    expect(canJoinPublicRoom("private")).toBe(false);
  });
});

describe("chat scroll anchoring", () => {
  it("sticks near the bottom but preserves intentional upward reading", () => {
    expect(shouldStickToBottom(1000, 700, 200)).toBe(true);
    expect(shouldStickToBottom(1000, 500, 200)).toBe(false);
    expect(shouldStickToBottom(1000, 640, 200, 120)).toBe(false);
  });
});

describe("connection banner state", () => {
  it("prioritizes offline state", () => {
    expect(connectionBannerState(false, "connected", true)).toBe("offline");
  });

  it("shows reconnecting only for an active room", () => {
    expect(connectionBannerState(true, "reconnecting", true)).toBe("reconnecting");
    expect(connectionBannerState(true, "reconnecting", false)).toBe("hidden");
    expect(connectionBannerState(true, "connected", true)).toBe("hidden");
  });
});
