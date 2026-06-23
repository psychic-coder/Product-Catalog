export interface CursorData {
  updatedAt: string; // ISO 8601
  _id: string;
}

/**
 * Encode pagination cursor into a base64 string.
 */
export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  return Buffer.from(json).toString('base64');
}

/**
 * Decode a base64 cursor back to its components.
 * Returns null if the cursor is invalid.
 */
export function decodeCursor(encoded: string): CursorData | null {
  try {
    const json = Buffer.from(encoded, 'base64').toString('utf8');
    const data = JSON.parse(json);
    if (data.updatedAt && data._id) {
      return { updatedAt: data.updatedAt, _id: data._id };
    }
    return null;
  } catch {
    return null;
  }
}
