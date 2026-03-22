/** Serialized in `messages.content` for non-plain-text bubbles. */

export type RichImagePayload = {
  t: 'img';
  mime: string;
  b64: string;
  caption?: string;
};

export type RichInvitePayload = {
  t: 'invite';
  gameId: string;
  code: string;
};

export type RichPayload = RichImagePayload | RichInvitePayload;

export function encodeRichPayload(p: RichPayload): string {
  return JSON.stringify(p);
}

export function tryParseRichPayload(content: string): RichPayload | null {
  if (!content || content[0] !== '{') return null;
  try {
    const j = JSON.parse(content) as unknown;
    if (typeof j !== 'object' || j === null || !('t' in j)) return null;
    const o = j as { t: string };
    if (o.t === 'img') {
      const img = j as RichImagePayload;
      if (typeof img.b64 === 'string' && typeof img.mime === 'string') return img;
    }
    if (o.t === 'invite') {
      const inv = j as RichInvitePayload;
      if (typeof inv.gameId === 'string' && typeof inv.code === 'string') return inv;
    }
  } catch {
    /* plain text */
  }
  return null;
}
