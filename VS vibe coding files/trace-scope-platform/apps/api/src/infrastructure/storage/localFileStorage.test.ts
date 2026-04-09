import { mkdtemp, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createLocalFileStorage } from "./localFileStorage.js";

describe("createLocalFileStorage", () => {
  it("writes the file and returns metadata", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "trace-scope-storage-"));
    try {
      const storage = createLocalFileStorage({
        rootDir,
        publicBaseUrl: "http://localhost:3000"
      });
      const buffer = Buffer.from("hello storage");
      const expectedHash = createHash("sha256").update(buffer).digest("hex");

      const saved = await storage.saveBuffer({
        buffer,
        originalFilename: "hello.txt",
        mimeType: "text/plain"
      });

      const fileStats = await stat(join(rootDir, saved.storageKey));

      expect(saved.originalFilename).toBe("hello.txt");
      expect(saved.mimeType).toBe("text/plain");
      expect(saved.byteSize).toBe(buffer.byteLength);
      expect(saved.sha256Hash).toBe(expectedHash);
      expect(saved.storageKey).toMatch(
        /^original\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]{2}\/[a-f0-9]{2}\/[a-f0-9]+\.txt$/
      );
      const pathSegments = saved.storageKey.split("/");
      expect(pathSegments[4]).toBe(saved.sha256Hash.slice(0, 2));
      expect(pathSegments[5]).toBe(saved.sha256Hash.slice(2, 4));
      expect(saved.url).toBe(`http://localhost:3000/${saved.storageKey}`);
      expect(fileStats.size).toBe(buffer.byteLength);
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
