export const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const CHAT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export function isSupportedChatImage(file: { type: string; size: number }) {
  return CHAT_IMAGE_TYPES.includes(file.type as (typeof CHAT_IMAGE_TYPES)[number]) && file.size <= CHAT_IMAGE_MAX_BYTES;
}
