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

  // BUG-002:storageKey 可控 → 任意文件读/删防护
  describe("path containment (BUG-002)", () => {
    // 各种尝试绕过 storageKey 白名单的恶意输入
    const maliciousKeys = [
      "../../../etc/passwd",
      "original/../../etc/passwd",
      "original/../../../etc/passwd",
      "/etc/passwd",
      "/etc/hosts",
      "",
      "..\\windows\\system32\\config\\sam",
      "original/2026/01/01/ab/cd/not-a-uuid.txt",
      "original/2026/01/01/ab/cd/0123456789abcdef0123456789abcdef.exe/../../../etc/passwd",
      "original/2026/13/01/ab/cd/0123456789abcdef0123456789abcdef.txt", // month > 12
      "original/2026/01/32/ab/cd/0123456789abcdef0123456789abcdef.txt", // day > 31
      "ORIGINAL/2026/01/01/ab/cd/0123456789abcdef0123456789abcdef.txt", // uppercase prefix
      "original/2026/01/01/ab/cd/0123456789abcdef0123456789abcdef.txt\x00.png", // null byte
    ];

    for (const evilKey of maliciousKeys) {
      it(`rejects malicious storageKey: ${JSON.stringify(evilKey).slice(0, 60)}`, async () => {
        const rootDir = await mkdtemp(join(tmpdir(), "trace-scope-storage-bad-"));
        try {
          const storage = createLocalFileStorage({
            rootDir,
            publicBaseUrl: "http://localhost:3000"
          });
          // getFile / deleteFile 都不能让恶意 key 触发 rootDir 外的 IO
          expect(await storage.getFile(evilKey)).toBeNull();
          expect(await storage.deleteFile(evilKey)).toBe(false);
        } finally {
          await rm(rootDir, { recursive: true, force: true });
        }
      });
    }

    it("allows saveBuffer-then-getFile-then-deleteFile roundtrip", async () => {
      const rootDir = await mkdtemp(join(tmpdir(), "trace-scope-storage-rt-"));
      try {
        const storage = createLocalFileStorage({
          rootDir,
          publicBaseUrl: "http://localhost:3000"
        });
        const buffer = Buffer.from("roundtrip content");

        const saved = await storage.saveBuffer({
          buffer,
          originalFilename: "round.bin",
          mimeType: "application/octet-stream"
        });

        const got = await storage.getFile(saved.storageKey);
        expect(got).not.toBeNull();
        expect(got!.mimeType).toBe("application/octet-stream");

        const chunks: Buffer[] = [];
        for await (const chunk of got!.stream) {
          chunks.push(chunk as Buffer);
        }
        expect(Buffer.concat(chunks).toString()).toBe("roundtrip content");

        // delete 后再 get 应该返回 null
        expect(await storage.deleteFile(saved.storageKey)).toBe(true);
        expect(await storage.getFile(saved.storageKey)).toBeNull();
      } finally {
        await rm(rootDir, { recursive: true, force: true });
      }
    });
  });
});
