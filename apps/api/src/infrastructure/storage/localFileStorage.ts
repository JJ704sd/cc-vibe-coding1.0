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
        await readFile(absolutePath);
        // Determine mime type from extension
        const ext = extname(storageKey).toLowerCase();
        const mimeTypeMap: Record<string, string> = {
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".png": "image/png",
          ".gif": "image/gif",
          ".webp": "image/webp",
          ".mp4": "video/mp4",
          ".webm": "video/webm",
        };
        const mimeType = mimeTypeMap[ext] || "application/octet-stream";
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
