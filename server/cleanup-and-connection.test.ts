import { describe, expect, it } from "vitest";
import { cleanupBatchCount } from "./supabase";
import { connectionBannerState } from "../client/src/lib/connection-utils";

describe("batched cleanup", () => {
  it("calculates bounded cleanup batches", () => {
    expect(cleanupBatchCount(0)).toBe(0);
    expect(cleanupBatchCount(1)).toBe(1);
    expect(cleanupBatchCount(100)).toBe(1);
    expect(cleanupBatchCount(101)).toBe(2);
    expect(cleanupBatchCount(250, 50)).toBe(5);
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
