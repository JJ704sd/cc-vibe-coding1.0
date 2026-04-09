import { describe, expect, it } from "vitest";
import { buildServer } from "./buildServer.js";

describe("buildServer", () => {
  it("registers GET /health", async () => {
    const server = buildServer();
    const response = await server.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await server.close();
  });
});
