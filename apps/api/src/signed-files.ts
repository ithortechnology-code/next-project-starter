import { createHmac, timingSafeEqual } from "node:crypto";

export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PROFILE_IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfileImageContentType = (typeof PROFILE_IMAGE_CONTENT_TYPES)[number];

type SignedFileClaims = {
  fileId: string;
  operation: "upload" | "download";
  expiresAt: number;
  contentType?: ProfileImageContentType;
};

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createFileToken(claims: SignedFileClaims, secret: string): string {
  if (Buffer.byteLength(secret) < 32) {
    throw new Error("FILE_URL_SIGNING_SECRET must contain at least 32 bytes.");
  }
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${signature(payload, secret)}`;
}

export function verifyFileToken(
  token: string,
  fileId: string,
  operation: SignedFileClaims["operation"],
  secret: string,
): SignedFileClaims | null {
  if (Buffer.byteLength(secret) < 32) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return null;

  const expected = Buffer.from(signature(payload, secret));
  const actual = Buffer.from(suppliedSignature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as SignedFileClaims;
    if (
      claims.fileId !== fileId ||
      claims.operation !== operation ||
      !Number.isSafeInteger(claims.expiresAt) ||
      claims.expiresAt <= Math.floor(Date.now() / 1000) ||
      (operation === "upload" &&
        !PROFILE_IMAGE_CONTENT_TYPES.includes(claims.contentType as ProfileImageContentType))
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function matchesImageContentType(
  bytes: Uint8Array,
  contentType: ProfileImageContentType,
): boolean {
  const data = Buffer.from(bytes);
  if (contentType === "image/jpeg") {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (contentType === "image/png") {
    return (
      data.length >= 8 &&
      data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  return (
    contentType === "image/webp" &&
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  );
}
