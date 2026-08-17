export type RealtimeConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export function connectionBannerState(isOnline: boolean, realtimeStatus: RealtimeConnectionStatus, hasRoom: boolean) {
  if (!isOnline) return "offline" as const;
  if (hasRoom && realtimeStatus !== "connected") return "reconnecting" as const;
  return "hidden" as const;
}
