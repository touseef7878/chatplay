export type RealtimeConnectionStatus = "connecting" | "connected" | "reconnecting" | "offline";

export function connectionBannerState(isOnline: boolean, realtimeStatus: RealtimeConnectionStatus, hasRoom: boolean) {
  if (!isOnline) return "offline" as const;
  if (hasRoom && realtimeStatus !== "connected") return "reconnecting" as const;
  return "hidden" as const;
}

export function shouldStickToBottom(scrollHeight: number, scrollTop: number, clientHeight: number, threshold = 160) {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}
