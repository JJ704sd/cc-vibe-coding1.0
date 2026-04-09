import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";

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
};

export type CreateLocalFileStorageParams = {
  rootDir: string;
  publicBaseUrl: string;
};

const normalizePublicBaseUrl = (value: string): string => value.replace(/\/+$/, "");
const toTwoDigits = (value: number): string => value.toString().padStart(2, "0");

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
    }
  };
};
