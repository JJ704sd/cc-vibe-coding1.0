import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("parses positive integer numeric config", () => {
    const config = loadConfig({
      PORT: "4000",
      MAX_UPLOAD_BYTES: "2048",
      PUBLIC_BASE_URL: "http://localhost:4000/uploads"
    });

    expect(config.port).toBe(4000);
    expect(config.maxUploadBytes).toBe(2048);
  });

  it("rejects invalid positive integer config", () => {
    expect(() =>
      loadConfig({
        PORT: "10mb",
        MAX_UPLOAD_BYTES: "-1"
      })
    ).toThrow("PORT must be a positive integer");
  });
});
