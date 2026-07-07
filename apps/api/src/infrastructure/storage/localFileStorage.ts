import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import type { Readable } from "node:stream";

export type SaveBufferInput = {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
};

export type SavedFile = {
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  sha256Hash: string;
  url: string;
};

export type LocalFileStorage = {
  saveBuffer: (input: SaveBufferInput) => Promise<SavedFile>;
  getFile: (storageKey: string) => Promise<{ stream: Readable; mimeType: string } | null>;
  deleteFile: (storageKey: string) => Promise<boolean>;
};

export type CreateLocalFileStorageParams = {
  rootDir: string;
  publicBaseUrl: string;
};

const normalizePublicBaseUrl = (value: string): string => value.replace(/\/+$/, "");
const toTwoDigits = (value: number): string => value.toString().padStart(2, "0");

// saveBuffer 生成的 storageKey 格式白名单(防止攻击者通过 DB 写入 ../../etc/passwd
// 之类的 storageKey 触发任意文件读/删 — BUG-002)。
// 格式:original/YYYY/MM/DD/<sha[0:2]>/<sha[2:4]>/<uuid32>[.ext]
const STORAGE_KEY_RE = /^original\/\d{4}\/\d{2}\/\d{2}\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{32}(?:\.[a-zA-Z0-9]+)?$/;

const resolveSafePath = (rootDir: string, storageKey: string): string => {
  // 第一道:白名单 — 只允许 saveBuffer 生成的固定格式
  if (typeof storageKey !== "string" || !STORAGE_KEY_RE.test(storageKey)) {
    throw new Error("storage_key does not match expected pattern");
  }
  // 第二道兜底:resolve + containment,防止 saveBuffer 改格式后白名单漏过
  const rootResolved = resolve(rootDir);
  const absolutePath = resolve(rootResolved, storageKey);
  const rootWithSep = rootResolved.endsWith(sep) ? rootResolved : rootResolved + sep;
  if (absolutePath !== rootResolved && !absolutePath.startsWith(rootWithSep)) {
    throw new Error("storage_key escapes storage root");
  }
  return absolutePath;
};

// BUG-048: mime type must come from file content, not the filename
// extension. A malicious upload named `evil.exe` → `evil.jpg` would
// otherwise be served back to clients as image/jpeg (the upload flow
// trusts the filename during ingest, then trusts it again on read).
// We sniff the first 4–12 bytes for known image/container signatures.
// Any buffer that doesn't match a known signature falls back to the
// extension-based guess and finally to application/octet-stream.
const sniffMimeTypeFromMagicBytes = (buffer: Buffer): string | null => {
  if (buffer.length < 4) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38 (37 or 39)
  if (
    buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38
  ) {
    return "image/gif";
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer.length >= 12 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const extMimeType = (storageKey: string): string | null => {
  const ext = extname(storageKey).toLowerCase();
  return EXT_TO_MIME[ext] ?? null;
};

export const createLocalFileStorage = ({
  rootDir,
  publicBaseUrl
}: CreateLocalFileStorageParams): LocalFileStorage => {
  const normalizedBaseUrl = normalizePublicBaseUrl(publicBaseUrl);

  return {
    saveBuffer: async ({ buffer, originalFilename, mimeType }) => {
      const fileExt = extname(originalFilename);
      const sha256Hash = createHash("sha256").update(buffer).digest("hex");
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = toTwoDigits(now.getUTCMonth() + 1);
      const day = toTwoDigits(now.getUTCDate());
      const shardA = sha256Hash.slice(0, 2);
      const shardB = sha256Hash.slice(2, 4);
      const generatedId = randomUUID().replaceAll("-", "");
      const storageKey = `original/${year}/${month}/${day}/${shardA}/${shardB}/${generatedId}${fileExt}`;
      const absolutePath = join(rootDir, storageKey);

      await mkdir(dirname(absolutePath), { recursive: true });

      await writeFile(absolutePath, buffer);

      return {
        storageKey,
        originalFilename,
        mimeType,
        byteSize: buffer.byteLength,
        sha256Hash,
        url: `${normalizedBaseUrl}/${storageKey}`
      };
    },
    getFile: async (storageKey: string) => {
      let absolutePath: string;
      try {
        absolutePath = resolveSafePath(rootDir, storageKey);
      } catch {
        return null;
      }
      try {
        // BUG-048: read the file once so we can sniff its actual content
        // for mime type, then stream the same bytes back to the client.
        // Reading into memory is bounded by `MAX_UPLOAD_BYTES` (10 MiB by
        // default), which is small enough for the io buffer.
        const buffer = await readFile(absolutePath);
        const mimeType =
          sniffMimeTypeFromMagicBytes(buffer) ??
          extMimeType(storageKey) ??
          "application/octet-stream";
        const stream = createReadStream(absolutePath);
        return { stream, mimeType };
      } catch {
        return null;
      }
    },

    deleteFile: async (storageKey: string) => {
      let absolutePath: string;
      try {
        absolutePath = resolveSafePath(rootDir, storageKey);
      } catch {
        return false;
      }
      try {
        const { unlink } = await import('node:fs/promises');
        await unlink(absolutePath);
        return true;
      } catch {
        return false;
      }
    }
  };
};
